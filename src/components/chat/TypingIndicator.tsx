import { Bot } from "lucide-react";
import firefliesLogo from "@/assets/fireflies-logo.png";

export const TypingIndicator = () => {
  return (
    <div className="flex gap-4 p-6 bg-muted/30 animate-fade-in message-enter">
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden animate-pulse">
        <img src={firefliesLogo} alt="FireFlies" className="w-8 h-8 object-cover animate-bounce-in" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent animate-pulse">
            FireFlies
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-bounce [animation-delay:-0.4s] [animation-duration:1.4s]"></div>
            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-bounce [animation-delay:-0.2s] [animation-duration:1.4s]"></div>
            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-bounce [animation-delay:0s] [animation-duration:1.4s]"></div>
            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1.4s]"></div>
          </div>
          
          {/* Thinking text with typewriter effect */}
          <div className="relative">
            <span className="text-sm text-muted-foreground animate-pulse">
              Sedang berpikir
            </span>
            <span className="animate-ping absolute -right-2 top-0 text-primary">.</span>
          </div>
          
          {/* Brain animation */}
          <div className="ml-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 w-full bg-muted rounded-full h-1 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};