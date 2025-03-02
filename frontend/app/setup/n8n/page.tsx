// app/setup/n8n/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSetup } from '@/app/contexts/setup-context';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { addCredentials } from './add-credentials';
import { importSingleWorkflow } from './import-workflow';
import { SetupStatus } from './types';
import Image from 'next/image';
import { TodoStepWithSubSteps } from '@/components/ui/setup/todo-step-with-substeps';


export default function N8nSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    n8nApiKey, 
    unipileApiKey,
    unipileAccountId,
    unipileDsn,
    aiModel,
    goToNextStep,
    currentStep,
    setN8nSetupComplete,
    n8nSetupComplete
  } = useSetup();
  
  const [status, setStatus] = useState<SetupStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Setup steps
  const [unipileCredentialStatus, setUnipileCredentialStatus] = useState<SetupStatus>('idle');
  const [workflowsStatus, setWorkflowsStatus] = useState<SetupStatus>('idle');
  
  // Add a ref to track if setup has been initiated
  const setupInitiatedRef = useRef(false);
  const setupCompletedRef = useRef(false);
  
  const workflows = [
    { 
      id: 'inbox',
      title: '/inbox backend [linkedout]',
      description: 'Handles inbox message processing',
      status: 'idle' as SetupStatus,
      filename: 'inbox-backend'
    },
    {
      id: 'thread',
      title: '/thread backend [linkedout]',
      description: 'Manages message threading',
      status: 'idle' as SetupStatus,
      filename: 'thread-backend'
    },
    {
      id: 'setup',
      title: '/setup backend [linkedout]',
      description: 'Handles setup and configuration',
      status: 'idle' as SetupStatus,
      filename: 'setup-workflow'
    }
  ];
  
  const [workflowStatuses, setWorkflowStatuses] = useState<Record<string, SetupStatus>>(
    Object.fromEntries(workflows.map(w => [w.id, 'idle']))
  );
  
  useEffect(() => {
    // If we're on a step after n8n setup OR n8n setup is marked complete in context
    if (currentStep > 1 && n8nSetupComplete) {
      setupCompletedRef.current = true;
      setStatus('success');
      setUnipileCredentialStatus('success');
      setWorkflowsStatus('success');
      return;
    }
    
    // Add !setupCompletedRef.current check
    if (
      status === 'idle' && 
      !setupInitiatedRef.current && 
      !setupCompletedRef.current && 
      n8nApiKey && 
      unipileApiKey && 
      unipileDsn
    ) {
      setupInitiatedRef.current = true;
      handleSetup();
    }
  }, [currentStep, n8nSetupComplete]);
  
  const handleSetup = async () => {
    // Don't restart if already completed
    if (setupCompletedRef.current) {
      console.log('Setup already completed, not restarting');
      return;
    }
    
    // Prevent multiple simultaneous setup attempts
    if (setupInitiatedRef.current && status === 'loading') {
      console.log('Setup already in progress, ignoring duplicate request');
      return;
    }
    
    setupInitiatedRef.current = true;
    
    if (!n8nApiKey || !unipileApiKey || !unipileDsn) {
      router.push('/setup/details');
      return;
    }
    
    
    setStatus('loading');
    setError(null);
    
    try {
      // Step 1: Add credentials to n8n
      setUnipileCredentialStatus('loading');
      const credentialsResult = await addCredentials(
        n8nApiKey, 
        unipileApiKey,
        unipileAccountId,
        aiModel,
        setError
      );
      // Add delay before updating status
      await new Promise(resolve => setTimeout(resolve, 500));
      setUnipileCredentialStatus(credentialsResult ? 'success' : 'error');
      
      if (!credentialsResult) {
        throw new Error('Failed to add credentials to n8n');
      }
      
      // Get the credential ID from localStorage
      const unipileCredentialId = localStorage.getItem('unipileCredentialId');
      
      // Step 2: Import modified workflows to n8n
      setWorkflowsStatus('loading');
      setStatus('loading');

      if (!unipileCredentialId) {
        const error = 'Missing Unipile credential ID';
        setError(error);
        setWorkflowsStatus('error');
        setStatus('error');
        return;
      }

      // Process DSN URL
      let unipileDsnUrl = unipileDsn || "";
      if (unipileDsnUrl && !unipileDsnUrl.startsWith('https://') && !unipileDsnUrl.startsWith('http://')) {
        unipileDsnUrl = `https://${unipileDsnUrl}`;
      }

      const replacements = {
        "****POCKETBASE_BASE_URL****": process.env.NEXT_PUBLIC_POCKETBASE_URL || "",
        "****UNIPILE_CREDENTIAL_ID****": unipileCredentialId,
        "****UNIPILE_DSN_URL****": unipileDsnUrl,
        "****UNIPILE_ACCOUNT_ID****": unipileAccountId || "",
        "****POCKETBASE_SERVICE_USER_EMAIL****": process.env.POCKETBASE_SERVICE_USER_EMAIL || "",
        "****POCKETBASE_SERVICE_USER_PASSWORD****": process.env.POCKETBASE_SERVICE_USER_PASSWORD || ""
      };

      // Reset all workflow statuses to loading
      setWorkflowStatuses(prev => 
        Object.fromEntries(Object.keys(prev).map(k => [k, 'loading']))
      );

      let hasError = false;
      for (const workflow of workflows) {
        // Set current workflow to loading
        setWorkflowStatuses(prev => ({ 
          ...prev, 
          [workflow.id]: 'loading' 
        }));
        
        const success = await importSingleWorkflow(
          n8nApiKey!,
          unipileCredentialId,
          { name: workflow.title, filename: workflow.filename },
          replacements,
          setError
        );
        
        // Add a small delay after completion before updating status
        await new Promise(resolve => setTimeout(resolve, 250));
        
        setWorkflowStatuses(prev => ({ 
          ...prev, 
          [workflow.id]: success ? 'success' : 'error' 
        }));
        
        if (!success) {
          hasError = true;
          setWorkflowsStatus('error');
          setStatus('error');
          break;
        }
      }

      if (!hasError) {
        setWorkflowsStatus('success');
        setStatus('success');
        setupCompletedRef.current = true;
        setN8nSetupComplete(true);
        
        toast({
          title: "n8n setup complete",
          description: "Great success [Borat voice]",
        });
        
        goToNextStep();
      }
      
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      toast({
        title: "Setup failed",
        description: err instanceof Error ? err.message : "Failed to set up n8n",
        variant: "destructive",
      });
    }
  };
  
  const handleRetry = () => {
    setupInitiatedRef.current = false;
    setupCompletedRef.current = false;
    setUnipileCredentialStatus('idle');
    setWorkflowsStatus('idle');
    setWorkflowStatuses(prev => 
      Object.fromEntries(Object.keys(prev).map(k => [k, 'idle']))
    );
    setStatus('idle');
    setError(null);
    handleSetup();
  };
  
  const handleContinue = () => {
    router.push('/setup/pocketbase');
  };
  
  const renderStatusIcon = (status: SetupStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5" />;
    }
  };
  
  // Determine if navigation should be disabled
  const isNavigationDisabled = status === 'loading';
  
  return (
    <div className="border border-border rounded-lg p-8 bg-background">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">Setting up n8n</h1>
          <p className="text-muted-foreground">
            We're configuring your n8n instance with the necessary workflows and credentials.
          </p>
        </div>
        <Image 
          src="/images/logo-n8n.svg" 
          alt="n8n Logo" 
          width={100} 
          height={27} 
          className="mt-1 opacity-90"
        />
      </div>
      
      <div className="space-y-8 mb-12">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full max-w-[calc(100%-2.5rem)]">
            <h3 className="font-medium">Add credentials to n8n</h3>
            <p className="text-sm text-muted-foreground">Adding Unipile and AI model credentials</p>
          </div>
          <div className="min-w-[1.25rem]">
            {renderStatusIcon(unipileCredentialStatus)}
          </div>
        </div>
        
        <TodoStepWithSubSteps
          title="Import modified workflows to n8n"
          description="This step customizes workflows with your input and imports them into n8n"
          subSteps={workflows.map(w => ({
            id: w.id,
            title: w.title,
            description: w.description,
            status: workflowStatuses[w.id]
          }))}
        />
      </div>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between mt-16">
        <Button 
          variant="outline" 
          onClick={() => router.push('/setup/details')}
          disabled={isNavigationDisabled}
        >
          Back
        </Button>
        
        <div className="space-x-2">
          {status === 'error' && (
            <Button onClick={handleRetry}>
              Retry
            </Button>
          )}
          
          {(status === 'success' || setupCompletedRef.current) ? (
            <Button onClick={handleContinue}>
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleContinue} 
              disabled={true}
            >
              Continue
            </Button>
          )}
          
          {status === 'idle' && !setupInitiatedRef.current && !setupCompletedRef.current && (
            <Button onClick={handleSetup}>
              Start Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}