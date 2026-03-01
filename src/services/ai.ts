/**
 * AI Code Generation Service
 *
 * Handles code generation using multiple AI providers:
 * - Google Generative AI (Gemini) — full multimodal (text, images, PDFs)
 * - Anthropic Claude            — real REST API, with image vision
 * - OpenRouter                  — all models, image vision supported
 * - OpenAI                      — GPT-4o etc., with vision
 * - OpenAI-compatible           — any custom endpoint
 *
 * Features:
 * - Streaming responses for real-time UI updates
 * - Full FileSystem context in multi-file mode (AI sees all files)
 * - Vision support for images across Google AI, Claude, OpenRouter, and OpenAI
 * - Friendly error messages from provider HTTP errors
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import type { ApiProvider, FileAttachment, FileSystem } from '../types';
import { SYSTEM_PROMPT } from './ai/system-prompt';
import { isMultiFileResponse, parseMultiFileResponse } from './ai/parseMultiFile';

// ============================================================
// Types
// ============================================================

type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface ProviderArgs {
    apiKey: string;
    model: string;
    messages: ChatMessage[];
    currentCode: string;
    onChunk: (chunk: string) => void;
    attachments?: FileAttachment[];
    /** Full virtual filesystem for multi-file projects */
    files?: FileSystem;
    projectMode?: 'single' | 'multi';
}

// ============================================================
// Shared Prompt Builder
// ============================================================

/**
 * Builds the final user turn that always accompanies a request.
 * In multi-file mode it inlines all project files so the AI has full context.
 */
function buildUserPrompt(currentCode: string, files?: FileSystem, projectMode?: string): string {
    if (projectMode === 'multi' && files && Object.keys(files).length > 0) {
        const fileList = Object.entries(files)
            .map(([path, content]) => `\n=== FILE: ${path} ===\n${content}`)
            .join('\n');

        return `Current Project Files:\n${fileList}\n\n` +
            `Based on the conversation above, generate the COMPLETE updated project using MODE 3 (MULTI-FILE PROJECT) ` +
            `format unless the user explicitly asks otherwise. Return ONLY the files that changed, using the exact === FILE: path === delimiters.`;
    }

    return `Current Code:\n${currentCode}\n\n` +
        `Based on the conversation above, generate the COMPLETE updated project.\n\n` +
        `Choose the appropriate OUTPUT MODE from the system prompt:\n` +
        `- Prefer MODE 3 (MULTI-FILE PROJECT) for realistic, production-ready websites and apps.\n` +
        `- Use MODE 1 (single HTML file) only when the user explicitly asks for a single file.\n\n` +
        `Always return the full contents of any files you create or modify.`;
}

// ============================================================
// Google Generative AI (Gemini) — full multimodal
// ============================================================

const generateWithGoogleAI = async ({
    apiKey, model, messages, currentCode, onChunk, attachments, files, projectMode,
}: ProviderArgs): Promise<{ code: string; summary: string }> => {
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = model.includes('/')
        ? model.split('/').pop()?.replace(':free', '') || model
        : model;

    const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    });

    const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
    }));

    const chat = generativeModel.startChat({ history });

    // Build multimodal prompt parts
    const promptParts: Part[] = [{ text: buildUserPrompt(currentCode, files, projectMode) }];

    if (attachments?.length) {
        for (const att of attachments) {
            if (att.type === 'image' || att.type === 'pdf') {
                const match = att.content.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    promptParts.push({ inlineData: { mimeType: att.mimeType, data: match[2] } });
                }
            } else if (att.type === 'text') {
                promptParts.push({ text: `\n\n--- Attached File: ${att.name} ---\n${att.content}\n--- End of File ---\n` });
            }
        }
    }

    const result = await chat.sendMessageStream(promptParts);
    let fullContent = '';

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) { fullContent += text; onChunk(text); }
    }

    return processResponse(fullContent);
};

// ============================================================
// Anthropic Claude — real REST implementation with SSE streaming
// ============================================================

const generateWithClaude = async ({
    apiKey, model, messages, currentCode, onChunk, attachments, files, projectMode,
}: ProviderArgs): Promise<{ code: string; summary: string }> => {

    // Build Anthropic-format message list
    type AnthropicContent =
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

    const anthropicMessages: { role: 'user' | 'assistant'; content: string | AnthropicContent[] }[] = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Final user turn — text + optional images
    const finalContent: AnthropicContent[] = [
        { type: 'text', text: buildUserPrompt(currentCode, files, projectMode) },
    ];

    if (attachments?.length) {
        for (const att of attachments) {
            if (att.type === 'image') {
                const match = att.content.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    finalContent.push({
                        type: 'image',
                        source: { type: 'base64', media_type: att.mimeType, data: match[2] },
                    });
                }
            } else if (att.type === 'text') {
                finalContent.push({
                    type: 'text',
                    text: `\n\n--- Attached File: ${att.name} ---\n${att.content}\n--- End of File ---\n`,
                });
            }
        }
    }

    anthropicMessages.push({ role: 'user', content: finalContent });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model,
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: anthropicMessages,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(friendlyProviderError('Claude', response.status, errText));
    }

    // Parse Anthropic SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    if (!reader) throw new Error('No response stream from Anthropic');

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                    const text: string = parsed.delta.text;
                    fullContent += text;
                    onChunk(text);
                }
            } catch { /* skip malformed events */ }
        }
    }

    return processResponse(fullContent);
};

// ============================================================
// OpenAI-compatible — OpenRouter / OpenAI / custom endpoints
// Supports vision via content arrays for image attachments
// ============================================================

const generateWithOpenAICompatible = async (
    { apiKey, model, messages, currentCode, onChunk, attachments, files, projectMode }: ProviderArgs,
    baseURL: string,
): Promise<{ code: string; summary: string }> => {

    const openai = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });

    const userPromptText = buildUserPrompt(currentCode, files, projectMode);

    // Determine if any image attachments exist — use vision content array if so
    const imageAttachments = attachments?.filter(a => a.type === 'image') ?? [];
    const textAttachments = attachments?.filter(a => a.type !== 'image') ?? [];

    let textContext = userPromptText;
    for (const att of textAttachments) {
        if (att.type === 'text') {
            textContext += `\n\n--- Attached File: ${att.name} ---\n${att.content}\n--- End of File ---\n`;
        } else if (att.type === 'pdf') {
            textContext += `\n\n[PDF attached: ${att.name}] — PDF binary content not available for this provider.`;
        }
    }

    type OAIContent =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

    let lastUserContent: string | OAIContent[];

    if (imageAttachments.length > 0) {
        const parts: OAIContent[] = [{ type: 'text', text: textContext }];
        for (const att of imageAttachments) {
            parts.push({ type: 'image_url', image_url: { url: att.content, detail: 'auto' } });
        }
        lastUserContent = parts;
    } else {
        lastUserContent = textContext;
    }

    const stream = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: lastUserContent as string }, // openai types accept string | content[]
        ],
        stream: true,
    }).catch(async (err) => {
        const status = err?.status ?? 0;
        const msg = err?.message ?? String(err);
        throw new Error(friendlyProviderError(baseURL, status, msg));
    });

    let fullContent = '';
    for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) { fullContent += text; onChunk(text); }
    }

    return processResponse(fullContent);
};

// Concrete adapters
const generateWithOpenRouter = (args: ProviderArgs) =>
    generateWithOpenAICompatible(args, 'https://openrouter.ai/api/v1');


const generateWithOpenAI = (args: ProviderArgs) =>
    generateWithOpenAICompatible(args, 'https://api.openai.com/v1');

// ============================================================
// Error Formatting
// ============================================================

function friendlyProviderError(provider: string, status: number, raw: string): string {
    if (status === 401 || (raw.includes('401') && raw.includes('auth'))) {
        return `Invalid API key for ${provider}. Please check your key in Settings.`;
    }
    if (status === 429 || raw.includes('429') || raw.toLowerCase().includes('rate limit')) {
        return `Rate limit hit for ${provider}. Please wait a moment and try again.`;
    }
    if (status === 404 || raw.includes('model_not_found') || raw.includes('does not exist')) {
        return `Model not found on ${provider}. Please select a different model in Settings.`;
    }
    if (status === 402 || raw.includes('insufficient') || raw.includes('credits') || raw.includes('balance')) {
        return `Insufficient credits on ${provider}. Please top up your account.`;
    }
    if (status === 413 || raw.includes('too large') || raw.includes('context length')) {
        return `Request too large for ${provider}. Try clearing chat history or using a shorter prompt.`;
    }
    // Fallback — strip HTML and truncate
    const cleaned = raw.replace(/<[^>]+>/g, '').slice(0, 200);
    return `${provider} error (${status || 'unknown'}): ${cleaned}`;
}

// ============================================================
// Response Processing
// ============================================================

const processResponse = (fullContent: string): { code: string; summary: string } => {
    let cleanedContent = fullContent
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();

    let summary = 'I have updated the code based on your request.';

    if (cleanedContent.includes('---SUMMARY---')) {
        const parts = cleanedContent.split('---SUMMARY---');
        cleanedContent = parts[0].trim();
        summary = parts[1]?.trim() || summary;
    }

    return { code: cleanedContent, summary };
};

// ============================================================
// Public API
// ============================================================

/**
 * Main code generation function.
 * Routes to the correct provider, streams chunks via onChunk,
 * and auto-detects multi-file responses.
 *
 * @param files    - Full FileSystem for multi-file projects (gives AI full context)
 * @param projectMode - 'single' | 'multi' — controls prompt construction
 */
export const generateCodeStream = async (
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    currentCode: string,
    onChunk: (chunk: string) => void,
    provider: ApiProvider = 'Openrouter',
    attachments?: FileAttachment[],
    baseUrlOverride?: string,
    files?: FileSystem,
    projectMode?: 'single' | 'multi',
): Promise<{ code: string; summary: string; files?: FileSystem; deletions?: string[] }> => {
    try {
        const args: ProviderArgs = {
            apiKey, model, messages, currentCode, onChunk, attachments, files, projectMode,
        };

        let raw: { code: string; summary: string };

        switch (provider) {
            case 'Google AI':
                raw = await generateWithGoogleAI(args);
                break;
            case 'Claude':
                raw = await generateWithClaude(args);
                break;
            case 'Openai':
                raw = await generateWithOpenAI(args);
                break;
            case 'OpenAI-compatible':
                if (!baseUrlOverride) {
                    throw new Error('Base URL is required for OpenAI-compatible providers. Set it in Settings.');
                }
                raw = await generateWithOpenAICompatible(args, baseUrlOverride);
                break;
            case 'Openrouter':
            default:
                raw = await generateWithOpenRouter(args);
                break;
        }

        // Auto-detect and parse multi-file responses
        if (isMultiFileResponse(raw.code)) {
            const { files: parsedFiles, deletions, summary } = parseMultiFileResponse(raw.code);
            return { code: '', summary: summary || raw.summary, files: parsedFiles, deletions };
        }

        return raw;
    } catch (error) {
        console.error(`[${provider}] generation error:`, error);
        throw error;
    }
};
