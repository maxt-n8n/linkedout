import { getModelConfig } from '@/app/setup/details/models';

export async function addCredentials(
  n8nApiKey: string,
  unipileApiKey: string,
  unipileAccountId: string,
  aiModel: { modelId: string; config: Record<string, string> } | null,
  setError: (error: string | null) => void
): Promise<boolean> {
  try {
    // Add Unipile credential
    const unipileCredential = {
      name: "Unipile [LinkedIn API]",
      type: "httpHeaderAuth",
      data: {
        name: "X-API-KEY",
        value: unipileApiKey
      }
    };
    
    console.log("Creating Unipile credential:", unipileCredential);
    
    const unipileResponse = await fetch('/api/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service': 'n8n',
        'x-endpoint': 'api/v1/credentials',
        'x-n8n-api-key': n8nApiKey
      },
      body: JSON.stringify(unipileCredential),
    });

    if (!unipileResponse.ok) {
      const errorData = await unipileResponse.json().catch(() => ({}));
      console.error("Unipile credential creation failed:", errorData);
      throw new Error(errorData.message || 'Failed to create Unipile credential in n8n');
    }

    const unipileResult = await unipileResponse.json();
    localStorage.setItem('unipileCredentialId', unipileResult.id);
    localStorage.setItem('unipileAccountId', unipileAccountId);

    // Add AI credential if model is selected and not skipped
    if (aiModel && aiModel.modelId !== 'skip') {
      const modelConfig = getModelConfig(aiModel.modelId);
      if (!modelConfig) throw new Error('Invalid model configuration');

      // Match n8n's Anthropic credential structure exactly
      const aiCredential = {
        name: modelConfig.n8nCredential.name,
        type: modelConfig.n8nCredential.type,
        data: {
          apiKey: aiModel.config.apiKey
        }
      };

      console.log("Creating AI credential:", aiCredential);

      const aiResponse = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service': 'n8n',
          'x-endpoint': 'api/v1/credentials',
          'x-n8n-api-key': n8nApiKey
        },
        body: JSON.stringify(aiCredential),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        console.error("AI credential creation failed:", errorData);
        throw new Error(errorData.message || 'Failed to create AI credential in n8n');
      }

      const aiResult = await aiResponse.json();
      localStorage.setItem('aiCredentialId', aiResult.id);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating credentials:', error);
    setError(error instanceof Error ? error.message : 'Failed to add credentials to n8n');
    return false;
  }
} 