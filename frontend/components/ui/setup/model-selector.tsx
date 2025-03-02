'use client';

import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { SUPPORTED_MODELS, getModelConfig } from '@/app/setup/details/models';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ModelSelectorProps {
  selectedModelId: string | undefined;
  modelConfig: Record<string, string>;
  onModelSelect: (modelId: string) => void;
  onConfigChange: (config: Record<string, string>) => void;
  error?: string;
}

export function ModelSelector({
  selectedModelId,
  modelConfig,
  onModelSelect,
  onConfigChange,
  error
}: ModelSelectorProps) {
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  
  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    // Don't clear config when switching models to preserve entered values
    setConfigErrors({});
  };
  
  const handleConfigChange = (key: string, value: string) => {
    const model = getModelConfig(selectedModelId!);
    const field = model?.fields.find(f => f.key === key);
    
    let error: string | undefined;
    if (field?.validation) {
      error = field.validation(value);
    }
    
    setConfigErrors(prev => ({
      ...prev,
      [key]: error || ''
    }));
    
    onConfigChange({
      ...modelConfig,
      [key]: value
    });
  };
  
  const selectedModel = selectedModelId ? getModelConfig(selectedModelId) : null;
  
  return (
    <div className="space-y-6">
      <RadioGroup
        value={selectedModelId}
        onValueChange={handleModelSelect}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {SUPPORTED_MODELS.map((model) => (
          <div key={model.id} className="relative">
            <RadioGroupItem
              value={model.id}
              id={model.id}
              className="peer sr-only"
            />
            <label
              htmlFor={model.id}
              className={cn(
                "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:border-primary transition-colors",
                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              )}
            >
              {model.icon && (
                <Image
                  src={model.icon}
                  alt={`${model.company} logo`}
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
              )}
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{model.name}</p>
                  <p className="text-xs text-muted-foreground">{model.company}</p>
                </div>
                {model.description && (
                  <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                )}
              </div>
            </label>
          </div>
        ))}
      </RadioGroup>

      {selectedModel && (
        <div className="border rounded-lg p-4 space-y-4 mt-6 bg-muted/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Configure {selectedModel.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedModel.company}</p>
          </div>
          
          <div className="space-y-4">
            {selectedModel.fields.map((field) => (
              <div key={field.key}>
                {field.type === 'field' ? (
                  <p className="text-sm text-muted-foreground mb-4">{field.content}</p>
                ) : (
                  <>
                    <label className="block text-sm font-medium mb-2" htmlFor={field.key}>
                      {field.label}
                    </label>
                    <Input
                      id={field.key}
                      type={field.type}
                      value={modelConfig[field.key] || ''}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={cn(
                        configErrors[field.key] && "border-destructive"
                      )}
                    />
                    {configErrors[field.key] && (
                      <p className="text-sm text-destructive mt-1">{configErrors[field.key]}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
} 