// app/contexts/setup-context.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIModelState {
  modelId: string;
  config: Record<string, string>;
}

interface SetupContextType {
  // Step 1: Details
  n8nApiKey: string;
  setN8nApiKey: (value: string) => void;
  unipileApiKey: string;
  setUnipileApiKey: (value: string) => void;
  unipileDsn: string;
  setUnipileDsn: (value: string) => void;
  pocketbaseSuperuserEmail: string;
  setPocketbaseSuperuserEmail: (value: string) => void;
  pocketbaseSuperuserPassword: string;
  setPocketbaseSuperuserPassword: (value: string) => void;
  unipileAccountId: string;
  setUnipileAccountId: (value: string) => void;
  
  // AI Model Configuration
  aiModel: AIModelState | null;
  setAIModel: (modelId: string, config: Record<string, string>) => void;
  clearAIModel: () => void;
  
  // Step 2: n8n
  n8nSetupComplete: boolean;
  setN8nSetupComplete: (value: boolean) => void;
  
  // Step 3: Manual setup (if needed)
  manualSetupComplete: boolean;
  setManualSetupComplete: (value: boolean) => void;
  
  // Step 3: PocketBase
  pocketbaseSetupComplete: boolean;
  setPocketbaseSetupComplete: (value: boolean) => void;
  pocketbaseServiceUsername: string;
  setPocketbaseServiceUsername: (value: string) => void;
  pocketbaseServicePassword: string;
  setPocketbaseServicePassword: (value: string) => void;
  
  
  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export function SetupProvider({ children }: { children: ReactNode }) {
  // Step 1: Details
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [unipileApiKey, setUnipileApiKey] = useState('');
  const [unipileDsn, setUnipileDsn] = useState('');
  const [pocketbaseSuperuserEmail, setPocketbaseSuperuserEmail] = useState('');
  const [pocketbaseSuperuserPassword, setPocketbaseSuperuserPassword] = useState('');
  const [unipileAccountId, setUnipileAccountId] = useState<string>('');
  
  // Step 2: n8n
  const [n8nSetupComplete, setN8nSetupComplete] = useState(false);
  
  // Step 3: Manual setup
  const [manualSetupComplete, setManualSetupComplete] = useState(false);
  
  // Step 4: PocketBase
  const [pocketbaseSetupComplete, setPocketbaseSetupComplete] = useState(false);
  const [pocketbaseServiceUsername, setPocketbaseServiceUsername] = useState('');
  const [pocketbaseServicePassword, setPocketbaseServicePassword] = useState('');
  
  
  // Navigation
  const [currentStep, setCurrentStep] = useState(1);
  
  const goToNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };
  
  // AI Model state
  const [aiModel, setAIModelState] = useState<AIModelState | null>(null);
  
  const setAIModel = (modelId: string, config: Record<string, string>) => {
    setAIModelState({ modelId, config });
  };
  
  const clearAIModel = () => {
    setAIModelState(null);
  };
  
  return (
    <SetupContext.Provider
      value={{
        n8nApiKey,
        setN8nApiKey,
        unipileApiKey,
        setUnipileApiKey,
        unipileDsn,
        setUnipileDsn,
        pocketbaseSuperuserEmail,
        setPocketbaseSuperuserEmail,
        pocketbaseSuperuserPassword,
        setPocketbaseSuperuserPassword,
        n8nSetupComplete,
        setN8nSetupComplete,
        manualSetupComplete,
        setManualSetupComplete,
        pocketbaseSetupComplete,
        setPocketbaseSetupComplete,
        pocketbaseServiceUsername,
        setPocketbaseServiceUsername,
        pocketbaseServicePassword,
        setPocketbaseServicePassword,
        unipileAccountId,
        setUnipileAccountId,
        currentStep,
        setCurrentStep,
        goToNextStep,
        goToPreviousStep,
        aiModel,
        setAIModel,
        clearAIModel,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
}