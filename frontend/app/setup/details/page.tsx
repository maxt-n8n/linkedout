'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSetup } from '@/app/contexts/setup-context';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import Image from 'next/image';
import { ModelSelector } from '@/components/ui/setup/model-selector';
import { getModelConfig } from './models';

// Validation schema
const formSchema = z.object({
  n8nApiKey: z.string().min(1, "n8n API Key is required"),
  pocketbaseSuperuserEmail: z.string().email("Invalid email address").min(1, "PocketBase Superuser Email is required"),
  pocketbaseSuperuserPassword: z.string().min(1, "PocketBase Superuser Password is required"),
});

export default function DetailsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    n8nApiKey, setN8nApiKey,
    pocketbaseSuperuserEmail, setPocketbaseSuperuserEmail,
    pocketbaseSuperuserPassword, setPocketbaseSuperuserPassword,
    goToNextStep,
    aiModel,
    setAIModel,
  } = useSetup();
  
  const [errors, setErrors] = useState<{
    n8nApiKey?: string;
    pocketbaseSuperuserEmail?: string;
    pocketbaseSuperuserPassword?: string;
  }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelError, setModelError] = useState<string>();
  
  const validateForm = () => {
    try {
      formSchema.parse({
        n8nApiKey,
        pocketbaseSuperuserEmail,
        pocketbaseSuperuserPassword,
      });
      
      // Add AI model validation
      if (!aiModel?.modelId) {
        setModelError('Please select an AI model');
        return false;
      }
      
      const modelConfig = getModelConfig(aiModel.modelId);
      const missingFields = modelConfig?.fields
        .filter(field => field.required && !aiModel.config[field.key]);
      
      if (missingFields?.length) {
        setModelError(`Missing required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return false;
      }
      
      setModelError(undefined);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(formattedErrors);
      }
      return false;
    }
  };
  
  const handleContinue = () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // No API call needed - just store in context
      toast({
        title: "Details saved",
        description: "Your API keys have been saved successfully."
      });
      
      goToNextStep();
      router.push('/setup/n8n');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save details",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="border border-border rounded-lg p-8 bg-background">
      <h1 className="text-2xl font-bold mb-4">Add stack details</h1>
      
      <p className="text-muted-foreground mb-6">
        This app connects to your n8n and PocketBase, setting up workflows, credentials, and tables via
        API. There is no "phone home", none of your infos are sent to us 🤓
      </p>
      
      <div className="bg-green-50/80 dark:bg-green-950/20 border border-green-200/70 dark:border-green-800/50 rounded-md p-4 mb-6">
        <p className="text-green-700 dark:text-green-300/90 text-sm">
          <span className="font-medium">Max's protip:</span> Use coupon code <b>MAX50</b> for 50% off a year of <a href="https://n8n.io/pricing" target="_blank" className="text-primary hover:underline">n8n cloud</a>, or alternatively <a href="https://docs.n8n.io/hosting/" target="_blank" className="text-primary hover:underline">self-host </a>.
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            n8n API key
          </label>
          <Input
            value={n8nApiKey}
            onChange={(e) => setN8nApiKey(e.target.value)}
            placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className={`w-full ${errors.n8nApiKey ? 'border-destructive' : ''}`}
          />
          {errors.n8nApiKey && (
            <p className="text-sm text-destructive mt-1">{errors.n8nApiKey}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Create an API key in <a href={`${process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL}/settings/api`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">your n8n settings</a>
          </p>
        </div>
        
        <div className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                PocketBase Superuser Email
              </label>
              <Input
                type="email"
                value={pocketbaseSuperuserEmail}
                onChange={(e) => setPocketbaseSuperuserEmail(e.target.value)}
                placeholder="e.g. admin@example.com"
                className={`w-full ${errors.pocketbaseSuperuserEmail ? 'border-destructive' : ''}`}
              />
              {errors.pocketbaseSuperuserEmail && (
                <p className="text-sm text-destructive mt-1">{errors.pocketbaseSuperuserEmail}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
              POCKETBASE_USER env variable set during installation
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                PocketBase Superuser Password
              </label>
              <Input
                type="password"
                value={pocketbaseSuperuserPassword}
                onChange={(e) => setPocketbaseSuperuserPassword(e.target.value)}
                placeholder="Your PocketBase admin password"
                className={`w-full ${errors.pocketbaseSuperuserPassword ? 'border-destructive' : ''}`}
              />
              {errors.pocketbaseSuperuserPassword && (
                <p className="text-sm text-destructive mt-1">{errors.pocketbaseSuperuserPassword}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                POCKETBASE_PASSWORD env variable set during installation
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6 mt-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">AI Model Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Select and configure the AI model for enhanced features
          </p>
        </div>
        
        <ModelSelector
          selectedModelId={aiModel?.modelId}
          modelConfig={aiModel?.config || {}}
          onModelSelect={(modelId) => setAIModel(modelId, {})}
          onConfigChange={(config) => setAIModel(aiModel?.modelId!, config)}
          error={modelError}
        />
      </div>
      
      <div className="flex justify-between mt-16">
        <Button variant="outline" onClick={() => router.push('/setup/unipile')}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={isSubmitting || !n8nApiKey || !pocketbaseSuperuserEmail || !pocketbaseSuperuserPassword}
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
} 