import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bot, Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedModel } from "@/contexts/ModelContext";
import { useOllamaUrl } from "./OllamaSettings";

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
}

export const ModelSelector = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { selectedModel, updateSelectedModel } = useSelectedModel();
  const { ollamaUrl } = useOllamaUrl();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const isProUser = profile?.subscription_plan === 'pro';
  const isFreeModel = (modelName: string) => modelName === 'FireFlies:latest';

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ollama-proxy', {
        body: { action: 'get_models', baseUrl: ollamaUrl }
      });
      
      if (error) throw error;
      
      setModels(data?.models || []);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil daftar model. Pastikan Ollama berjalan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open]);

  const handleModelSelect = (modelName: string) => {
    // Check if user is trying to select a non-free model without pro subscription
    if (!isProUser && !isFreeModel(modelName)) {
      toast({
        title: "Upgrade Required",
        description: "Model ini hanya tersedia untuk pengguna Pro. Upgrade ke Pro untuk mengakses semua model.",
        variant: "destructive",
      });
      return;
    }

    console.log(`🔄 Changing model from ${selectedModel} to ${modelName}`);
    updateSelectedModel(modelName);
    setOpen(false);
    toast({
      title: "Model Updated",
      description: `Model berhasil diubah ke ${modelName}`,
    });
  };

  const getAvailableModels = () => {
    if (isProUser) {
      return models; // Pro users get all models
    }
    // Free users only get FireFlies:latest model
    return models.filter(model => isFreeModel(model.name));
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedModel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Pilih Model AI
          </DialogTitle>
          <DialogDescription>
            Pilih model AI yang akan digunakan untuk chat. 
            {!isProUser && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {" "}Model lainnya tersedia untuk pengguna Pro.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Memuat model...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Model tersedia:</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {getAvailableModels().length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {models.length === 0 
                      ? "Tidak ada model yang ditemukan. Pastikan Ollama berjalan."
                      : "Tidak ada model 1b yang tersedia. Download model dengan 'ollama pull llama3.2:1b'"
                    }
                  </div>
                ) : (
                  getAvailableModels().map((model) => (
                    <div
                      key={model.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModel === model.name
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleModelSelect(model.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            {isFreeModel(model.name) && (
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                Free
                              </span>
                            )}
                            {!isFreeModel(model.name) && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Size: {formatFileSize(model.size)}
                          </div>
                        </div>
                        {selectedModel === model.name && (
                          <div className="text-primary text-sm font-medium">
                            ✓ Dipilih
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {!isProUser && models.some(model => !isFreeModel(model.name)) && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-amber-800 dark:text-amber-200">
                        Upgrade ke Pro
                      </div>
                      <div className="text-amber-700 dark:text-amber-300">
                        Akses semua model AI termasuk yang lebih powerful untuk hasil terbaik.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};