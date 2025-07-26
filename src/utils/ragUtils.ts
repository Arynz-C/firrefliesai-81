// RAG utilities for search and calculator tools
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Function to search DuckDuckGo and get URLs
export async function searchDuckDuckGo(query: string): Promise<string[]> {
  try {
    console.log('🔍 Starting search for:', query);
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const fullUrl = proxyUrl + encodeURIComponent(searchUrl);
    
    console.log('🌐 Fetching from URL:', fullUrl);
    const response = await fetch(fullUrl);
    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📄 Data received:', !!data.contents);
    const html = data.contents;
    
    // Parse HTML using DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const results: string[] = [];
    const resultElements = doc.querySelectorAll('div.result');
    
    resultElements.forEach((element) => {
      const linkElement = element.querySelector('a.result__a');
      if (linkElement) {
        const href = linkElement.getAttribute('href');
        if (href) {
          try {
            const url = new URL(href, 'https://duckduckgo.com');
            const realUrl = url.searchParams.get('uddg');
            if (realUrl) {
              results.push(decodeURIComponent(realUrl));
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }
      }
    });
    
    console.log('🔗 Found URLs:', results);
    return results.slice(0, 3); // Return top 3 results
  } catch (error) {
    console.error('❌ Error searching DuckDuckGo:', error);
    return [];
  }
}

// Function to get webpage content with better extraction
export async function getWebpageContent(url: string): Promise<string | null> {
  try {
    console.log(`🌐 Fetching content from: ${url}`);
    
    // Try multiple proxy services for better reliability
    const proxyServices = [
      'https://api.allorigins.win/get?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    let html = '';
    let success = false;
    
    for (const proxyUrl of proxyServices) {
      try {
        const fullUrl = proxyUrl + encodeURIComponent(url);
        console.log(`🔄 Trying proxy: ${proxyUrl}`);
        
        const response = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (response.ok) {
          if (proxyUrl.includes('allorigins')) {
            const data = await response.json();
            html = data.contents;
          } else {
            html = await response.text();
          }
          
          if (html && html.length > 100) {
            success = true;
            console.log(`✅ Successfully fetched ${html.length} characters`);
            break;
          }
        }
      } catch (proxyError) {
        console.log(`❌ Proxy failed: ${proxyUrl}`, proxyError.message);
        continue;
      }
    }
    
    if (!success || !html) {
      console.log('❌ All proxies failed, returning null');
      return null;
    }
    
    // Parse HTML and extract text content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove unwanted elements
    const unwantedElements = doc.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .advertisement, .ads, .cookie-notice, .social-share');
    unwantedElements.forEach(element => element.remove());
    
    // Try multiple content extraction strategies
    let content = '';
    
    // Strategy 1: Look for article content
    const articleSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content',
      '#content',
      '.page-content'
    ];
    
    for (const selector of articleSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        content = element.textContent || '';
        if (content.length > 200) {
          console.log(`📄 Found content using selector: ${selector}`);
          break;
        }
      }
    }
    
    // Strategy 2: Look for paragraphs if no main content found
    if (!content || content.length < 200) {
      const paragraphs = doc.querySelectorAll('p');
      const paragraphTexts = Array.from(paragraphs)
        .map(p => p.textContent?.trim())
        .filter(text => text && text.length > 50);
      
      if (paragraphTexts.length > 0) {
        content = paragraphTexts.join('\n\n');
        console.log(`📄 Extracted content from ${paragraphTexts.length} paragraphs`);
      }
    }
    
    // Strategy 3: Fallback to body content
    if (!content || content.length < 100) {
      content = doc.body?.textContent || '';
      console.log('📄 Using body content as fallback');
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')  // Replace multiple newlines with single newline
      .replace(/[^\w\s\n.,;:!?()-]/g, ' ')  // Remove special characters but keep punctuation
      .trim();
    
    // Extract meaningful sentences (filter out navigation, copyright, etc.)
    const sentences = content.split(/[.!?]+/).filter(sentence => {
      const cleanSentence = sentence.trim().toLowerCase();
      return cleanSentence.length > 20 && 
             !cleanSentence.includes('cookie') &&
             !cleanSentence.includes('copyright') &&
             !cleanSentence.includes('privacy policy') &&
             !cleanSentence.includes('terms of service') &&
             !cleanSentence.includes('all rights reserved');
    });
    
    const finalContent = sentences.slice(0, 15).join('. ').substring(0, 4000);
    console.log(`📊 Final content length: ${finalContent.length} characters`);
    
    return finalContent || null;
  } catch (error) {
    console.error(`❌ Failed to get content from ${url}:`, error);
    return null;
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