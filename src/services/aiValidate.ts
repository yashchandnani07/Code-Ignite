import type { ApiProvider } from '../types';

export async function validateApiKey(
    provider: ApiProvider,
    apiKey: string,
    model: string,
    baseUrl?: string,
): Promise<{ valid: boolean; error?: string }> {
    try {
        switch (provider) {
            case 'Google AI': {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (res.status === 400 || res.status === 401 || res.status === 403) {
                    throw new Error('Invalid API key for Google AI.');
                }
                break;
            }
            case 'OpenRouter': {
                const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.status === 401) {
                    throw new Error('Invalid API key for OpenRouter.');
                }
                break;
            }
            case 'Openai': {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.status === 401) {
                    throw new Error('Invalid API key for OpenAI.');
                }
                break;
            }
            case 'Claude': {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: model || 'claude-3-haiku-20240307',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'Hello' }]
                    })
                });
                if (res.status === 401) {
                    throw new Error('Invalid API key for Claude.');
                }
                break;
            }
            case 'OpenAI-compatible': {
                if (!baseUrl) throw new Error('Base URL required for OpenAI-compatible endpoint.');
                const url = baseUrl.replace(/\/$/, '') + '/models';
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.status === 401 || res.status === 403) {
                    throw new Error('Invalid API key for custom endpoint.');
                }
                break;
            }
        }
        return { valid: true };
    } catch (err: any) {
        // If it's a TypeError (CORS or network issue down), we'll assume valid to not block the user,
        // unless it's an explicit error we threw above.
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            console.warn(`[validateApiKey] Network or CORS error validating ${provider}, assuming valid.`);
            return { valid: true };
        }
        return { valid: false, error: err?.message || 'Invalid API key or model.' };
    }
}
