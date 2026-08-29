import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { deduceAisleCategory, cleanRecipeText } from '@/lib/playlist-utils';

export const dynamic = 'force-dynamic';

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteText, defaultFrequency = '1_week' } = await req.json();

    if (!noteText || typeof noteText !== 'string' || !noteText.trim()) {
      return NextResponse.json({ error: 'Please paste note text to scan.' }, { status: 400 });
    }

    const genAI = getGeminiClient();
    if (!genAI) {
      // Basic fallback single recipe parser
      const lines = noteText.split('\n').map((l) => cleanRecipeText(l)).filter(Boolean);
      const title = lines[0] || 'Imported Note Recipe';
      const ingredients = lines.slice(1).map((line) => ({
        name: line,
        amount: '',
        unit: '',
        aisleCategory: deduceAisleCategory(line),
      }));

      return NextResponse.json({
        success: true,
        recipes: [
          {
            title,
            frequency: defaultFrequency,
            servings: '2-4',
            cookTime: '30 mins',
            sourceType: 'google_notes',
            ingredients,
            instructions: [],
          },
        ],
      });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are a culinary AI assistant. The user copied notes from Google Keep / Google Notes, Apple Notes, or email containing one or multiple recipes with ingredients and instructions.
Parse the text into an array of clean recipe objects.
CRITICAL RULES:
1. Strip all bullet characters, checklist boxes ([ ], [x], ☑, ☐), unicode bullets (•, ▪, ▫, -, *), numbering, and OCR artifacts from the title, ingredient names, amounts, and instructions.
2. Clean and separate the ingredient quantity/amount (e.g. "2", "1.5") and unit (e.g. "cups", "tbsp", "lbs") from the ingredient name (e.g. "all-purpose flour", "boneless chicken thighs").
3. Assign each ingredient a valid aisleCategory from: "produce", "meat", "dairy", "pantry", "spices", "other".
4. If multiple recipes exist in the text, extract each one as a separate object in the recipes array.

JSON Schema:
{
  "recipes": [
    {
      "title": "Clean Recipe Title",
      "servings": "2-4",
      "cookTime": "30 mins",
      "ingredients": [
        { "name": "all-purpose flour", "amount": "2", "unit": "cups", "aisleCategory": "pantry" }
      ],
      "instructions": ["Step 1 description", "Step 2 description"]
    }
  ]
}

Note Text:
${noteText.slice(0, 15000)}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    const cleanedRecipes = (parsed.recipes || []).map((r: any) => ({
      title: cleanRecipeText(r.title || 'Note Recipe'),
      servings: r.servings || '2-4',
      prepTime: r.prepTime || '',
      cookTime: r.cookTime || '',
      frequency: defaultFrequency,
      sourceType: 'google_notes',
      ingredients: (r.ingredients || []).map((ing: any) => {
        const cName = cleanRecipeText(ing.name || '');
        return {
          name: cName,
          amount: ing.amount ? cleanRecipeText(String(ing.amount)) : '',
          unit: ing.unit ? cleanRecipeText(String(ing.unit)) : '',
          aisleCategory: ing.aisleCategory || deduceAisleCategory(cName),
        };
      }),
      instructions: (r.instructions || []).map((inst: any) => cleanRecipeText(typeof inst === 'string' ? inst : '')),
    }));

    return NextResponse.json({
      success: true,
      recipes: cleanedRecipes,
      extractedCount: cleanedRecipes.length,
    });
  } catch (err) {
    console.error('Parse notes error:', err);
    return NextResponse.json(
      { error: 'Failed to scan notes: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
