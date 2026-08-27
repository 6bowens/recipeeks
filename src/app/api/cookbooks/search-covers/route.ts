import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface CoverCandidate {
  url: string;
  title: string;
  publisher?: string;
  source: string;
}

/**
 * Fetch real high-res images from web search (Amazon, retail, food blogs, reviews)
 */
async function searchWebImages(query: string): Promise<CoverCandidate[]> {
  try {
    const q = encodeURIComponent(`${query} cookbook cover`);
    const vqdRes = await fetch(`https://duckduckgo.com/?q=${q}&iax=images&ia=images`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!vqdRes.ok) return [];
    const html = await vqdRes.text();
    const vqdMatch = html.match(/vqd=["']?([0-9-_]+)["']?/i);
    if (!vqdMatch) return [];

    const vqd = vqdMatch[1];
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${q}&vqd=${vqd}&f=,,,type:photo,&p=1`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://duckduckgo.com/',
        },
      }
    );

    if (!imgRes.ok) return [];
    const data = await imgRes.json();

    const results: CoverCandidate[] = [];
    for (const r of data.results || []) {
      if (r.image && typeof r.image === 'string' && r.image.startsWith('http')) {
        results.push({
          url: r.image,
          title: r.title || query,
          source: 'Web Images',
        });
      }
    }
    return results.slice(0, 10);
  } catch (error) {
    console.warn('Web image search failed:', error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || '';
    const author = searchParams.get('author') || '';
    const query = searchParams.get('q') || '';

    const effectiveQuery = query || `${title} ${author || ''}`.trim();
    const searchTitle = title.replace(/[:\-–—].*$/, '').replace(/[^\w\s]/g, '').trim();
    const primaryAuthor = author ? author.split(/[,&]/)[0].replace(/by\s+/i, '').trim() : '';

    const seenUrls = new Set<string>();
    const results: CoverCandidate[] = [];

    // 1. Web Image Search (Real high-res web images from Amazon, publisher, culinary blogs)
    const webImages = await searchWebImages(effectiveQuery);
    for (const img of webImages) {
      if (!seenUrls.has(img.url)) {
        seenUrls.add(img.url);
        results.push(img);
      }
    }

    // 2. Google Books API Search
    const gbooksQueries = [
      query ? encodeURIComponent(query.trim()) : null,
      primaryAuthor ? `intitle:${encodeURIComponent(searchTitle)}+inauthor:${encodeURIComponent(primaryAuthor)}` : null,
      primaryAuthor ? encodeURIComponent(`${searchTitle} ${primaryAuthor}`) : null,
      `intitle:${encodeURIComponent(searchTitle)}`,
      encodeURIComponent(`${title} ${author || ''}`.trim()),
    ].filter(Boolean) as string[];

    for (const q of gbooksQueries) {
      try {
        const gbooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=8`;
        const res = await fetch(gbooksUrl);
        if (res.ok) {
          const data = await res.json();
          for (const item of data.items || []) {
            const imageLinks = item?.volumeInfo?.imageLinks;
            const itemTitle = item?.volumeInfo?.title || title;
            const publisher = item?.volumeInfo?.publisher;

            if (imageLinks) {
              const url =
                imageLinks.extraLarge ||
                imageLinks.large ||
                imageLinks.medium ||
                imageLinks.small ||
                imageLinks.thumbnail;

              if (url) {
                const cleanUrl = url
                  .replace(/^http:\/\//i, 'https://')
                  .replace('&edge=curl', '')
                  .replace(/zoom=\d/, 'zoom=1');

                if (!seenUrls.has(cleanUrl)) {
                  seenUrls.add(cleanUrl);
                  results.push({
                    url: cleanUrl,
                    title: itemTitle,
                    publisher,
                    source: 'Google Books',
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        // continue
      }
    }

    // 3. Open Library (Filtered for exact or closely matching title)
    try {
      const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(searchTitle || title)}&limit=6`;
      const olRes = await fetch(olUrl);
      if (olRes.ok) {
        const olData = await olRes.json();
        for (const doc of olData.docs || []) {
          if (doc.cover_i) {
            const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            if (!seenUrls.has(url)) {
              seenUrls.add(url);
              results.push({
                url,
                title: doc.title || title,
                publisher: doc.publisher?.[0],
                source: 'Open Library',
              });
            }
          }
        }
      }
    } catch (e) {
      // continue
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      covers: results,
    });
  } catch (error) {
    console.error('Search covers error:', error);
    return NextResponse.json(
      { error: 'Failed to search covers: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
