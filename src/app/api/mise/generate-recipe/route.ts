import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGeminiClient, generateWithFallback } from '@/lib/gemini';
import { deduceAisleCategory, cleanRecipeText, parseIngredientLine } from '@/lib/playlist-utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { prompt, servings = '4', cookTime, style } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Please enter a recipe idea, ingredients, or dish description.' },
        { status: 400 }
      );
    }

    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json(
        { error: 'Gemini AI API key is not configured.' },
        { status: 500 }
      );
    }

    const aiPrompt = `You are an elite Michelin-trained executive chef and culinary developer.
Create a complete, flavorful, practical, and delicious home-cooked dinner recipe based on this description/prompt:
"${prompt.trim()}"
${style ? `Style / Preference: ${style}` : ''}
${cookTime ? `Target Cook Time: ${cookTime}` : ''}
Target Servings: ${servings}

CRITICAL RULES:
1. Create a clear, catchy recipe title.
2. Provide realistic cook time (e.g. "30 mins", "45 mins") and prep time (e.g. "15 mins").
3. Provide realistic, properly portioned ingredients.
4. Each ingredient MUST have:
   - "name": Clean ingredient name (e.g. "boneless skinless chicken thighs", "broccoli florets", "olive oil"). Do NOT include amounts or bullets in the name.
   - "amount": Numerical quantity or fraction (e.g. "1.5", "2", "1/2", "3").
   - "unit": Valid culinary unit (e.g. "lbs", "cups", "tbsp", "tsp", "cloves", "medium", "cans") or empty if countable (e.g. "eggs").
   - "aisleCategory": Exactly one of "produce", "meat", "dairy", "pantry", "spices", "other".
5. Provide concise, numbered step-by-step instructions.
6. Provide a short "notes" string with chef pro-tips or flavor enhancements.

JSON Schema:
{
  "title": "Crispy Sheet-Pan Chicken Thighs & Roasted Vegetables",
  "servings": "4",
  "prepTime": "15 mins",
  "cookTime": "35 mins",
  "notes": "Pat chicken skin dry with paper towels before seasoning for maximum crispiness.",
  "ingredients": [
    { "name": "bone-in skin-on chicken thighs", "amount": "2", "unit": "lbs", "aisleCategory": "meat" },
    { "name": "broccoli florets", "amount": "3", "unit": "cups", "aisleCategory": "produce" },
    { "name": "baby carrots", "amount": "2", "unit": "cups", "aisleCategory": "produce" },
    { "name": "olive oil", "amount": "3", "unit": "tbsp", "aisleCategory": "pantry" },
    { "name": "garlic powder", "amount": "1", "unit": "tsp", "aisleCategory": "spices" },
    { "name": "smoked paprika", "amount": "1", "unit": "tsp", "aisleCategory": "spices" },
    { "name": "salt", "amount": "1", "unit": "tsp", "aisleCategory": "spices" },
    { "name": "black pepper", "amount": "1/2", "unit": "tsp", "aisleCategory": "spices" }
  ],
  "instructions": [
    "Preheat oven to 425°F (220°C) and line a large baking sheet with parchment paper.",
    "Toss broccoli florets and carrots with 1.5 tbsp olive oil, salt, and pepper; spread evenly on the baking sheet.",
    "Pat chicken thighs dry, rub with remaining olive oil, garlic powder, smoked paprika, salt, and pepper.",
    "Nestle chicken thighs skin-side up between the vegetables.",
    "Roast for 30-35 minutes until chicken skin is golden crisp and internal temperature reaches 165°F (74°C).",
    "Garnish with fresh lemon juice or herbs before serving hot."
  ]
}`;

    const textResponse = await generateWithFallback(genAI, [aiPrompt], {
      responseMimeType: 'application/json',
    });

    await recordAiSpend(session.user.id, 'mise_recipe_gen', 0.005, aiPrompt.length);

    const parsed = JSON.parse(textResponse);

    const recipe = {
      title: cleanRecipeText(parsed.title || prompt),
      servings: cleanRecipeText(parsed.servings || servings),
      prepTime: parsed.prepTime ? cleanRecipeText(parsed.prepTime) : undefined,
      cookTime: cleanRecipeText(parsed.cookTime || '30 mins'),
      notes: parsed.notes ? cleanRecipeText(parsed.notes) : undefined,
      sourceType: 'ai_prompt',
      ingredients: (parsed.ingredients || []).map((ing: any) => {
        const rawName = typeof ing === 'string' ? ing : ing.name || '';
        let cleanedName = cleanRecipeText(rawName);
        let amount = ing.amount ? cleanRecipeText(String(ing.amount)) : '';
        let unit = ing.unit ? cleanRecipeText(String(ing.unit)) : '';
        let aisleCategory = ing.aisleCategory || deduceAisleCategory(cleanedName);

        if (!amount && typeof ing === 'string') {
          const p = parseIngredientLine(ing);
          if (p.amount) {
            amount = p.amount;
            unit = p.unit || '';
            cleanedName = p.name;
          }
        }

        return {
          name: cleanedName,
          amount,
          unit,
          aisleCategory,
        };
      }),
      instructions: (parsed.instructions || []).map((s: string) => cleanRecipeText(s)),
    };

    return NextResponse.json({
      success: true,
      recipe,
    });
  } catch (err) {
    console.error('AI Recipe generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
