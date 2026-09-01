import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGeminiClient } from '@/lib/gemini';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';
import { db } from '@/lib/db';
import { cleanRecipeText } from '@/lib/playlist-utils';
import { normalizeIngredientName } from '@/lib/utils';
import { parseQuantity } from '@/lib/recipe-scaling';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { imageBase64, imageType = 'image/jpeg', frequency = '1_week' } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const spend = await checkUserAiSpend(userId);
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

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json(
        { error: 'Gemini AI is not configured.' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a world-class culinary transcription assistant.
Examine this photo of a recipe card, cookbook page, magazine clipping, or handwritten recipe.
Accurately transcribe and extract the recipe structure into this JSON schema:

{
  "title": "Recipe Title",
  "servings": "4",
  "prepTime": "15 mins",
  "cookTime": "30 mins",
  "mealCategory": "dinner",
  "cuisine": "Italian",
  "tags": ["Weeknight", "Comfort Food"],
  "notes": "Chef tips or notes extracted from the card",
  "ingredients": [
    {
      "name": "boneless skinless chicken thighs",
      "amount": "1.5",
      "unit": "lbs",
      "aisleCategory": "meat",
      "optional": false
    }
  ],
  "instructions": [
    "Step 1 text...",
    "Step 2 text..."
  ]
}

Ensure all quantities are clean numbers or fractions. If instructions are dense, split them logically into sequential numbered steps.`;

    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: imageType,
        },
      },
    ]);

    await recordAiSpend(userId, 'mise_photo_ocr', 0.005, prompt.length);

    const text = response.response.text();
    const data = JSON.parse(text);

    if (!data.title) {
      return NextResponse.json({ error: 'Could not extract a recipe from the image' }, { status: 422 });
    }

    const cleanedTitle = cleanRecipeText(data.title);
    const numericServings = parseQuantity(data.servings) || 4.0;
    const tagsStr = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || null;

    const formattedInstructions = Array.isArray(data.instructions)
      ? JSON.stringify(data.instructions.map((s: string) => cleanRecipeText(s)))
      : typeof data.instructions === 'string'
      ? cleanRecipeText(data.instructions)
      : null;

    const created = await db.customRecipe.create({
      data: {
        title: cleanedTitle,
        sourceType: 'photo_ocr',
        frequency,
        servings: data.servings ? cleanRecipeText(String(data.servings)) : '4',
        servingsNum: numericServings,
        prepTime: data.prepTime ? cleanRecipeText(String(data.prepTime)) : null,
        cookTime: data.cookTime ? cleanRecipeText(String(data.cookTime)) : null,
        tags: tagsStr ? cleanRecipeText(tagsStr) : null,
        cuisine: data.cuisine ? cleanRecipeText(data.cuisine) : null,
        mealCategory: data.mealCategory ? cleanRecipeText(data.mealCategory) : 'dinner',
        rating: 5.0,
        instructions: formattedInstructions,
        notes: data.notes ? cleanRecipeText(data.notes) : null,
        userId,
        ingredients: {
          create: (data.ingredients || [])
            .map((ing: any) => {
              const rawName = typeof ing === 'string' ? ing : ing.name || '';
              const cleanedName = cleanRecipeText(rawName);
              if (!cleanedName) return null;

              return {
                name: cleanedName,
                normalizedName: normalizeIngredientName(cleanedName),
                amount: ing.amount ? cleanRecipeText(String(ing.amount)) : null,
                unit: ing.unit ? cleanRecipeText(String(ing.unit)) : null,
                aisleCategory: ing.aisleCategory || 'pantry',
                optional: !!ing.optional,
              };
            })
            .filter(Boolean),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json({
      success: true,
      recipe: created,
    });
  } catch (err) {
    console.error('Scan recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to transcribe recipe photo: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
