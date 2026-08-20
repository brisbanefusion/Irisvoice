// Live Web Access — DuckDuckGo Search + Web Fetch
// No API key required — uses DuckDuckGo's instant answer API and HTML scraping

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string;
  latencyMs: number;
}

/**
 * Search the web using DuckDuckGo (no API key needed).
 * Tries the instant answer API first, then falls back to HTML scraping.
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const startTime = Date.now();

  // Try DuckDuckGo Instant Answer API
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
      {
        headers: {
          'User-Agent': 'IrisVoiceLab/1.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const results: SearchResult[] = [];

      // Abstract (direct answer)
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || '',
        });
      }

      // Related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 80),
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
          // Sub-topics
          if (topic.Topics && Array.isArray(topic.Topics)) {
            for (const sub of topic.Topics.slice(0, 2)) {
              if (sub.Text && sub.FirstURL) {
                results.push({
                  title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 80),
                  snippet: sub.Text,
                  url: sub.FirstURL,
                });
              }
            }
          }
        }
      }

      // Answer box
      let answer: string | undefined;
      if (data.Answer) {
        answer = data.Answer;
      } else if (data.AnswerType === 'disambiguation' && results.length > 0) {
        answer = results[0].snippet;
      }

      return {
        query,
        results: results.slice(0, 6),
        answer,
        latencyMs: Date.now() - startTime,
      };
    }
  } catch (e) {
    // Fall through to HTML scraping
  }

  // Fallback: scrape DuckDuckGo HTML
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IrisVoiceLab/1.0',
      },
    });

    const html = await res.text();
    const results: SearchResult[] = [];

    // Extract search results from HTML
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 6) {
      const url = match[1].replace(/.*uddg=/, '').replace(/&.*/, '').replace(/%3A/g, ':').replace(/%2F/g, '/');
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const snippet = match[3].replace(/<[^>]*>/g, '').trim();
      if (title && snippet) {
        results.push({ title, snippet, url });
      }
    }

    // Simpler regex fallback
    if (results.length === 0) {
      const simpleRegex = /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      const titles: string[] = [];
      const snippets: string[] = [];
      let m;
      while ((m = simpleRegex.exec(html)) !== null) titles.push(m[1].replace(/<[^>]*>/g, '').trim());
      while ((m = snippetRegex.exec(html)) !== null) snippets.push(m[1].replace(/<[^>]*>/g, '').trim());
      for (let i = 0; i < Math.min(titles.length, 6); i++) {
        if (titles[i]) {
          results.push({
            title: titles[i],
            snippet: snippets[i] || '',
            url: '',
          });
        }
      }
    }

    return {
      query,
      results,
      latencyMs: Date.now() - startTime,
    };
  } catch (e) {
    return {
      query,
      results: [],
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch and extract readable text from a URL.
 */
export async function fetchWebPage(url: string, maxLength = 3000): Promise<{ text: string; title: string; latencyMs: number }> {
  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IrisVoiceLab/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Strip tags and extract text
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);

    return { text, title, latencyMs: Date.now() - startTime };
  } catch (e: any) {
    return {
      text: '',
      title: '',
      latencyMs: Date.now() - startTime,
    };
  }
}
