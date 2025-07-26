import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OLLAMA_URL_KEY = 'ollama_base_url';
const DEFAULT_OLLAMA_URL = 'https://super-adventure-6w5wvrqxvg4fxv6-11434.app.github.dev';

export const useOllamaUrl = () => {
  const [ollamaUrl, setOllamaUrl] = useState<string>(() => {
    return localStorage.getItem(OLLAMA_URL_KEY) || DEFAULT_OLLAMA_URL;
  });

  const updateOllamaUrl = (url: string) => {
    localStorage.setItem(OLLAMA_URL_KEY, url);
    setOllamaUrl(url);
  };

  return { ollamaUrl, updateOllamaUrl };
};

export const OllamaSettings = () => {
  const { toast } = useToast();
  const { ollamaUrl, updateOllamaUrl } = useOllamaUrl();
  const [tempUrl, setTempUrl] = useState(ollamaUrl);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTempUrl(ollamaUrl);
  }, [ollamaUrl, open]);

  const handleSave = () => {
    if (!tempUrl.trim()) {
      toast({
        title: "Error",
        description: "URL Ollama tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(tempUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "Format URL tidak valid",
        variant: "destructive",
      });
      return;
    }

    updateOllamaUrl(tempUrl.trim());
    setOpen(false);
    toast({
      title: "Berhasil",
      description: "Pengaturan Ollama berhasil disimpan",
    });
  };

  const handleReset = () => {
    setTempUrl(DEFAULT_OLLAMA_URL);
  };

  return null; // Settings button removed - model selection handled by ModelSelector
};
