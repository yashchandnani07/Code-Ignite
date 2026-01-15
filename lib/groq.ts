import OpenAI from "openai";

export const createGroqClient = () => {
    return new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
    });
};

export async function callGroqAPISync(params: any) {
    const client = createGroqClient();
    const { model, messages, temperature, max_tokens } = params;

    try {
        const completion = await client.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens,
            stream: false,
        });
        return completion;
    } catch (error) {
        console.error("Groq API Error:", error);
        throw error;
    }
}

export async function callGroqAPIStream(params: any) {
    // Using fetch for streaming to easily return a ReadableStream Response
    // compatible with Vercel AI / existing route logic
    const { model, messages, temperature, max_tokens } = params;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    return response;
}
