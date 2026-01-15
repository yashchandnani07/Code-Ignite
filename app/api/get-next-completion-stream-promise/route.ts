import { z } from "zod";
import { callGroqAPIStream } from "@/lib/groq";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    console.log("[Streaming API] Starting request");
    const prisma = getPrisma();
    const { messageId, model } = await req.json();

    console.log("[Streaming API] messageId:", messageId, "model:", model);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      console.log("[Streaming API] Message not found");
      return new Response(null, { status: 404 });
    }

    const messagesRes = await prisma.message.findMany({
      where: { chatId: message.chatId, position: { lte: message.position } },
      orderBy: { position: "asc" },
    });

    console.log("[Streaming API] Found", messagesRes.length, "messages");

    let messages = z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        }),
      )
      .parse(messagesRes);

    if (messages.length > 10) {
      messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
    }

    console.log("[Streaming API] Calling Groq with model:", model);

    const response = await callGroqAPIStream({
      model,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      temperature: 0.2,
      max_tokens: 4000,
    });

    console.log("[Streaming API] Got Groq response, status:", response.status);

    // Return with proper streaming headers for Vercel
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error("[Streaming API] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}

// Comment out the Edge runtime directive to use Node.js runtime instead
// export const runtime = "edge";
export const maxDuration = 45;
export const dynamic = 'force-dynamic';
