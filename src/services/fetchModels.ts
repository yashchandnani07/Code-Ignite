/**
 * Live model fetching service.
 * Fetches the latest available models from each AI provider's API.
 * Falls back to the hardcoded list silently on any error.
 */

import type { ApiProvider, ModelOption } from '../types';
import { AI_MODELS } from '../constants/models';

// Models to always exclude (embeddings, legacy, fine-tuning helpers, etc.)
const EXCLUDE_PATTERNS = [
    /embed/i, /vision/i, /tts/i, /whisper/i, /dall/i, /moderat/i,
    /babbage/i, /davinci/i, /curie/i, /ada/i, /instruct/i,
    /ft:/i, /\-001$/, /\-002$/,
];

function isUsableModel(id: string): boolean {
    return !EXCLUDE_PATTERNS.some(p => p.test(id));
}

// ── Google AI ─────────────────────────────────────────────────────────────────
async function fetchGoogleModels(apiKey: string): Promise<ModelOption[]> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`
    );
    if (!res.ok) throw new Error('Google AI models fetch failed');
    const data = await res.json() as { models?: { name: string; displayName?: string; description?: string; supportedGenerationMethods?: string[] }[] };

    return (data.models ?? [])
        .filter(m =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            isUsableModel(m.name)
        )
        .map(m => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', ''),
            description: m.description?.slice(0, 80) || '',
        }))
        .sort((a, b) => b.id.localeCompare(a.id)); // newest first
}

// ── OpenRouter ────────────────────────────────────────────────────────────────
async function fetchOpenRouterModels(): Promise<ModelOption[]> {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('OpenRouter models fetch failed');
    const data = await res.json() as { data?: { id: string; name?: string; description?: string; context_length?: number }[] };

    return (data.data ?? [])
        .filter(m => isUsableModel(m.id))
        .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
        .slice(0, 40)
        .map(m => ({
            id: m.id,
            name: m.name || m.id,
            description: `${m.context_length ? (m.context_length / 1000).toFixed(0) + 'k ctx' : ''}`,
        }));
}

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function fetchOpenAIModels(apiKey: string): Promise<ModelOption[]> {
    const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error('OpenAI models fetch failed');
    const data = await res.json() as { data?: { id: string; created?: number }[] };

    return (data.data ?? [])
        .filter(m => /^gpt/i.test(m.id) && isUsableModel(m.id))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
        .map(m => ({ id: m.id, name: m.id, description: '' }));
}

// ── Claude (Anthropic) — no public CORS-safe models list, use curated list ───
const CLAUDE_MODELS: ModelOption[] = [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Most capable' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best code & reasoning' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast & efficient' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Deep reasoning' },
];

// ── OpenAI-compatible — use baseUrl + /models ─────────────────────────────────
async function fetchCompatibleModels(apiKey: string, baseUrl: string): Promise<ModelOption[]> {
    const targetUrl = baseUrl.replace(/\/$/, '') + '/models';
    const proxyUrl = `${window.location.origin}/api/proxy`;
    const res = await fetch(proxyUrl, {
        headers: { 
            Authorization: `Bearer ${apiKey}`,
            'x-target-url': targetUrl,
        },
    });
    if (!res.ok) throw new Error('OpenAI-compatible models fetch failed');
    const data = await res.json() as { data?: { id: string }[] };
    const rawModels = (data.data ?? []).map(m => ({ id: m.id, name: m.id, description: '' }));
    
    // Some providers (like NVIDIA) might return duplicate entries. Deduplicate by ID.
    const uniqueModels = Array.from(new Map(rawModels.map(m => [m.id, m])).values());
    return uniqueModels;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface FetchModelsResult {
    models: ModelOption[];
    fromApi: boolean; // true = live data, false = fell back to static list
}

/**
 * Fetch the latest models for the given provider.
 * Always resolves (never throws) — returns static fallback on any error.
 */
export async function fetchLatestModels(
    provider: ApiProvider,
    apiKey: string,
    baseUrl?: string,
): Promise<FetchModelsResult> {
    try {
        let models: ModelOption[];

        switch (provider) {
            case 'Google AI':
                if (!apiKey) throw new Error('No API key');
                models = await fetchGoogleModels(apiKey);
                break;
            case 'OpenRouter':
                models = await fetchOpenRouterModels();
                break;
            case 'Openai':
                if (!apiKey) throw new Error('No API key');
                models = await fetchOpenAIModels(apiKey);
                break;
            case 'Claude':
                // Return curated list — Anthropic has no CORS-safe models endpoint
                return { models: CLAUDE_MODELS, fromApi: false };
            case 'OpenAI-compatible':
                if (!apiKey || !baseUrl) throw new Error('API key and Base URL required');
                models = await fetchCompatibleModels(apiKey, baseUrl);
                break;
            default:
                throw new Error('Unknown provider');
        }

        if (!models.length) throw new Error('Empty model list');
        return { models, fromApi: true };
    } catch (e) {
        console.warn(`[fetchModels] Falling back to static list for ${provider}:`, e);
        return { models: AI_MODELS[provider] ?? [], fromApi: false };
    }
}
