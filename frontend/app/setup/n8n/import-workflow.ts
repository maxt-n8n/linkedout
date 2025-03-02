import { SetupStatus } from './types';

export async function importSingleWorkflow(
  n8nApiKey: string,
  unipileCredentialId: string,
  workflow: { name: string; filename: string },
  replacements: Record<string, string>,
  setError: (error: string | null) => void
): Promise<boolean> {
  try {
    console.log(`Importing workflow: ${workflow.name}`);
    
    const response = await fetch(`/workflows/${workflow.filename}.json`);
    if (!response.ok) {
      const errorMessage = `Failed to load workflow file: ${workflow.filename}.json (Status: ${response.status})`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    let workflowData = await response.json();
    let workflowStr = JSON.stringify(workflowData);
    
    // Apply all replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      workflowStr = workflowStr.split(placeholder).join(value);
    }
    
    workflowData = JSON.parse(workflowStr);
    
    const cleanWorkflow = {
      name: workflow.name,
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || {},
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true,
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
        executionTimeout: 3600,
        timezone: "UTC"
      }
    };
    
    const importResponse = await fetch('/api/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service': 'n8n',
        'x-endpoint': 'api/v1/workflows',
        'x-n8n-api-key': n8nApiKey
      },
      body: JSON.stringify(cleanWorkflow),
    });

    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      let errorMessage = `Failed to import workflow: ${workflow.name}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {
        errorMessage = `${errorMessage} - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const importData = await importResponse.json();
    if (!importData.id) {
      throw new Error(`Failed to get workflow ID for: ${workflow.name}`);
    }

    // Activate the workflow
    const activateResponse = await fetch('/api/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service': 'n8n',
        'x-endpoint': `api/v1/workflows/${importData.id}/activate`,
        'x-n8n-api-key': n8nApiKey
      },
      body: JSON.stringify({}),
    });

    if (!activateResponse.ok) {
      const errorText = await activateResponse.text();
      let errorMessage = `Failed to activate workflow: ${workflow.name}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {
        errorMessage = `${errorMessage} - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error(`Error importing workflow ${workflow.name}:`, error);
    setError(error instanceof Error ? error.message : `Failed to import workflow: ${workflow.name}`);
    return false;
  }
} 