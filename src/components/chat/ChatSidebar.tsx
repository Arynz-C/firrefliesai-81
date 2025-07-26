import { useState } from "react";
import { Plus, MessageSquare, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages?: any[];
}

interface ChatSidebarProps {
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onEditChat: (chatId: string, newTitle: string) => void;
  chatSessions: ChatSession[];
}

export const ChatSidebar = ({ currentChatId, onNewChat, onSelectChat, onDeleteChat, onEditChat, chatSessions }: ChatSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onNewChat}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 btn-animated hover-glow"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chatSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                console.log('🖱️ Clicked on chat session:', session.id, session.title);
                onSelectChat(session.id);
              }}
              className={`group relative p-3 rounded-lg cursor-pointer card-interactive animate-fade-in ${
                currentChatId === session.id ? 'bg-accent ring-2 ring-primary/20' : ''
              }`}
              style={{ animationDelay: `${chatSessions.indexOf(session) * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && editTitle.trim()) {
                          onEditChat(session.id, editTitle.trim());
                          setEditingId(null);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => {
                        if (editTitle.trim()) {
                          onEditChat(session.id, editTitle.trim());
                        }
                        setEditingId(null);
                      }}
                      className="font-medium text-sm text-foreground bg-transparent border-none outline-none w-full"
                      autoFocus
                    />
                  ) : (
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {session.title}
                    </h3>
                  )}
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {session.lastMessage}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {formatTime(session.timestamp)}
                  </span>
                </div>
              </div>
              
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1 animate-fade-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-secondary hover-scale"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(session.id);
                    setEditTitle(session.title);
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive hover-scale"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🗑️ Delete button clicked for chat:', session.id);
                    onDeleteChat(session.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};