import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGeminiClient, generateWithFallback } from '@/lib/gemini';
import { deduceAisleCategory, cleanRecipeText, parseIngredientLine } from '@/lib/playlist-utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';
import { parseQuantity } from '@/lib/recipe-scaling';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, autoSave, frequency = '1_week' } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    // 1. Fetch webpage HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage (status ${response.status})`);
    }

    const html = await response.text();

    // Extract Open Graph image as fallback
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    const ogImage = ogImageMatch ? ogImageMatch[1] : null;

    // 2. Try JSON-LD schema parsing first (standard for all recipe blogs)
    const jsonLdMatches = Array.from(
      html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
    );
    for (const match of jsonLdMatches) {
      try {
        const json = JSON.parse(match[1]);
        const recipeObj = Array.isArray(json)
          ? json.find((item) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')))
          : json['@type'] === 'Recipe' || (Array.isArray(json['@type']) && json['@type'].includes('Recipe'))
          ? json
          : json['@graph']?.find((item: any) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));

        if (recipeObj) {
          const rawIngredients: string[] = Array.isArray(recipeObj.recipeIngredient)
            ? recipeObj.recipeIngredient
            : [];

          const instructions: string[] = Array.isArray(recipeObj.recipeInstructions)
            ? recipeObj.recipeInstructions.map((i: any) => {
                if (typeof i === 'string') return i;
                if (i.text) return i.text;
                if (i.name && !i.text) return i.name;
                if (Array.isArray(i.itemListElement)) {
                  return i.itemListElement.map((sub: any) => sub.text || sub.name || '').filter(Boolean).join('\n');
                }
                return '';
              }).filter(Boolean)
            : typeof recipeObj.recipeInstructions === 'string'
            ? [recipeObj.recipeInstructions]
            : [];

          const ingredients = rawIngredients.map((rawIng) => {
            const parsed = parseIngredientLine(rawIng);
            return {
              name: parsed.name,
              amount: parsed.amount || '',
              unit: parsed.unit || '',
              aisleCategory: parsed.aisleCategory || deduceAisleCategory(parsed.name),
            };
          });

          // Extract image
          let imageUrl = ogImage;
          if (recipeObj.image) {
            if (typeof recipeObj.image === 'string') imageUrl = recipeObj.image;
            else if (Array.isArray(recipeObj.image) && recipeObj.image[0]) {
              imageUrl = typeof recipeObj.image[0] === 'string' ? recipeObj.image[0] : recipeObj.image[0].url || ogImage;
            } else if (recipeObj.image.url) {
              imageUrl = recipeObj.image.url;
            }
          }

          const servingsStr = recipeObj.recipeYield
            ? Array.isArray(recipeObj.recipeYield)
              ? recipeObj.recipeYield[0]
              : String(recipeObj.recipeYield)
            : '4';

          const tags = Array.isArray(recipeObj.keywords)
            ? recipeObj.keywords.join(', ')
            : typeof recipeObj.keywords === 'string'
            ? recipeObj.keywords
            : null;

          return NextResponse.json({
            success: true,
            recipe: {
              title: cleanRecipeText(recipeObj.name || 'Imported Recipe'),
              servings: cleanRecipeText(servingsStr),
              servingsNum: parseQuantity(servingsStr) || 4.0,
              prepTime: recipeObj.prepTime ? cleanRecipeText(String(recipeObj.prepTime).replace(/^PT/, '').toLowerCase()) : '',
              cookTime: recipeObj.cookTime || recipeObj.totalTime ? cleanRecipeText(String(recipeObj.cookTime || recipeObj.totalTime).replace(/^PT/, '').toLowerCase()) : '',
              cuisine: recipeObj.recipeCuisine ? cleanRecipeText(Array.isArray(recipeObj.recipeCuisine) ? recipeObj.recipeCuisine.join(', ') : String(recipeObj.recipeCuisine)) : null,
              mealCategory: recipeObj.recipeCategory ? cleanRecipeText(Array.isArray(recipeObj.recipeCategory) ? recipeObj.recipeCategory[0] : String(recipeObj.recipeCategory)).toLowerCase() : 'dinner',
              tags,
              imageUrl,
              sourceUrl: url,
              ingredients: ingredients.length > 0 ? ingredients : [{ name: 'See recipe link', amount: '', unit: '', aisleCategory: 'pantry' }],
              instructions: instructions.filter(Boolean),
            },
          });
        }
      } catch (e) {
        // Continue to Gemini fallback
      }
    }

    // 3. Fallback: Parse with Gemini
    const spend = await checkUserAiSpend(session.user.id);
    if (!spend.allowed) {
      return NextResponse.json(
        {
          error: spend.error,
          message: spend.message,
          currentSpend: spend.currentSpend,
          spendLimit: spend.spendLimit,
        },
        { status: 429 }
      );
    }

    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json({
        success: true,
        recipe: {
          title: 'Linked Recipe',
          sourceUrl: url,
          ingredients: [],
          instructions: [],
          imageUrl: ogImage,
        },
      });
    }

    const strippedText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 14000);

    const prompt = `Extract the recipe from this webpage text. Return JSON with this exact schema:
    {
      "title": "Recipe Title",
      "servings": "4",
      "prepTime": "15 mins",
      "cookTime": "30 mins",
      "cuisine": "Italian",
      "mealCategory": "dinner",
      "tags": ["Weeknight", "Comfort Food"],
      "ingredients": [
        { "name": "boneless chicken thighs", "amount": "1.5", "unit": "lbs", "aisleCategory": "meat" }
      ],
      "instructions": ["Step 1...", "Step 2..."]
    }
    Valid aisleCategory values: produce, meat, seafood, dairy, pantry, spices, bakery, other.
    
    Webpage text:
    ${strippedText}`;

    const textResponse = await generateWithFallback(genAI, [prompt], {
      responseMimeType: 'application/json',
    });

    await recordAiSpend(session.user.id, 'mise_url_parse', 0.005, prompt.length);

    const parsed = JSON.parse(textResponse);
    const servingsStr = parsed.servings ? String(parsed.servings) : '4';

    return NextResponse.json({
      success: true,
      recipe: {
        title: cleanRecipeText(parsed.title || 'Imported Recipe'),
        servings: cleanRecipeText(servingsStr),
        servingsNum: parseQuantity(servingsStr) || 4.0,
        prepTime: parsed.prepTime || '',
        cookTime: parsed.cookTime || '',
        cuisine: parsed.cuisine || null,
        mealCategory: parsed.mealCategory || 'dinner',
        tags: Array.isArray(parsed.tags) ? parsed.tags.join(', ') : parsed.tags || null,
        sourceUrl: url,
        imageUrl: ogImage,
        ingredients: (parsed.ingredients || []).map((ing: any) => ({
          name: ing.name,
          amount: ing.amount || '',
          unit: ing.unit || '',
          aisleCategory: ing.aisleCategory || deduceAisleCategory(ing.name),
        })),
        instructions: parsed.instructions || [],
      },
    });
  } catch (err) {
    console.error('URL parse error:', err);
    return NextResponse.json(
      { error: 'Failed to parse recipe from URL: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
