"use server";

import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { callGroqAPISync } from "@/lib/groq";
import { notFound } from "next/navigation";

export async function createChat(
  prompt: string,
  model: string,
  quality: "high" | "low",
  screenshotUrl: string | undefined,
) {
  const prisma = getPrisma();
  const chat = await prisma.chat.create({
    data: {
      model,
      quality,
      prompt,
      title: "",
      shadcn: true,
    },
  });

  async function fetchTitle() {
    try {
      const completion = await callGroqAPISync({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content:
              "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const title = completion.choices[0].message?.content || prompt;
      return title;
    } catch (e) {
      console.error("Failed to fetch title:", e);
      return "New Project";
    }
  }

  async function fetchTopExample() {
    try {
      const completion = await callGroqAPISync({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `You are a helpful bot. Given a request for building an app, you match it to the most similar example provided. If the request is NOT similar to any of the provided examples, return "none". Here is the list of examples, ONLY reply with one of them OR "none":

          - landing page
          - blog app
          - quiz app
          - pomodoro timer
          `,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const mostSimilarExample = completion.choices[0].message?.content?.toLowerCase().trim() || "none";

      // Validate and normalize the response
      const validExamples = ["landing page", "blog app", "quiz app", "pomodoro timer"];
      const normalizedExample = validExamples.includes(mostSimilarExample) ? mostSimilarExample : "none";

      return normalizedExample;
    } catch (e) {
      console.error("Failed to fetch top example:", e);
      return "none";
    }
  }

  const [title, mostSimilarExample] = await Promise.all([
    fetchTitle(),
    fetchTopExample(),
  ]);

  let fullScreenshotDescription;
  if (screenshotUrl) {
    try {
      const completion = await callGroqAPISync({
        model: "openai/gpt-oss-120b",
        temperature: 0.2,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: screenshotToCodePrompt },
              {
                type: "image_url",
                image_url: {
                  url: screenshotUrl,
                },
              },
            ],
          },
        ],
      });

      fullScreenshotDescription = completion.choices[0].message?.content;
    } catch (e) {
      console.error("Failed to analyze screenshot:", e);
      // Continue without screenshot description on error
    }
  }

  let userMessage: string;
  try {
    if (quality === "high") {
      const completion = await callGroqAPISync({
        model: "qwen/qwen3-32b",
        messages: [
          {
            role: "system",
            content: softwareArchitectPrompt,
          },
          {
            role: "user",
            content: fullScreenshotDescription
              ? fullScreenshotDescription + prompt
              : prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      });

      userMessage = completion.choices[0].message?.content ?? prompt;
    } else if (fullScreenshotDescription) {
      userMessage =
        prompt +
        "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
        fullScreenshotDescription;
    } else {
      userMessage = prompt;
    }
  } catch (e) {
    console.error("Failed to generate user message:", e);
    // Fallback to strict screenshot mode or just raw prompt
    if (fullScreenshotDescription) {
      userMessage = prompt + "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " + fullScreenshotDescription;
    } else {
      userMessage = prompt;
    }
  }

  let newChat = await prisma.chat.update({
    where: {
      id: chat.id,
    },
    data: {
      title,
      messages: {
        createMany: {
          data: [
            {
              role: "system",
              content: getMainCodingPrompt(mostSimilarExample),
              position: 0,
            },
            { role: "user", content: userMessage, position: 1 },
          ],
        },
      },
    },
    include: {
      messages: true,
    },
  });

  const lastMessage = newChat.messages
    .sort((a, b) => a.position - b.position)
    .at(-1);
  if (!lastMessage) throw new Error("No new message");

  return {
    chatId: chat.id,
    lastMessageId: lastMessage.id,
  };
}

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: true },
  });
  if (!chat) notFound();

  const maxPosition = Math.max(...chat.messages.map((m) => m.position));

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      position: maxPosition + 1,
      chatId,
    },
  });

  return newMessage;
}
