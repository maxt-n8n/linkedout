export interface ModelField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'field';
  content?: string;
  placeholder?: string;
  required?: boolean;
  validation?: (value: string) => string | undefined;
}

export interface N8nCredentialConfig {
  type: string;  // This matches n8n's credential type names exactly
  name: string;
  dataMapping: (apiKey: string) => Record<string, any>;
}

export interface ModelConfig {
  id: string;
  name: string;
  company: string;
  icon: string;
  description?: string;
  fields: ModelField[];
  n8nCredential: N8nCredentialConfig;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  {
    id: 'anthropic-sonnet-3.7',
    name: 'Sonnet 3.7',
    company: 'Anthropic',
    icon: '/images/models/anthropic.svg',
    description: 'Anthropic\'s latest Sonnet model',
    n8nCredential: {
      type: 'anthropicApi', // Matches n8n's AnthropicApi.credentials.ts
      name: 'Anthropic API',
      dataMapping: (apiKey: string) => ({
        apiKey: apiKey,
        baseURL: 'https://api.anthropic.com/v1'  // Changed from baseUrl to baseURL
      })
    },
    fields: [
      {
        key: 'apiKey',
        label: 'Anthropic API Key',
        type: 'password',
        placeholder: 'e.g. sk-ant-...',
        required: true,
        validation: (value) => {
          if (!value) return 'API Key is required';
          if (!value.startsWith('sk-ant-')) return 'Invalid API key format';
          return undefined;
        }
      }
    ]
  },
  {
    id: 'openai-gpt4-mini',
    name: 'GPT4o-mini',
    company: 'OpenAI',
    icon: '/images/models/openai.svg',
    description: 'OpenAI\'s GPT-4 optimized model',
    n8nCredential: {
      type: 'openAiApi',  // Matches OpenAI's credential type in n8n
      name: 'OpenAI API',
      dataMapping: (apiKey: string) => ({
        apiKey: apiKey,
        baseURL: 'https://api.openai.com/v1'  // Changed from baseUrl to baseURL
      })
    },
    fields: [
      {
        key: 'apiKey',
        label: 'OpenAI API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true,
        validation: (value) => {
          if (!value) return 'API Key is required';
          if (!value.startsWith('sk-')) return 'Invalid API key format';
          return undefined;
        }
      }
    ]
  },
  {
    id: 'ollama-generic',
    name: 'Self-hosted model',
    company: 'Ollama',
    icon: '/images/models/ollama.svg',
    description: 'An open-source model running on your own machine',
    n8nCredential: {
      type: 'ollamaApi',  // Matches n8n's OllamaApi.credentials.ts
      name: 'Ollama API',
      dataMapping: () => ({
        baseURL: 'http://localhost:11434/api'  // Changed from baseUrl to baseURL
      })
    },
    fields: [
      {
        key: 'info',
        label: 'Model Information',
        type: 'field',
        content: 'Ollama supports a wide range of models. Please refer to the Ollama documentation for more information. Your workflows will have Ollama nodes inserted, but you will need to configure them after setup.'
      }
    ]
  },
  {
    id: 'skip',
    name: 'Decide later',
    company: '',
    icon: '',
    description: 'n8n supports more models than listed',
    n8nCredential: {
      type: 'skip',
      name: 'Skip',
      dataMapping: () => ({})
    },
    fields: [
      {
        key: 'info',
        label: 'Model Information',
        type: 'field',
        content: 'n8n supports many AI models, including OpenAI, Azure OpenAI, Google Gemini & Vertex, Mistral, Groq, Cohere, DeepSeek, Ollama, Hugging Face, OpenRouter, and AWS Bedrock.'
      }
    ]
  }
  

];

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return SUPPORTED_MODELS.find(model => model.id === modelId);
} 