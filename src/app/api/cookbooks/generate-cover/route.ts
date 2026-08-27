import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';

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

    const { title, author, color = '#7f1d1d' } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
    }

    const prompt = `
You are a world-class graphic designer specializing in gorgeous, award-winning cookbook covers.
Design a complete, high-resolution SVG cookbook cover for:
Title: "${title}"
Author: "${author || 'Culinary Collection'}"
Base Tone: "${color}"

Design Guidelines:
- Return ONLY a valid, self-contained SVG document (<svg viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">...</svg>).
- Dimensions: exactly 600 width by 800 height (3:4 cookbook portrait ratio).
- Incorporate rich gradients, textures, subtle border frames, elegant serif typography (<text> tags with font-family="Playfair Display, Georgia, serif"), decorative culinary dividers, and artistic SVG food/kitchen motifs or minimalist silhouettes suitable for "${title}".
- Ensure high contrast and readability for the title and author.
- Do NOT output any markdown code blocks, backticks, or explanation. Output ONLY the raw <svg>...</svg> XML string.
`;

    const modelCandidates = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-pro'];
    let svgContent = '';

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt]);
        const text = result.response.text().trim();
        const cleaned = text.replace(/^```xml/i, '').replace(/^```svg/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        if (cleaned.includes('<svg') && cleaned.includes('</svg>')) {
          const start = cleaned.indexOf('<svg');
          const end = cleaned.lastIndexOf('</svg>') + 6;
          svgContent = cleaned.slice(start, end);
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} cover generation attempt failed:`, err);
      }
    }

    if (!svgContent) {
      // Fallback elegant SVG template
      svgContent = `
<svg viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}" />
      <stop offset="100%" stop-color="#120707" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </radialGradient>
  </defs>
  <rect width="600" height="800" fill="url(#bg)" />
  <rect width="600" height="800" fill="url(#glow)" />
  <rect x="25" y="25" width="550" height="750" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" rx="10" />
  <rect x="35" y="35" width="530" height="730" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" rx="8" />
  
  <text x="300" y="140" text-anchor="middle" fill="#fecdd3" font-family="Georgia, serif" font-size="14" letter-spacing="6" text-transform="uppercase">AUTHENTIC RECIPES &amp; TASTES</text>
  <line x1="180" y1="170" x2="420" y2="170" stroke="#fecdd3" stroke-width="1" opacity="0.6" />
  
  <text x="300" y="340" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-size="34" font-weight="bold" letter-spacing="1">
    ${title.slice(0, 30)}
  </text>
  ${
    title.length > 30
      ? `<text x="300" y="390" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-size="28" font-weight="bold">${title.slice(30, 65)}</text>`
      : ''
  }
  
  <circle cx="300" cy="500" r="45" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
  <text x="300" y="508" text-anchor="middle" fill="#fecdd3" font-family="Georgia, serif" font-size="24">📖</text>
  
  <line x1="200" y1="620" x2="400" y2="620" stroke="#fecdd3" stroke-width="1" opacity="0.6" />
  <text x="300" y="660" text-anchor="middle" fill="#ffe4e6" font-family="Georgia, serif" font-size="18" font-style="italic">
    By ${author || 'Master Chef'}
  </text>
</svg>
`.trim();
    }

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;

    await recordAiSpend(session.user.id, 'cover_gen', 0.015, title.length);

    return NextResponse.json({
      success: true,
      coverUrl: dataUri,
    });
  } catch (error) {
    console.error('Generate cover error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
