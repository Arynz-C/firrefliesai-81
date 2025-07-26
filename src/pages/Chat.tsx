import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, LogOut, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { searchDuckDuckGo, getWebpageContent, calculator } from "@/utils/ragUtils";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useSelectedModel } from "@/contexts/ModelContext";
import { supabase } from "@/integrations/supabase/client";
import firefliesLogo from "@/assets/fireflies-logo.png";
import { useChatHistory, type ChatMessage as HistoryMessage } from "@/hooks/useChatHistory";

export const Chat = () => {
  const { toast } = useToast();
  const { profile, signOut, checkSubscription } = useAuth();
  const { selectedModel } = useSelectedModel();
  const {
    chatSessions,
    currentChatId,
    loading,
    setCurrentChatId,
    createNewChatSession,
    saveMessage,
    updateChatTitle,
    deleteChatSession,
    getCurrentChatMessages,
    getChatHistoryForAI,
    updateMessageContent,
    addMessageToLocal,
    generateUniqueId
  } = useChatHistory();
  
  console.log('🔄 Current selected model from hook:', selectedModel);
  
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasStartedChatting, setHasStartedChatting] = useState(false);

  // Prevent streaming from pausing when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Override the default behavior that pauses requests when tab is hidden
      if (document.hidden) {
        console.log('Tab hidden - keeping streams active');
      } else {
        console.log('Tab visible - streams continue normally');
      }
    };

    // Prevent automatic throttling of background tabs
    const preventThrottling = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const renderLoop = () => {
        if (ctx) {
          ctx.clearRect(0, 0, 1, 1);
        }
        requestAnimationFrame(renderLoop);
      };
      renderLoop();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    preventThrottling();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Get current messages from chat history
  const messages = getCurrentChatMessages();

  // RAG function for search - downloads content from top 3 DuckDuckGo results
  const handleSearchRAG = async (query: string): Promise<string> => {
    try {
      console.log('🔍 Searching DuckDuckGo for:', query);
      
      // Search DuckDuckGo and get URLs
      const searchUrls = await searchDuckDuckGo(query);
      
      if (searchUrls.length === 0) {
        console.log('❌ No search results found');
        return '❌ Maaf, saya tidak menemukan hasil yang relevan di internet.';
      }

      console.log(`📋 Found ${searchUrls.length} URLs, downloading content...`);
      
      let combinedContent = '';
      let successfulSources: string[] = [];

      // Download content from top 3 websites
      const topUrls = searchUrls.slice(0, 3);
      
      for (let i = 0; i < topUrls.length; i++) {
        const url = topUrls[i];
        console.log(`📥 Downloading content from: ${url}`);
        
        const content = await getWebpageContent(url);
        
        if (content && content.length > 50) {
          combinedContent += `\n--- WEBSITE ${i + 1}: ${url} ---\n${content}\n\n`;
          successfulSources.push(url);
          console.log(`✅ Successfully downloaded content from: ${url} (${content.length} chars)`);
        } else {
          console.log(`❌ Failed to download content from: ${url}`);
        }
      }

      if (combinedContent === '') {
        return '❌ Maaf, tidak dapat mengunduh konten dari website yang ditemukan.';
      }

      // Modified prompt for direct response without content filtering
      const ragPrompt = `Berdasarkan konten lengkap dari website yang telah diunduh berikut, berikan jawaban informatif dan lengkap tentang topik teknis/teknologi yang ditanyakan. Anda adalah asisten AI yang membantu dengan pertanyaan teknis, programming, cybersecurity, dan teknologi. Nmap, penetration testing, dan tools keamanan adalah topik yang valid dan legal untuk dipelajari. Jawab dalam Bahasa Indonesia dengan informasi yang akurat dan mendidik.\n\n${combinedContent}\n--- PERTANYAAN PENGGUNA ---\n${query}\n\nBerikan jawaban yang informatif dan lengkap berdasarkan konten website yang telah diunduh:`;

      console.log('🤖 Using model for RAG:', selectedModel);
      console.log(`📊 Combined content length: ${combinedContent.length} characters`);
      
      let answer = '';
      try {
        const response = await fetch('https://cdxybmnpkkdkspgxvnfp.supabase.co/functions/v1/ollama-proxy', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: ragPrompt, model: selectedModel })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'chunk' && data.content) {
                  answer += data.content;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
        
        if (!answer) {
          answer = 'Maaf, tidak ada respons dari AI.';
        }
      } catch (error) {
        console.error('Error calling Ollama for RAG:', error);
        answer = 'Maaf, terjadi kesalahan saat menghubungi AI.';
      }
      
      const finalResponse = `${answer}\n\n📖 **Sumber:**\n${successfulSources.join('\n')}`;
      
      return finalResponse;
    } catch (error) {
      console.error('Error in search RAG:', error);
      return 'Maaf, terjadi kesalahan saat mencari informasi.';
    }
  };

  // Function to handle web scraping with user question
  const handleWebRAG = async (query: string, url: string): Promise<string> => {
    try {
      // Use edge function for web scraping
      const { data: webData, error: webError } = await supabase.functions.invoke('ollama-proxy', {
        body: { prompt: query, url: url, action: 'web' }
      });

      if (webError || !webData?.content) {
        console.log('❌ Failed to extract web content');
        return '❌ Maaf, saya tidak dapat mengakses atau memproses konten dari URL tersebut.';
      }

      const webContent = webData.content;
      
      // Create RAG prompt for web content analysis
      const ragPrompt = `Berdasarkan konten website berikut, jawab pertanyaan pengguna secara langsung dan detail. Jawab dalam Bahasa Indonesia.\n\n--- KONTEN WEBSITE ---\n${webContent}\n\n--- PERTANYAAN PENGGUNA ---\n${query}\n\nJawab berdasarkan konten website:`;

      console.log('🤖 Using model for Web RAG:', selectedModel);
      
      let answer = '';
      try {
        const response = await fetch('https://cdxybmnpkkdkspgxvnfp.supabase.co/functions/v1/ollama-proxy', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: ragPrompt, model: selectedModel })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'chunk' && data.content) {
                  answer += data.content;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
        
        if (!answer) {
          answer = 'Maaf, tidak ada respons dari AI.';
        }
      } catch (error) {
        console.error('Error calling Ollama for Web RAG:', error);
        answer = 'Maaf, terjadi kesalahan saat menghubungi AI.';
      }
      
      const finalResponse = `${answer}\n\n🌐 **Sumber:** ${url}`;
      
      return finalResponse;
    } catch (error) {
      console.error('Error in web RAG:', error);
      return 'Maaf, terjadi kesalahan saat memproses konten web.';
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      console.log('🛑 Stopping generation...');
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setIsTyping(false);
      
      toast({
        title: "Generation Stopped",
        description: "Response generation has been stopped.",
      });
    }
  };

  const handleSendMessage = async (content: string, image?: File) => {
    console.log('🤖 Using model:', selectedModel);
    
    // Check if user has subscription or is on free plan
    if (!profile) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the chat.",
        variant: "destructive",
      });
      return;
    }

    // Handle image uploads - automatically switch to vision model
    let finalContent = content;
    let targetModel = selectedModel;
    let base64Image = null;
    
    if (image) {
      targetModel = "gemma3:4b"; // Keep using Gemma for vision
      console.log('🖼️ Image detected, switching to vision model:', targetModel);
      
      // Convert image to base64
      base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(image);
      });
      
      finalContent = content || "Describe this image in detail in Indonesian language.";
      console.log('🖼️ Image converted to base64, length:', base64Image.length);
    }

    // Ensure we have a current chat session
    let activeChatId = currentChatId;
    if (!activeChatId) {
      const title = finalContent.length > 50 ? finalContent.substring(0, 50) + "..." : finalContent;
      activeChatId = await createNewChatSession(title);
      if (!activeChatId) return;
    }

    const userMessage: HistoryMessage = {
      id: generateUniqueId(),
      content: finalContent,
      role: 'user',
      timestamp: new Date()
    };

    // Add message to local state immediately for UI responsiveness
    addMessageToLocal(activeChatId, userMessage);
    
    // Save user message to database
    await saveMessage(activeChatId, finalContent, 'user');
    
    // Update chat title if this is the first message
    if (!hasStartedChatting) {
      const title = finalContent.length > 50 ? finalContent.substring(0, 50) + "..." : finalContent;
      await updateChatTitle(activeChatId, title);
      setHasStartedChatting(true);
      setSidebarOpen(false);
    }

    setIsTyping(true);

    try {
      let finalResponse = '';
      
      // Check for RAG commands
      if (finalContent.toLowerCase().startsWith('/clear')) {
        // Send clear command to Ollama
        try {
          console.log('🤖 Using model for clear:', targetModel);
          const { data: ollamaData, error } = await supabase.functions.invoke('ollama-proxy', {
            body: { prompt: '/clear', model: targetModel }
          });
          
          finalResponse = error ? '❌ Failed to clear context. Please try again.' : '🧹 **Memory Cleared!** Context has been reset.';
        } catch (error) {
          finalResponse = '❌ Failed to clear context. Please try again.';
        }
        
        // Create AI message with final response
        const aiMessage: HistoryMessage = {
          id: generateUniqueId(),
          content: finalResponse,
          role: 'assistant',
          timestamp: new Date()
        };
        addMessageToLocal(activeChatId, aiMessage);
        await saveMessage(activeChatId, finalResponse, 'assistant');
        setIsTyping(false);
        return;
      } 
      
      else if (finalContent.toLowerCase().startsWith('/cari ')) {
        const query = finalContent.substring(6).trim();
        if (query) {
          finalResponse = await handleSearchRAG(query);
        } else {
          finalResponse = 'Mohon masukkan kata kunci pencarian setelah /cari';
        }
        
        // Create AI message with final response
        const aiMessage: HistoryMessage = {
          id: generateUniqueId(),
          content: finalResponse,
          role: 'assistant',
          timestamp: new Date()
        };
        addMessageToLocal(activeChatId, aiMessage);
        await saveMessage(activeChatId, finalResponse, 'assistant');
        setIsTyping(false);
        return;
      }
      
      else if (finalContent.toLowerCase().startsWith('/web ')) {
        const content = finalContent.substring(5).trim();
        // Parse the web command: /web question url
        const urlRegex = /(https?:\/\/[^\s]+)/i;
        const urlMatch = content.match(urlRegex);
        
        if (urlMatch) {
          const url = urlMatch[0];
          const question = content.replace(url, '').trim();
          
          if (question) {
            finalResponse = await handleWebRAG(question, url);
          } else {
            finalResponse = 'Mohon masukkan pertanyaan sebelum URL. Contoh: /web ambil fungsi yang ada di web https://example.com';
          }
        } else {
          finalResponse = 'Mohon masukkan URL yang valid. Contoh: /web ambil fungsi yang ada di web https://example.com';
        }
        
        // Create AI message with final response
        const aiMessage: HistoryMessage = {
          id: generateUniqueId(),
          content: finalResponse,
          role: 'assistant',
          timestamp: new Date()
        };
        addMessageToLocal(activeChatId, aiMessage);
        await saveMessage(activeChatId, finalResponse, 'assistant');
        setIsTyping(false);
        return;
      }
      
      else if (finalContent.toLowerCase().startsWith('/kalkulator ')) {
        const expression = finalContent.substring(12).trim();
        if (expression) {
          const result = calculator.evaluate(expression);
          finalResponse = `🔢 **Hasil Perhitungan:**\n\n${expression} = **${result}**`;
          
          if (typeof result === 'number') {
            // Send to AI for explanation if it's a valid calculation
            const ragPrompt = `Pengguna melakukan perhitungan: ${expression} = ${result}. Berikan penjelasan singkat tentang perhitungan ini dalam Bahasa Indonesia, termasuk langkah-langkah jika perlu.`;
            console.log('🤖 Using model for calculator:', targetModel);
            const { data: ollamaData, error } = await supabase.functions.invoke('ollama-proxy', {
              body: { prompt: ragPrompt, model: targetModel }
            });
            const explanation = error ? 'Maaf, tidak dapat memberikan penjelasan saat ini.' : ollamaData?.response;
            finalResponse += `\n\n📝 **Penjelasan:**\n${explanation}`;
          }
        } else {
          finalResponse = 'Mohon masukkan ekspresi matematika setelah /kalkulator (contoh: /kalkulator 2 + 2 * 5)';
        }
        
        // Create AI message with final response
        const aiMessage: HistoryMessage = {
          id: generateUniqueId(),
          content: finalResponse,
          role: 'assistant',
          timestamp: new Date()
        };
        addMessageToLocal(activeChatId, aiMessage);
        await saveMessage(activeChatId, finalResponse, 'assistant');
        setIsTyping(false);
        return;
      }

      // Regular chat - Call Ollama via Edge Function
      try {
        setIsGenerating(true);
        
        // Create abort controller for stopping generation
        const controller = new AbortController();
        setAbortController(controller);
        
        // Create initial AI message
        const aiMessageId = generateUniqueId();
        const aiMessage: HistoryMessage = {
          id: aiMessageId,
          content: '',
          role: 'assistant',
          timestamp: new Date()
        };
        
        addMessageToLocal(activeChatId, aiMessage);
        setIsTyping(false);

        // For vision models, use direct prompt mode; for text models, use chat mode
        const useDirectPrompt = base64Image !== null;
        
        let response: Response;
        
        if (useDirectPrompt) {
          console.log('🤖 Using direct prompt mode for vision model:', targetModel);
          // Direct prompt mode for vision
          response = await fetch(`https://cdxybmnpkkdkspgxvnfp.supabase.co/functions/v1/ollama-proxy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ 
              prompt: finalContent, 
              model: targetModel,
              image: base64Image,
              action: 'generate' // Use generate mode for direct prompts
            }),
            signal: controller.signal
          });
        } else {
          // Get chat history for AI context
          const chatHistory = getChatHistoryForAI(activeChatId);

          // Chat mode for text models
          console.log('🤖 Using chat mode for text model:', targetModel);
          response = await fetch(`https://cdxybmnpkkdkspgxvnfp.supabase.co/functions/v1/ollama-proxy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ 
              prompt: finalContent, 
              model: targetModel,
              history: chatHistory,  // Include chat history for context
              action: 'chat'
            }),
            signal: controller.signal
          });
        }

        if (!response.ok) {
          throw new Error(`Edge Function returned a non-2xx status code: ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body available');
        }

        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
          while (true) {
            // Check if generation was aborted
            if (controller.signal.aborted) {
              break;
            }
            
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'chunk' && data.content) {
                  fullResponse += data.content;

                  // Update message with accumulated response for real-time streaming
                  updateMessageContent(aiMessageId, fullResponse);

                  // Small delay for animation effect
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              } catch (parseError) {
                console.log('Skipping invalid JSON line:', line);
              }
            }
          }
        } catch (streamError) {
          console.error('Streaming error:', streamError);
          throw new Error('Streaming failed');
        }

        // Save the complete AI response to database
        if (fullResponse) {
          await saveMessage(activeChatId, fullResponse, 'assistant');
        }

        // No credit deduction needed - subscription based
      } catch (fetchError) {
        console.error('Edge Function error:', fetchError);
        throw new Error(`Cannot connect to AI: ${fetchError.message}`);
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      const activeChatIdForError = currentChatId || await createNewChatSession("Error");
      if (activeChatIdForError) {
        const errorMessage: HistoryMessage = {
          id: generateUniqueId(),
          content: `❌ Maaf, API LLM sedang mengalami error.

💡 **Alternative:** Use /cari [query] for web search instead!`,
          role: 'assistant',
          timestamp: new Date()
        };
        addMessageToLocal(activeChatIdForError, errorMessage);
        await saveMessage(activeChatIdForError, errorMessage.content, 'assistant');
      }
      setIsTyping(false);
    }
  };

  const handleNewChat = async () => {
    const newChatId = await createNewChatSession("New Chat");
    if (newChatId) {
      setHasStartedChatting(false);
      setSidebarOpen(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    const selectedChat = chatSessions.find(chat => chat.id === chatId);
    setHasStartedChatting(selectedChat ? selectedChat.messages.length > 0 : false);
    setSidebarOpen(false);
  };

  const handleEditChat = async (chatId: string, newTitle: string) => {
    await updateChatTitle(chatId, newTitle);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChatSession(chatId);
    // If we deleted the current chat, create a new one
    if (currentChatId === chatId) {
      await handleNewChat();
    }
  };

  const stopGeneration = async () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setIsTyping(false);
      
      // Add a message indicating that generation was stopped
      const activeChatIdForStop = currentChatId || await createNewChatSession("Stopped");
      if (activeChatIdForStop) {
        const stopMessage: HistoryMessage = {
          id: generateUniqueId(),
          content: "🛑 **Generation stopped by user**",
          role: 'assistant',
          timestamp: new Date()
        };
        
        addMessageToLocal(activeChatIdForStop, stopMessage);
        await saveMessage(activeChatIdForStop, stopMessage.content, 'assistant');
      }
    }
  };

  const handleToolUse = async (tool: 'calculator' | 'search', query: string) => {
    // This function is now mostly for legacy support
    // The main RAG functionality is handled in handleSendMessage
    toast({
      title: "Info",
      description: "Gunakan perintah /kalkulator atau /cari di chat untuk menggunakan alat RAG",
    });
  };

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please log in to continue</h2>
          <Button onClick={() => window.location.href = '/auth'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar with proper mobile handling */}
      <div className={`
        ${sidebarOpen ? 'w-64' : 'w-0'} 
        transition-all duration-300 ease-in-out 
        bg-background border-r border-border 
        flex-shrink-0 overflow-hidden
        animate-slide-in
        lg:relative fixed lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        top-0 left-0 h-full z-50
      `}>
        <div className={`w-64 h-full ${sidebarOpen ? 'animate-fade-in' : 'animate-fade-out'}`}>
          <ChatSidebar
            currentChatId={currentChatId}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            onEditChat={handleEditChat}
            chatSessions={chatSessions}
          />
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover-scale transition-all duration-200 hover:bg-accent/50"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 animate-fade-in">
                <img src={firefliesLogo} alt="FireFlies" className="w-8 h-8 hover-scale" />
                <h1 className="text-xl font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                  FireFlies
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Subscription Display */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {profile?.subscription_plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </span>
              </div>
              
              {/* Upgrade Button for Free Users in Header */}
              {profile?.subscription_plan === 'free' && (
                <Button
                  onClick={() => window.open('/pricing', '_blank')}
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  Upgrade
                </Button>
              )}
              
              {/* Model Selector */}
              <ModelSelector />
              
              {/* User Info and Logout */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {profile?.full_name || profile?.email || 'User'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
              
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 h-full">
            <div className="max-w-4xl mx-auto p-4">
              {messages.length === 0 && (
                <div className="text-center py-12 px-6">
                  <div className="flex justify-center mb-6">
                    <img src={firefliesLogo} alt="Chat AI" className="w-20 h-20" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4 text-foreground">
                    Welcome to AI Chat
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8">
                    How can I help you today?
                  </p>
                  
                  {/* Upgrade Button for Free Users */}
                  {profile?.subscription_plan === 'free' && (
                    <div className="mb-8">
                      <Button
                        onClick={() => window.open('/pricing', '_blank')}
                        variant="default"
                        size="lg"
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto animate-fade-in">
                    {[
                      "Help me write a creative story",
                      "Explain a complex topic simply", 
                      "Code review and optimization",
                      "Plan my next vacation"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSendMessage(suggestion)}
                        className="p-4 text-left border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover-scale animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <span className="text-sm font-medium">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {isTyping && <TypingIndicator />}
            </div>
          </ScrollArea>

          <ChatInput 
            onSendMessage={handleSendMessage}
            onToolUse={handleToolUse}
            onStopGeneration={handleStopGeneration}
            disabled={isTyping}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
};
