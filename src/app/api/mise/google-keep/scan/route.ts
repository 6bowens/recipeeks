import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { googleAccessToken: true, googleId: true, email: true },
    });

    const isConnected = !!(user?.googleAccessToken || (session.user as any).googleAccessToken);

    return NextResponse.json({
      connected: isConnected,
      email: user?.email,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    const accessToken = user?.googleAccessToken || (session.user as any).googleAccessToken;

    if (!accessToken) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Google account not connected. Please connect with Google first.',
        },
        { status: 400 }
      );
    }

    let rawNotes: { id: string; title: string; textContent: string }[] = [];

    // 1. Try Google Keep API
    try {
      const keepRes = await fetch('https://keep.googleapis.com/v1/notes', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (keepRes.ok) {
        const keepData = await keepRes.json();
        if (Array.isArray(keepData.notes)) {
          rawNotes = keepData.notes.map((n: any) => {
            const title = n.title || 'Untitled Note';
            let body = '';
            if (n.body?.text?.text) {
              body = n.body.text.text;
            } else if (Array.isArray(n.body?.list?.listItems)) {
              body = n.body.list.listItems
                .map((item: any) => item.text?.text || '')
                .filter(Boolean)
                .join('\n');
            }
            return {
              id: n.name || String(Math.random()),
              title,
              textContent: `${title}\n${body}`,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Google Keep API query notice:', e);
    }

    // 2. Try Google Drive search for notes and recipes as complementary source
    try {
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=trashed=false and (mimeType='text/plain' or mimeType='application/vnd.google-apps.document' or name contains 'recipe' or name contains 'recipes' or name contains 'notes')&pageSize=30&fields=files(id,name,mimeType)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (driveRes.ok) {
        const driveData = await driveRes.json();
        if (Array.isArray(driveData.files)) {
          for (const file of driveData.files.slice(0, 15)) {
            try {
              let text = '';
              if (file.mimeType === 'application/vnd.google-apps.document') {
                const exportRes = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (exportRes.ok) text = await exportRes.text();
              } else {
                const getRes = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (getRes.ok) text = await getRes.text();
              }

              if (text && text.trim()) {
                rawNotes.push({
                  id: file.id,
                  title: file.name,
                  textContent: `${file.name}\n${text.slice(0, 4000)}`,
                });
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      console.warn('Google Drive search notice:', e);
    }

    if (rawNotes.length === 0) {
      return NextResponse.json({
        connected: true,
        notesCount: 0,
        recipes: [],
        message: 'No Google Keep or Docs notes found. Make sure your account has notes with recipes.',
      });
    }

    // 3. AI Scan & Filter for Recipes
    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json({
        connected: true,
        notesCount: rawNotes.length,
        recipes: [],
        message: 'Gemini API key required for intelligent recipe scanning.',
      });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const combinedNotesSummary = rawNotes
      .map((n, idx) => `--- NOTE #${idx + 1} (Title: ${n.title}) ---\n${n.textContent}`)
      .join('\n\n')
      .slice(0, 30000);

    const prompt = `You are an expert culinary assistant. Analyze the user's Google Keep and Drive notes below.
Identify ALL notes that are recipes (dishes with ingredients or cooking instructions). Ignore shopping lists, meeting notes, non-recipe reminders, and general todo items.

For EACH identified recipe, extract:
1. "title": Clean recipe title (strip bullets, checkboxes, asterisks).
2. "servings": e.g. "2-4" or "4".
3. "cookTime": e.g. "30 mins".
4. "ingredients": Array of objects with "name" (clean ingredient name), "amount" (e.g. "2", "1/4"), "unit" (e.g. "cups", "tbsp"), and "aisleCategory" ("produce", "meat", "dairy", "pantry", "spices", "other").
5. "instructions": Array of step strings.

JSON Schema:
{
  "recipes": [
    {
      "title": "Pancakes",
      "servings": "4",
      "cookTime": "20 mins",
      "ingredients": [
        { "name": "all-purpose flour", "amount": "2", "unit": "cups", "aisleCategory": "pantry" }
      ],
      "instructions": ["Mix ingredients in a bowl", "Cook on skillet"]
    }
  ]
}

Notes to analyze:
${combinedNotesSummary}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    const detectedRecipes = (parsed.recipes || []).map((r: any) => ({
      title: cleanRecipeText(r.title || 'Note Recipe'),
      servings: r.servings || '2-4',
      cookTime: r.cookTime || '30 mins',
      frequency: '1_week',
      sourceType: 'google_notes',
      ingredients: (r.ingredients || []).map((ing: any) => {
        const name = cleanRecipeText(ing.name || '');
        return {
          name,
          amount: ing.amount ? cleanRecipeText(String(ing.amount)) : '',
          unit: ing.unit ? cleanRecipeText(String(ing.unit)) : '',
          aisleCategory: ing.aisleCategory || deduceAisleCategory(name),
        };
      }),
      instructions: (r.instructions || []).map((step: any) =>
        cleanRecipeText(typeof step === 'string' ? step : '')
      ),
    }));

    return NextResponse.json({
      connected: true,
      notesCount: rawNotes.length,
      recipesFoundCount: detectedRecipes.length,
      recipes: detectedRecipes,
    });
  } catch (err) {
    console.error('Google Keep scan error:', err);
    return NextResponse.json(
      { error: 'Failed to scan Google Notes: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
