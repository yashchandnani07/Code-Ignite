import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
        } else {
            let baseURL;
            switch (provider) {
                case 'Openai':
                case 'OpenAI':
                    baseURL = 'https://api.openai.com/v1';
                    break;
                case 'Openrouter':
                case 'OpenRouter':
                    baseURL = 'https://openrouter.ai/api/v1';
                    break;
                case 'OpenAI-compatible':
                    if (!baseUrl) {
                        return res.status(400).json({
                            valid: false,
                            error: 'Base URL is required for OpenAI-compatible providers.',
                        });
                    }
                    baseURL = baseUrl;
                    break;
                default:
                    return res.status(400).json({
                        valid: false,
                        error: `Unsupported provider for validation: ${provider}`,
                    });
            }

            const client = new OpenAI({ apiKey, baseURL });
            await client.chat.completions.create({
                model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'ping' }],
            });
        }

        return res.json({ valid: true });
    } catch (error) {
        const message = error?.message || 'Validation failed';
        return res.status(400).json({ valid: false, error: message });
    }
});

export default app;
