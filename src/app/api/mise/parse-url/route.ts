import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGeminiClient, generateWithFallback } from '@/lib/gemini';
import { deduceAisleCategory, cleanRecipeText } from '@/lib/playlist-utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();
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
            ? recipeObj.recipeInstructions.map((i: any) => (typeof i === 'string' ? i : i.text || i.name || ''))
            : typeof recipeObj.recipeInstructions === 'string'
            ? [recipeObj.recipeInstructions]
            : [];

          const ingredients = rawIngredients.map((ing) => ({
            name: ing.replace(/^[0-9\/\.\s\-]+(cups?|tbsp|tsp|oz|lbs?|cloves?|grams?|pinch|cans?|stalks?|bunches?)?\s+/i, '').trim(),
            amount: (ing.match(/^[0-9\/\.\s\-]+(cups?|tbsp|tsp|oz|lbs?|cloves?|grams?|pinch|cans?|stalks?|bunches?)?/i) || [''])[0].trim() || '',
            unit: '',
            aisleCategory: deduceAisleCategory(ing),
          }));

          return NextResponse.json({
            success: true,
            recipe: {
              title: recipeObj.name || 'Imported Recipe',
              servings: recipeObj.recipeYield ? String(recipeObj.recipeYield) : '2-4',
              prepTime: recipeObj.prepTime || '',
              cookTime: recipeObj.cookTime || recipeObj.totalTime || '',
              sourceUrl: url,
              ingredients: ingredients.length > 0 ? ingredients : [{ name: 'See recipe URL', amount: '', unit: '', aisleCategory: 'pantry' }],
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
        },
      });
    }

    // Truncate HTML to save tokens
    const strippedText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 12000);

    const prompt = `Extract the recipe from this webpage text. Return JSON with this schema:
    {
      "title": "Recipe Title",
      "servings": "4",
      "prepTime": "15 mins",
      "cookTime": "30 mins",
      "ingredients": [
        { "name": "boneless chicken thighs", "amount": "1.5", "unit": "lbs", "aisleCategory": "meat" }
      ],
      "instructions": ["Step 1...", "Step 2..."]
    }
    Valid aisleCategory values: produce, meat, dairy, pantry, spices, other.
    
    Webpage text:
    ${strippedText}`;

    const textResponse = await generateWithFallback(genAI, [prompt], {
      responseMimeType: 'application/json',
    });

    await recordAiSpend(session.user.id, 'mise_url_parse', 0.005, prompt.length);

    const parsed = JSON.parse(textResponse);

    return NextResponse.json({
      success: true,
      recipe: {
        title: parsed.title || 'Imported Recipe',
        servings: parsed.servings || '2-4',
        prepTime: parsed.prepTime || '',
        cookTime: parsed.cookTime || '',
        sourceUrl: url,
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
