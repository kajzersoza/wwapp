import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

/**
 * Extracts Google Sheet ID from URL
 */
function extractSheetId(url: string): { sheetId: string; isPublished: boolean } | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Published web sheet /d/e/2PACX-...
  const pubMatch = trimmed.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    return { sheetId: pubMatch[1], isPublished: true };
  }

  // Direct ID check
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return { sheetId: trimmed, isPublished: false };
  }

  // Standard Google Sheet URL
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1] !== 'e') {
    return { sheetId: match[1], isPublished: false };
  }

  return null;
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Server-side Google Sheets proxy endpoint
 * Bypasses browser CORS restrictions completely
 */
app.get('/api/sheets-proxy', async (req: Request, res: Response) => {
  try {
    const { sheetId, sheetName, url: rawUrl } = req.query;

    let targetUrls: string[] = [];

    if (rawUrl && typeof rawUrl === 'string') {
      targetUrls.push(rawUrl);
    } else if (sheetId && typeof sheetId === 'string') {
      const name = (sheetName as string) || 'Products';
      const encodedName = encodeURIComponent(name);

      if (sheetId.startsWith('2PACX-') || sheetId.startsWith('e/')) {
        const cleanId = sheetId.replace(/^e\//, '');
        targetUrls.push(
          `https://docs.google.com/spreadsheets/d/e/${cleanId}/pub?output=csv&sheet=${encodedName}`,
          `https://docs.google.com/spreadsheets/d/e/${cleanId}/pub?output=csv`
        );
      } else {
        targetUrls.push(
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodedName}`,
          `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodedName}`,
          `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
        );
      }
    } else {
      return res.status(400).json({ error: 'Hiányzó sheetId vagy url paraméter' });
    }

    let lastError: Error | null = null;
    let fetchedText: string | null = null;

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/csv,text/plain,*/*',
          },
        });

        if (response.ok) {
          const text = await response.text();
          // Verify it's not a Google sign-in HTML page
          if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html') && text.length > 5) {
            fetchedText = text;
            break;
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (fetchedText !== null) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.send(fetchedText);
    }

    return res.status(404).json({
      error: 'Nem sikerült letölteni a munkalapot a Google Táblázatból. Kérjük ellenőrizze, hogy a táblázat meg van-e osztva (Bárki, aki rendelkezik a linkkel)!',
      details: lastError?.message,
    });
  } catch (err: unknown) {
    console.error('API sheets-proxy hiba:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Batch Google Sheets sync endpoint
 * Fetches all sheets in parallel on server with maximum performance
 */
app.post('/api/sync-all-sheets', async (req: Request, res: Response) => {
  try {
    const { sheetUrl, sheetId: directSheetId } = req.body;
    let sheetId = directSheetId;
    let isPublished = false;

    if (!sheetId && sheetUrl) {
      const parsed = extractSheetId(sheetUrl);
      if (parsed) {
        sheetId = parsed.sheetId;
        isPublished = parsed.isPublished;
      }
    }

    if (!sheetId) {
      sheetId = '11AeIQrodsaICM3_P6VRQm7bShU5dMfjw';
    }

    const sheetsToFetch: Record<string, string[]> = {
      products: ['Products', 'Productions', 'Termékek', 'Termekek'],
      positions: ['Positions', 'Pozíciók', 'Poziciok'],
      inventory: ['Inventory Transactions', 'Inventory', 'Készletmozgás', 'Keszletmozgas'],
      inspections: ['Inspections', 'Karbantartás', 'Karbantartas'],
      kanban: ['kanban', 'Kanban'],
      konsar: ['KonSar', 'Konsar', 'Konnektor-Saru'],
      termmerod: ['TermMerod', 'Termmerod', 'Termék-Mérődoboz'],
      beepulo: ['Beépülő Alkatrész', 'Beepulo Alkatresz', 'Beépülő'],
      fejsaru: ['FejSaru', 'Fejsaru', 'Saruzófej-Saru'],
      saruspecs: ['Segédtáblázat 1. Saruk másolata', 'Segédtáblázat 1.', 'Saru Segédtáblázat'],
      orders: ['Rendelés', 'Rendeles', 'Orders'],
      notes: ['Note', 'Notes', 'Jegyzetek', 'Termék Jegyzetek'],
    };

    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    await Promise.all(
      Object.entries(sheetsToFetch).map(async ([key, candidates]) => {
        for (const sheetName of candidates) {
          try {
            let fetchUrl = '';
            if (isPublished) {
              fetchUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${encodeURIComponent(sheetName)}`;
            } else {
              fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(sheetName)}`;
            }

            const response = await fetch(fetchUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/csv,text/plain,*/*',
              },
            });

            if (response.ok) {
              const text = await response.text();
              if (text && !text.includes('<!DOCTYPE html>') && text.length > 5) {
                results[key] = text;
                return;
              }
            }
          } catch (e) {
            errors[key] = e instanceof Error ? e.message : String(e);
          }
        }
      })
    );

    res.json({
      success: true,
      sheetId,
      loadedCount: Object.keys(results).length,
      sheets: results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error('API sync-all-sheets hiba:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`World Wires Server fut a 3000-es porton: http://0.0.0.0:${PORT}`);
  });
}

startServer();
