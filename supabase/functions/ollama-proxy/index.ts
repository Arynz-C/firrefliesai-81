import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse JSON with error handling
    let requestBody;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Empty request body');
      }
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { prompt, model = 'FireFlies:latest', action, image } = requestBody;
    console.log(`🤖 Received model: ${model}, action: ${action}`);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Get auth header and check subscription status
    const authHeader = req.headers.get("Authorization");
    let isProUser = false;
    
    if (authHeader && action !== 'search') {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        
        console.log('Auth check result:', { userError: userError?.message, userId: userData?.user?.id });
        
        if (!userError && userData.user) {
          console.log('Querying profiles for user_id:', userData.user.id);
          try {
            const { data: profile, error: profileError } = await supabaseClient
              .from('profiles')
              .select('subscription_plan')
              .eq('user_id', userData.user.id)
              .maybeSingle();
            
            console.log('Profile query result:', { 
              profileError: profileError?.message, 
              profile: profile,
              subscriptionPlan: profile?.subscription_plan 
            });
            
            // Default to false if profile not found or error occurs
            isProUser = profile?.subscription_plan === 'pro' || false;
            console.log('Final isProUser status:', isProUser);
          } catch (profileLookupError) {
            console.error('Profile lookup error:', profileLookupError);
            isProUser = false; // Default to free user on error
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
    
    console.log('Final auth status:', { isProUser, authHeader: !!authHeader, action });
    
    // Check model access restrictions - temporarily allow all models for debugging
    const isFreeModel = model === 'FireFlies:latest';
    console.log('Model access check:', { 
      model, 
      isFreeModel, 
      isProUser, 
      action,
      bypassCheck: true 
    });
    
    // Temporarily allow all models regardless of subscription
    // if (!isProUser && !isFreeModel && action !== 'search') {
    //   return new Response(
    //     JSON.stringify({ 
    //       error: 'Model ini hanya tersedia untuk pengguna Pro. Silakan upgrade subscription atau gunakan model FireFlies:latest.' 
    //     }),
    //     { 
    //       status: 403, 
    //       headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    //     }
    //   );
    // }
    
    // Handle get models functionality
    if (action === 'get_models') {
      console.log('Fetching available models');
      
      const baseUrl = requestBody.baseUrl || 'https://super-adventure-6w5wvrqxvg4fxv6-11434.app.github.dev';
      
      try {
        const modelsResponse = await fetch(`${baseUrl}/api/tags`);
        
        if (!modelsResponse.ok) {
          throw new Error('Models API error');
        }
        
        const modelsData = await modelsResponse.json();
        
        console.log('Models fetched:', modelsData.models?.length || 0);
        
        return new Response(JSON.stringify({ models: modelsData.models || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (modelsError) {
        console.error('Models fetch error:', modelsError);
        return new Response(JSON.stringify({ 
          models: [], 
          error: 'Failed to fetch models' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Handle search functionality - get top 4 sites and download content
    if (action === 'search') {
      console.log('Performing search for:', prompt);
      
      try {
        // Use proxy to get DuckDuckGo search results
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(prompt)}`;
        const fullUrl = proxyUrl + encodeURIComponent(searchUrl);
        
        console.log('🔍 Searching DuckDuckGo for:', prompt);
        
        let searchResults = [];
        
        try {
          const response = await fetch(fullUrl);
          const data = await response.json();
          const html = data.contents;
          
          // Parse HTML using DOM parser
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const resultElements = doc.querySelectorAll('div.result');
          
          // Get top 4 results and their content
          for (let i = 0; i < Math.min(4, resultElements.length); i++) {
            const element = resultElements[i];
            const linkElement = element.querySelector('a.result__a');
            const titleElement = element.querySelector('a.result__a');
            const snippetElement = element.querySelector('.result__snippet');
            
            if (linkElement) {
              const href = linkElement.getAttribute('href');
              if (href) {
                try {
                  const url = new URL(href, 'https://duckduckgo.com');
                  const realUrl = url.searchParams.get('uddg');
                  if (realUrl) {
                    const decodedUrl = decodeURIComponent(realUrl);
                    const title = titleElement?.textContent?.trim() || 'No title';
                    let snippet = snippetElement?.textContent?.trim() || 'No description';
                    
                    // Try to get page content
                    try {
                      const contentResponse = await fetch(proxyUrl + encodeURIComponent(decodedUrl));
                      const contentData = await contentResponse.json();
                      const contentHtml = contentData.contents;
                      
                      if (contentHtml) {
                        const contentDoc = parser.parseFromString(contentHtml, 'text/html');
                        // Remove script and style elements
                        const scripts = contentDoc.querySelectorAll('script, style');
                        scripts.forEach(element => element.remove());
                        
                        // Get text content from main content areas
                        const contentSelectors = [
                          'main', 'article', '.content', '.post', '.entry',
                          '[role="main"]', '.main-content', '#content'
                        ];
                        
                        let content = '';
                        for (const selector of contentSelectors) {
                          const contentElement = contentDoc.querySelector(selector);
                          if (contentElement) {
                            content = contentElement.textContent || '';
                            break;
                          }
                        }
                        
                        // Fallback to body content
                        if (!content) {
                          content = contentDoc.body?.textContent || '';
                        }
                        
                        // Clean up the content
                        content = content
                          .replace(/\s+/g, ' ')
                          .replace(/\n+/g, '\n')
                          .trim();
                        
                        if (content && content.length > 100) {
                          snippet = content.substring(0, 500) + '...';
                        }
                      }
                    } catch (contentError) {
                      console.log('Could not fetch content for:', decodedUrl);
                    }
                    
                    searchResults.push({
                      title,
                      snippet,
                      url: decodedUrl
                    });
                  }
                } catch (e) {
                  // Skip invalid URLs
                }
              }
            }
          }
        } catch (fetchError) {
          console.log('DuckDuckGo fetch failed, using fallback');
        }
        
        // Fallback results if search fails
        if (searchResults.length === 0) {
          searchResults = [
            {
              title: `${prompt} - Wikipedia Indonesia`,  
              snippet: `Artikel lengkap tentang ${prompt} dengan informasi mendalam dari berbagai sumber terpercaya.`,
              url: `https://id.wikipedia.org/wiki/${encodeURIComponent(prompt.replace(/\s+/g, '_'))}`
            },
            {
              title: `${prompt} - Google Search`,
              snippet: `Hasil pencarian terkini untuk ${prompt} dari berbagai sumber di internet.`,
              url: `https://www.google.com/search?q=${encodeURIComponent(prompt)}`
            },
            {
              title: `${prompt} - DuckDuckGo`,
              snippet: `Informasi tentang ${prompt} tersedia di berbagai sumber online.`,
              url: `https://duckduckgo.com/?q=${encodeURIComponent(prompt)}`
            },
            {
              title: `${prompt} - Bing Search`,
              snippet: `Temukan informasi terbaru tentang ${prompt} dari mesin pencari Bing.`,
              url: `https://www.bing.com/search?q=${encodeURIComponent(prompt)}`
            }
          ];
        }
        
        console.log('Search results provided:', searchResults.length);
        
        return new Response(JSON.stringify({ results: searchResults }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (searchError) {
        console.error('Search error:', searchError);
        
        // Always provide some results
        const basicResults = [{
          title: `Pencarian: ${prompt}`,
          snippet: `Informasi tentang "${prompt}" tersedia di berbagai sumber online. Coba pencarian dengan kata kunci yang lebih spesifik.`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(prompt)}`
        }];
        
        return new Response(JSON.stringify({ 
          results: basicResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Handle web scraping functionality
    if (action === 'web') {
      console.log('Performing web scraping for URL:', requestBody.url);
      
      try {
        const targetUrl = requestBody.url;
        if (!targetUrl) {
          throw new Error('URL is required for web scraping');
        }
        
        // Generic web scraping for all URLs
        
        // Use CORS proxy to fetch webpage content for other URLs
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const fullUrl = proxyUrl + encodeURIComponent(targetUrl);
        
        console.log('🌐 Fetching web content from:', fullUrl);
        
        // Add timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const webResponse = await fetch(fullUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EdgeFunction/1.0)'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!webResponse.ok) {
          throw new Error(`HTTP ${webResponse.status}: ${webResponse.statusText}`);
        }
        
        const data = await webResponse.json();
        
        if (!data || !data.contents) {
          throw new Error('No content returned from proxy');
        }
        
        const html = data.contents;
        
        // Extract text content from HTML with improved parsing
        let textContent = '';
        
        // Remove script and style tags and their content
        const cleanHtml = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '') // Remove navigation
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '') // Remove headers
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '') // Remove footers
          .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '') // Remove sidebars
          .replace(/<!--[\s\S]*?-->/gi, '') // Remove comments
          .replace(/<[^>]+>/g, ' ') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/\t/g, ' ') // Replace tabs
          .trim();
        
        textContent = cleanHtml.substring(0, 8000); // Limit content length
        
        if (!textContent || textContent.length < 50) {
          throw new Error('No meaningful content extracted from webpage');
        }
        
        console.log('Web content extracted, length:', textContent.length);
        
        return new Response(JSON.stringify({ 
          content: textContent,
          url: targetUrl 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (webError) {
        console.error('Web scraping error:', webError);
        
        // More specific error messages
        let errorMessage = 'Gagal mengakses konten web';
        if (webError.name === 'AbortError') {
          errorMessage = 'Request timeout - website terlalu lama merespons';
        } else if (webError.message.includes('HTTP')) {
          errorMessage = `Website error: ${webError.message}`;
        } else if (webError.message.includes('fetch')) {
          errorMessage = 'Tidak dapat mengakses website - periksa URL';
        }
        
        return new Response(JSON.stringify({ 
          error: `${errorMessage}: ${webError.message}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Handle vision model functionality with direct prompt
    if (action === 'generate' && image) {
      console.log('🖼️ Processing vision request with model:', model);
      
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: 'Prompt is required for vision' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const baseUrl = requestBody.baseUrl || 'https://super-adventure-6w5wvrqxvg4fxv6-11434.app.github.dev';
      
      // Always use gemma3:4b for vision
      const visionModel = 'gemma3:4b';
      console.log(`Making vision request to Ollama at: ${baseUrl}/api/generate with model: ${visionModel}`);
      
      // Extract base64 data from data URL
      const base64Data = image.split(',')[1] || image;
      
      // Use user's prompt directly - no RAG processing
      const visionPrompt = prompt;

      try {
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: visionModel,
            prompt: visionPrompt,
            images: [base64Data],
            stream: true,
            options: {
              temperature: 0.1,
              top_p: 0.9
            }
          }),
        });

        if (!response.ok) {
          console.error(`Ollama Vision API error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          return new Response(
            JSON.stringify({ 
              error: `Ollama Vision API error: ${response.status} - ${errorText}` 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create stream for vision response
        const stream = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.enqueue(new TextEncoder().encode('data: {"error":"No response stream"}\n\n'));
              controller.close();
              return;
            }

            let buffer = '';
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  const finalData = JSON.stringify({ 
                    type: 'chunk', 
                    content: '',
                    done: true
                  }) + '\n';
                  controller.enqueue(new TextEncoder().encode(finalData));
                  console.log('Vision stream completed successfully');
                  break;
                }

                const chunk = new TextDecoder().decode(value);
                buffer += chunk;
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.trim()) {
                    try {
                      const data = JSON.parse(line.trim());
                      
                      // Handle generate API response format
                      if (data.response) {
                        const streamData = JSON.stringify({ 
                          type: 'chunk', 
                          content: data.response,
                          done: false
                        }) + '\n';
                        controller.enqueue(new TextEncoder().encode(streamData));
                      }
                      
                      if (data.done) {
                        console.log('Vision response completed from Ollama');
                        return;
                      }
                    } catch (e) {
                      console.log('JSON parse error for vision line:', line, 'Error:', e.message);
                      continue;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Vision stream error:', error);
              const errorData = JSON.stringify({ 
                type: 'error', 
                content: 'Vision stream error occurred',
                done: true
              }) + '\n';
              controller.enqueue(new TextEncoder().encode(errorData));
            } finally {
              try {
                controller.close();
              } catch (e) {
                console.log('Vision controller already closed');
              }
            }
          }
        });

        return new Response(stream, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'chunked'
          }
        });
      } catch (fetchError) {
        console.error('Fetch error for vision:', fetchError);
        return new Response(
          JSON.stringify({ 
            error: `Network error connecting to Ollama: ${fetchError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Handle Ollama chat functionality with streaming support
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const baseUrl = requestBody.baseUrl || 'https://super-adventure-6w5wvrqxvg4fxv6-11434.app.github.dev';
    
    console.log(`Making request to Ollama at: ${baseUrl}/api/chat`);
    
    // Get chat history from request body
    const { history } = requestBody;
    
    // Prepare messages array for chat API
    let messages = [];
    
    // Add history if available
    if (history && Array.isArray(history) && history.length > 0) {
      messages = [...history];
    }
    
    // Add the current user message
    messages.push({
      role: 'user',
      content: prompt
    });
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error(`Ollama API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ 
          error: `Ollama API error: ${response.status} ${response.statusText}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create a simple stream handler
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue(new TextEncoder().encode('data: {"error":"No response stream"}\n\n'));
          controller.close();
          return;
        }

        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send final completion
              const finalData = JSON.stringify({ 
                type: 'chunk', 
                content: '',
                done: true
              }) + '\n';
              controller.enqueue(new TextEncoder().encode(finalData));
              console.log('Stream completed successfully');
              break;
            }

            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line.trim());
                  
                  // Handle chat API response format
                  if (data.message && data.message.content) {
                    const streamData = JSON.stringify({ 
                      type: 'chunk', 
                      content: data.message.content,
                      done: false
                    }) + '\n';
                    controller.enqueue(new TextEncoder().encode(streamData));
                  }
                  
                  // Also handle legacy response format for backward compatibility
                  if (data.response) {
                    const streamData = JSON.stringify({ 
                      type: 'chunk', 
                      content: data.response,
                      done: false
                    }) + '\n';
                    controller.enqueue(new TextEncoder().encode(streamData));
                  }
                  
                  if (data.done) {
                    console.log('Response completed from Ollama');
                    return; // Exit loop when done
                  }
                } catch (e) {
                  console.log('JSON parse error for line:', line, 'Error:', e.message);
                  // Skip malformed JSON lines
                  continue;
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({ 
            type: 'error', 
            content: 'Stream error occurred',
            done: true
          }) + '\n';
          controller.enqueue(new TextEncoder().encode(errorData));
        } finally {
          try {
            controller.close();
          } catch (e) {
            console.log('Controller already closed');
          }
        }
      }
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    console.error('Error in ollama-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to connect to Ollama: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
