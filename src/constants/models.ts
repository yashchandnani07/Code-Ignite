import type { ApiProvider, ModelOption } from '../types';

/**
 * Available AI models by provider.
 * The first entry for each provider is the default model.
 */
export const AI_MODELS: Record<ApiProvider, ModelOption[]> = {
    'Google AI': [
        {
            id: 'gemini-2.5-flash-lite',
            name: 'Gemini 2.5 Flash Lite',
            description: 'Ultra-fast and efficient',
        },
        {
            id: 'gemini-3-flash-preview',
            name: 'Gemini 3 Flash (Preview)',
            description: 'Latest Gemini 3',
        },
        {
            id: 'gemini-2.0-flash',
            name: 'Gemini 2.0 Flash',
            description: 'Fast and capable',
        },
        {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: 'Most capable Google model',
        },
    ],
    OpenRouter: [
        {
            id: 'google/gemini-2.0-flash-exp:free',
            name: 'Gemini 2.0 Flash (via OpenRouter)',
            description: 'Free tier available',
        },
        {
            id: 'anthropic/claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet (via OpenRouter)',
            description: 'Best for complex reasoning',
        },
        {
            id: 'openai/gpt-4o',
            name: 'GPT-4o (via OpenRouter)',
            description: 'Most capable (Expensive)',
        },
    ],
    Openai: [
        {
            id: 'gpt-5-codex',
            name: 'GPT-5 Codex',
            description: 'Fast, cost-effective general model',
        },
        {
            id: 'gpt-5-mini',
            name: 'GPT-5 Mini',
            description: 'Flagship OpenAI model',
        },
    ],
    Claude: [
        {
            id: 'claude-opus-4-5',
            name: 'Claude Opus 4.5',
            description: 'Most capable Anthropic model',
        },
        {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            description: 'Best for deep reasoning and code',
        },
    ],
    'OpenAI-compatible': [
        {
            id: 'custom-model',
            name: 'Custom OpenAI-style Model',
            description: 'Use the model ID from your OpenAI-compatible provider',
        },
    ],
};

/** Default provider — Google AI with user's own API key (BYOK) */
export const DEFAULT_PROVIDER: ApiProvider = 'Google AI';

export const getDefaultModel = (provider: ApiProvider | string): string => {
    // Normalize in case of old localStorage values
    const normalized = provider === 'Openrouter' ? 'OpenRouter' : provider as ApiProvider;
    return AI_MODELS[normalized]?.[0]?.id || '';
};
