/**
 * OpenRouter API utilities
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Get the OpenRouter API key from environment variables
 */
function getOpenRouterKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
}

/**
 * Create headers for OpenRouter API requests
 */
function createOpenRouterHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://code-ignite.vercel.app",
        "X-Title": "Code Ignite",
    };

    const key = getOpenRouterKey();

    // Debug logging
    if (!key) {
        console.error("[OpenRouter] API key not found! Available env vars:", Object.keys(process.env).filter(k => k.includes('OPEN')));
    } else {
        console.log("[OpenRouter] API key found:", key.substring(0, 10) + "...");
    }

    if (key) {
        headers["Authorization"] = `Bearer ${key}`;
    }

    return headers;
}

/**
 * Make a request to OpenRouter API
 */
export async function callOpenRouterAPI(
    body: any,
    options: {
        timeout?: number;
    } = {}
): Promise<Response> {
    const { timeout = 30000 } = options;
    const headers = createOpenRouterHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
                ...body,
                provider: {
                    allow_fallbacks: true,
                    require_parameters: false,
                    data_collection: "allow"
                }
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenRouter API error: ${response.status}`, errorText);
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('OpenRouter API request timed out');
        }
        throw error;
    }
}

/**
 * Make a streaming request to OpenRouter API
 */
export async function callOpenRouterAPIStream(body: any): Promise<Response> {
    // Ensure stream is set to true in body
    const requestBody = { ...body, stream: true };
    return callOpenRouterAPI(requestBody);
}

/**
 * Make a non-streaming (synchronous) request to OpenRouter API
 */
export async function callOpenRouterAPISync(body: any): Promise<Response> {
    // Ensure stream is set to false in body
    const requestBody = { ...body, stream: false };
    return callOpenRouterAPI(requestBody);
}
