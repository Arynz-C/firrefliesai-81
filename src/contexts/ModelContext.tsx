import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const MODEL_KEY = 'selected_ollama_model';
const DEFAULT_MODEL = 'FireFlies:latest';

interface ModelContextType {
  selectedModel: string;
  updateSelectedModel: (model: string) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL;
  });

  const updateSelectedModel = (model: string) => {
    console.log('🔄 ModelContext: Updating selected model to:', model);
    localStorage.setItem(MODEL_KEY, model);
    setSelectedModel(model);
  };

  useEffect(() => {
    console.log('🔄 ModelContext: Selected model changed to:', selectedModel);
  }, [selectedModel]);

  return (
    <ModelContext.Provider value={{ selectedModel, updateSelectedModel }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useSelectedModel = () => {
  const context = useContext(ModelContext);
  console.log('🔍 ModelContext: Context value:', context);
  console.log('🔍 ModelContext: ModelContext instance:', ModelContext);
  
  if (context === undefined) {
    console.error('❌ ModelContext: useSelectedModel called outside of ModelProvider');
    // Temporary fallback to prevent app crash during development
    const fallbackModel = localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL;
    console.log('🔄 ModelContext: Using fallback model:', fallbackModel);
    return {
      selectedModel: fallbackModel,
      updateSelectedModel: (model: string) => {
        console.log('🔄 ModelContext: Fallback updateSelectedModel called with:', model);
        localStorage.setItem(MODEL_KEY, model);
      }
    };
  }
  return context;
};