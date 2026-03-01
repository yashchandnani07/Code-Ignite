import express from 'express';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));

// Handle multipart/form-data for audio uploads
// Use memory storage since this is a serverless function and doing it in memory is fast
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for audio files
    }
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.error("WARNING: GROQ_API_KEY environment variable is missing.");
}

app.post('/api/stt', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No audio file provided.' });
        }

        const audioBuffer = req.file.buffer;

        // Prepare the payload for Groq
        const formData = new FormData();
        // The API requires a filename extension so it knows the format
        formData.append('file', audioBuffer, {
            filename: 'audio.webm',
            contentType: 'audio/webm'
        });
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'json');

        // Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                // Let form-data automatically calculate boundaries and content type
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API Error: ${errText}`);
        }

        const data = await response.json();

        // Return the transcribed text
        res.status(200).json({ success: true, text: data.text });

    } catch (error) {
        console.error('STT Proxy Error:', error);
        res.status(500).json({ success: false, error: error.message || 'An internal server error occurred while transcribing.' });
    }
});

export default app;
