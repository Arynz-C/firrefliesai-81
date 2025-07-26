import { User, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import firefliesLogo from "@/assets/fireflies-logo.png";

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  };
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`flex gap-4 p-6 message-enter animate-fade-in ${isUser ? 'bg-background' : 'bg-muted/30'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover-scale ${
        isUser 
          ? 'bg-primary text-primary-foreground animate-bounce-in' 
          : 'bg-secondary text-secondary-foreground animate-bounce-in'
      }`}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <img src={firefliesLogo} alt="FireFlies" className="w-6 h-6 rounded-full hover-glow object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm">
            {isUser ? 'You' : (
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                FireFlies
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-foreground">
          <p className={`whitespace-pre-wrap leading-relaxed ${!isUser ? 'stream-text' : ''}`}>
            {message.content}
          </p>
        </div>

        {!isUser && (
          <div className="flex items-center gap-1 mt-4 animate-fade-in">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2 text-muted-foreground hover:text-foreground hover-scale"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground hover-scale"
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground hover-scale"
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};