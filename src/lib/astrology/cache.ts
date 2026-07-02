import type { StructuredContent } from './types';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
// v6 : textes par facette en langage inclusif, SANS jargon astrologique. Le
// suffixe invalide les contenus encore en cache pour forcer une régénération.
const PREFIX = 'astro_compat_v6_';

interface CacheEntry {
  score: number;
  content: StructuredContent;
  ts: number;
}

function makeKey(
  p1Name: string, p1Date: string,
  p2Name: string, p2Date: string,
  lang = 'fr',
): string {
  // Symmetric: A+B === B+A
  const pairs = [[p1Name, p1Date], [p2Name, p2Date]].sort((a, b) => a[0].localeCompare(b[0]));
  return PREFIX + btoa(`${pairs[0].join('|')}||${pairs[1].join('|')}`).replace(/=/g, '') + (lang === 'en' ? '_en' : '');
}

function tryStorage(): Storage | null {
  try { localStorage.setItem('__test', '1'); localStorage.removeItem('__test'); return localStorage; }
  catch { return null; }
}

export const compatibilityCache = {
  get(
    p1Name: string, p1Date: string,
    p2Name: string, p2Date: string,
    lang = 'fr',
  ): { score: number; content: StructuredContent } | null {
    const store = tryStorage();
    if (!store) return null;
    try {
      const key = makeKey(p1Name, p1Date, p2Name, p2Date, lang);
      const raw = store.getItem(key);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.ts > TTL_MS) {
        store.removeItem(key);
        return null;
      }
      return { score: entry.score, content: entry.content };
    } catch { return null; }
  },

  set(
    p1Name: string, p1Date: string,
    p2Name: string, p2Date: string,
    lang: string,
    score: number,
    content: StructuredContent,
  ): void {
    const store = tryStorage();
    if (!store) return;
    try {
      const entry: CacheEntry = { score, content, ts: Date.now() };
      store.setItem(makeKey(p1Name, p1Date, p2Name, p2Date, lang), JSON.stringify(entry));
    } catch { /* quota exceeded — ignore */ }
  },
};
