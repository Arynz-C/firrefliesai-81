// RAG utilities for search and calculator tools
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Optimized search function with better error handling
export async function searchDuckDuckGo(query: string): Promise<string[]> {
  try {
    console.log('🔍 Starting optimized search for:', query);
    
    // Use faster proxy service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
    
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.contents) {
      console.warn('No content received from search');
      return [];
    }
    
    // Optimized HTML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');
    
    const results: string[] = [];
    const resultElements = doc.querySelectorAll('div.result, .result, [class*="result"]');
    
    for (const element of resultElements) {
      const linkElement = element.querySelector('a[href]');
      if (linkElement) {
        const href = linkElement.getAttribute('href');
        if (href && href.includes('uddg=')) {
          try {
            const url = new URL(href, 'https://duckduckgo.com');
            const realUrl = url.searchParams.get('uddg');
            if (realUrl && isValidUrl(realUrl)) {
              results.push(decodeURIComponent(realUrl));
              if (results.length >= 3) break; // Stop at 3 results
            }
          } catch (e) {
            continue;
          }
        }
      }
    }
    
    console.log(`🔗 Found ${results.length} URLs:`, results);
    return results;
  } catch (error) {
    console.error('❌ Search error:', error);
    return [];
  }
}

// Helper function to validate URLs
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Optimized parallel content fetching
export async function getWebpageContent(url: string): Promise<string | null> {
  try {
    console.log(`🌐 Fetching optimized content from: ${url}`);
    
    // Timeout controller for faster failures
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Use only the fastest, most reliable proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.contents || data.contents.length < 100) {
        console.warn('Insufficient content received');
        return null;
      }
      
      console.log(`✅ Fetched ${data.contents.length} characters`);
      return await extractOptimizedContent(data.contents);
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ Content fetch failed for ${url}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to get content from ${url}:`, error);
    return null;
  }
}

// Optimized content extraction
async function extractOptimizedContent(html: string): Promise<string | null> {
  try {
    // Parse HTML efficiently
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove unwanted elements in batch
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.sidebar', '.menu', '.advertisement', '.ads', '.cookie-notice',
      '.social-share', '.comments', '.related-posts', '.newsletter'
    ];
    
    unwantedSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    let content = '';
    
    // Priority content selectors (most specific first)
    const contentSelectors = [
      'article[role="main"]',
      'main article',
      '[role="main"]',
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main .content',
      'main',
      '#content',
      '.page-content'
    ];
    
    // Find best content container
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const textContent = element.textContent || '';
        if (textContent.length > 200) {
          content = textContent;
          console.log(`📄 Content found with: ${selector}`);
          break;
        }
      }
    }
    
    // Fallback: collect paragraph content
    if (!content || content.length < 200) {
      const paragraphs = Array.from(doc.querySelectorAll('p'))
        .map(p => p.textContent?.trim())
        .filter(text => text && text.length > 30)
        .slice(0, 10); // Limit to first 10 paragraphs
      
      content = paragraphs.join('\n\n');
      console.log(`📄 Extracted ${paragraphs.length} paragraphs`);
    }
    
    if (!content || content.length < 50) {
      return null;
    }
    
    // Optimized content cleaning
    content = content
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n\s*\n/g, '\n')  // Normalize newlines
      .trim();
    
    // Filter out noise - optimized regex
    const noisePatterns = [
      /\b(cookie|privacy|terms|subscribe|newsletter|advertisement)\b/gi,
      /\b(copyright|all rights reserved|©)\b/gi,
      /\b(click here|read more|continue reading)\b/gi
    ];
    
    const sentences = content.split(/[.!?]+/)
      .filter(sentence => {
        const clean = sentence.trim();
        return clean.length > 15 && 
               !noisePatterns.some(pattern => pattern.test(clean));
      })
      .slice(0, 12); // Limit sentences
    
    const finalContent = sentences.join('. ').substring(0, 3000);
    console.log(`📊 Optimized content: ${finalContent.length} chars`);
    
    return finalContent || null;
  } catch (error) {
    console.error('❌ Content extraction error:', error);
    return null;
  }
}

// Parallel search and content fetching
export async function searchAndFetchContent(query: string): Promise<{url: string, content: string}[]> {
  try {
    console.log('🚀 Starting parallel search and fetch for:', query);
    
    // Step 1: Search for URLs
    const urls = await searchDuckDuckGo(query);
    if (urls.length === 0) {
      return [];
    }
    
    // Step 2: Fetch content from all URLs in parallel
    const contentPromises = urls.map(async (url) => {
      const content = await getWebpageContent(url);
      return content ? { url, content } : null;
    });
    
    const results = await Promise.allSettled(contentPromises);
    
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<{url: string, content: string}> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    console.log(`✅ Successfully fetched content from ${successfulResults.length}/${urls.length} URLs`);
    return successfulResults;
    
  } catch (error) {
    console.error('❌ Parallel search error:', error);
    return [];
  }
}

// Calculator utility
export const calculator = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  multiply: (a: number, b: number) => a * b,
  divide: (a: number, b: number) => b !== 0 ? a / b : 'Error: Cannot divide by zero',
  
  evaluate: (expression: string) => {
    try {
      // Clean the expression to only allow safe math operations
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      if (!sanitized) return 'Error: Invalid expression';
      
      // Use Function constructor for safe evaluation
      const result = Function(`"use strict"; return (${sanitized})`)();
      
      if (typeof result === 'number' && !isNaN(result)) {
        return result;
      } else {
        return 'Error: Invalid calculation result';
      }
    } catch {
      return 'Error: Invalid expression';
    }
  }
};

// This function is now deprecated - use the Edge Function instead
export async function getOllamaResponse(prompt: string, ollamaUrl?: string): Promise<string> {
  return 'This function is deprecated. Use the Edge Function instead.';
}