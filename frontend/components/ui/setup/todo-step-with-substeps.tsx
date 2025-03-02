'use client';

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { SetupStatus } from '@/app/setup/n8n/types';
import { cn } from '@/lib/utils';

export interface SubStep {
  id: string;
  title: string;
  description?: string;
  status: SetupStatus;
}

interface TodoStepWithSubStepsProps {
  title: string;
  description?: string;
  subSteps: SubStep[];
}

export function TodoStepWithSubSteps({ title, description, subSteps }: TodoStepWithSubStepsProps) {
  const renderStatusIcon = (status: SetupStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <div className="h-5 w-5" />;
    }
  };

  // Add helper to determine overall status
  const getOverallStatus = (steps: SubStep[]): SetupStatus => {
    if (steps.some(step => step.status === 'error')) return 'error';
    if (steps.some(step => step.status === 'loading')) return 'loading';
    if (steps.every(step => step.status === 'success')) return 'success';
    return 'idle';
  };

  const overallStatus = getOverallStatus(subSteps);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="w-full">
        <div className="flex items-start justify-between mb-4">
          <div className="w-full max-w-[calc(100%-2.5rem)]">
            <h3 className="font-medium">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="min-w-[1.25rem]">
            {renderStatusIcon(overallStatus)}
          </div>
        </div>
        <div className="space-y-3">
          {subSteps.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "flex items-start justify-between gap-4 p-3 rounded-md",
                "bg-muted/40",
                step.status === 'error' && "bg-destructive/10"
              )}
            >
              <div className="w-full max-w-[calc(100%-2.5rem)]">
                <p className={cn(
                  "text-sm font-medium",
                  step.status === 'error' && "text-destructive"
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                )}
              </div>
              <div className="min-w-[1.25rem]">
                {renderStatusIcon(step.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 