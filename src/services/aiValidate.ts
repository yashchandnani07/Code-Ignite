import type { ApiProvider } from '../types';

export async function validateApiKey(
    provider: ApiProvider,
    apiKey: string,
    model: string,
    baseUrl?: string,
): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model, baseUrl }),
    });

    const data = await res.json();
    return {
        valid: !!data.valid,
        error: data.error,
    };
}
