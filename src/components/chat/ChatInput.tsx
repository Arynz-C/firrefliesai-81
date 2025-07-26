// Chat input component
import { useState, useEffect, useRef } from "react";
import { Send, Settings, Calculator, Search, Globe, Trash2, Square, X, Plus, Image, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSendMessage: (message: string, image?: File) => void;
  onToolUse?: (tool: 'calculator' | 'search' | 'web', query: string) => void;
  onStopGeneration?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

export const ChatInput = ({ onSendMessage, onToolUse, onStopGeneration, disabled = false, isGenerating = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedTool, setSelectedTool] = useState<'search' | 'calculator' | 'web' | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect tool commands and trigger UI
  useEffect(() => {
    if (message.startsWith('/cari ')) {
      setSelectedTool('search');
      setMessage(message.replace('/cari ', '')); // Remove command, keep the query
    } else if (message.startsWith('/kalkulator ')) {
      setSelectedTool('calculator');
      setMessage(message.replace('/kalkulator ', '')); // Remove command, keep the query
    } else if (message.startsWith('/web ')) {
      setSelectedTool('web');
      setMessage(message.replace('/web ', '')); // Remove command, keep the query
    } else if (message.startsWith('/clear')) {
      // Auto-send /clear command
      if (message === '/clear') {
        onSendMessage('/clear');
        setMessage("");
        setSelectedTool(null);
      }
    }
  }, [message, onSendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || selectedImage) && !disabled) {
      let finalMessage = message.trim();
      
      // Add command prefix automatically if tool is selected
      if (selectedTool === 'calculator') {
        finalMessage = `/kalkulator ${finalMessage}`;
      } else if (selectedTool === 'search') {
        finalMessage = `/cari ${finalMessage}`;
      } else if (selectedTool === 'web') {
        finalMessage = `/web ${finalMessage}`;
      }
      
      // If image is selected but no message, provide default message
      if (selectedImage && !finalMessage) {
        finalMessage = "Describe this image:";
      }
      
      onSendMessage(finalMessage, selectedImage || undefined);
      setMessage("");
      setSelectedTool(null);
      setSelectedImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleToolSelect = (tool: 'calculator' | 'search' | 'web' | 'clear') => {
    if (tool === 'clear') {
      onSendMessage('/clear');
      setMessage("");
      setSelectedTool(null);
    } else {
      setSelectedTool(tool);
      setMessage(""); // Don't pre-fill with command
    }
  };

  const handleRemoveTool = () => {
    setSelectedTool(null);
    setMessage("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStopGeneration = () => {
    if (onStopGeneration) {
      onStopGeneration();
    }
  };

  const getPlaceholder = () => {
    if (selectedTool === 'search') {
      return "Ketik pencarian Anda...";
    } else if (selectedTool === 'calculator') {
      return "Ketik perhitungan Anda... (contoh: 5+5=10)";
    } else if (selectedTool === 'web') {
      return "Ketik pertanyaan dan URL... (contoh: ambil fungsi yang ada di web https://example.com)";
    }
    return "Message FireFlies...";
  };

  const getToolLabel = (tool: 'search' | 'calculator' | 'web') => {
    if (tool === 'search') return 'Cari';
    if (tool === 'calculator') return 'Kalkulator';
    if (tool === 'web') return 'Ekstrak Web';
    return '';
  };

  const getToolIcon = (tool: 'search' | 'calculator' | 'web') => {
    if (tool === 'search') return <Search className="w-4 h-4" />;
    if (tool === 'calculator') return <Calculator className="w-4 h-4" />;
    if (tool === 'web') return <Globe className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="border-t border-border bg-background p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3 bg-muted/50 rounded-xl p-3 border border-border shadow-sm hover-glow transition-all duration-200">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled}
            className="flex-1 min-h-[20px] max-h-32 resize-none border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Image upload button */}
            {!isGenerating && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover-scale"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload image"
                >
                  <Image className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Tools dropdown */}
            {!isGenerating && !selectedTool && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover-scale"
                    title="Pilih alat"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => handleToolSelect('search')}>
                    <Search className="w-4 h-4 mr-2" />
                    Pencarian web
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToolSelect('calculator')}>
                    <Calculator className="w-4 h-4 mr-2" />
                    Kalkulator
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToolSelect('web')}>
                    <Globe className="w-4 h-4 mr-2" />
                    Ekstrak Website
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToolSelect('clear')}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Context
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isGenerating && (
              <Button
                type="button"
                onClick={handleStopGeneration}
                variant="destructive"
                size="sm"
                className="h-9 w-9 p-0 hover-scale btn-animated"
              >
                <Square className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={(!message.trim() && !selectedImage) || disabled}
              size="sm"
              className="h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 hover-scale btn-animated"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tool chip display - moved below input */}
        {selectedTool && (
          <div className="flex items-center gap-2 mt-3 animate-fade-in">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 text-sm border border-border">
              {getToolIcon(selectedTool)}
              <span className="text-foreground">{getToolLabel(selectedTool)}</span>
              <Button
                type="button"
                onClick={handleRemoveTool}
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Image selection chip */}
        {selectedImage && (
          <div className="flex items-center gap-2 mt-3 animate-fade-in">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 text-sm border border-border">
              <Upload className="w-4 h-4" />
              <span className="text-foreground">Image: {selectedImage.name}</span>
              <Button
                type="button"
                onClick={handleRemoveImage}
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          FireFlies can make mistakes. Check important info.
        </p>
      </form>
    </div>
  );
};
