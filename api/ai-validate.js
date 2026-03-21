import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { OpenRouter } from '@openrouter/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '256kb' }));

app.post('/api/ai/validate', async (req, res) => {
    try {
        const { provider, apiKey, model, baseUrl } = req.body || {};

        if (!provider || !apiKey || !model) {
            return res.status(400).json({
                valid: false,
                error: 'Missing provider, API key, or model.',
            });
        }

        if (provider === 'Google AI') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const gm = genAI.getGenerativeModel({ model });
            await gm.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                generationConfig: { maxOutputTokens: 5 },
            });
        } else if (provider === 'Claude') {
            const client = new Anthropic({ apiKey });
            await client.messages.create({
                model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'ping' }],
            });
        } else if (provider === 'Openrouter' || provider === 'OpenRouter') {
            const openrouter = new OpenRouter({ apiKey });
            await openrouter.callModel({
                model,
                input: 'ping',
                maxOutputTokens: 1,
            });
        } else if (provider === 'OpenAI-compatible') {
            if (!baseUrl) {
                return res.status(400).json({
                    valid: false,
                    error: 'Base URL is required for OpenAI-compatible providers.',
                });
            }
            const client = new OpenAI({ apiKey, baseURL: baseUrl });
            await client.completions.create({
                model,
                prompt: 'ping',
                max_tokens: 1,
            });
        } else if (provider === 'Openai' || provider === 'OpenAI') {
            const client = new OpenAI({ apiKey, baseURL: 'https://api.openai.com/v1' });
            await client.chat.completions.create({
                model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'ping' }],
            });
        } else {
            return res.status(400).json({
                valid: false,
                error: `Unsupported provider for validation: ${provider}`,
            });
        }

        return res.json({ valid: true });
    } catch (error) {
        const message = error?.message || 'Validation failed';
        return res.status(400).json({ valid: false, error: message });
    }
});

export default app;
