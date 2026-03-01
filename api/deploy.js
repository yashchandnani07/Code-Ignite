import express from 'express';
import cors from 'cors';
import JSZip from 'jszip';
import fetch from 'node-fetch';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

import dotenv from 'dotenv';
dotenv.config();

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const NETLIFY_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

if (!NETLIFY_TOKEN) {
    console.error("WARNING: NETLIFY_AUTH_TOKEN environment variable is missing.");
}

app.post('/api/deploy', async (req, res) => {
    try {
        // Rate limiting
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const userRateData = rateLimitMap.get(ip) || { count: 0, firstRequestTime: now };

        if (now - userRateData.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
            userRateData.count = 1;
            userRateData.firstRequestTime = now;
        } else {
            userRateData.count++;
        }
        rateLimitMap.set(ip, userRateData);

        if (userRateData.count > MAX_REQUESTS_PER_WINDOW) {
            return res.status(429).json({ success: false, error: 'Rate limit exceeded. Please wait before deploying again.' });
        }

        // Validate input — support both single-file (legacy) and multi-file (new)
        const { code, files, netlifyToken, siteId: existingSiteId } = req.body;

        if (!code && !files) {
            return res.status(400).json({ success: false, error: 'No content provided.' });
        }

        // Use client-provided token first, fall back to system token
        const authToken = (netlifyToken && netlifyToken.trim()) ? netlifyToken.trim() : NETLIFY_TOKEN;
        if (!authToken) {
            return res.status(400).json({ success: false, error: 'No Netlify token available. Please provide your Netlify access token.' });
        }

        // BUILD ZIP
        const zip = new JSZip();
        const headersContent = [
            '/*',
            '  X-Content-Type-Options: nosniff',
            '',
            '/*.html',
            '  Content-Type: text/html; charset=utf-8',
            '',
            '/*.css',
            '  Content-Type: text/css; charset=utf-8',
            '',
            '/*.js',
            '  Content-Type: application/javascript; charset=utf-8',
        ].join('\n');

        if (files && typeof files === 'object' && Object.keys(files).length > 0) {
            // Multi-file mode — add all files from the FileSystem map
            for (const [path, content] of Object.entries(files)) {
                zip.file(path, content, { binary: false });
            }
            if (!files['_headers']) {
                zip.file('_headers', headersContent);
            }
        } else {
            // Single-file legacy mode
            const sizeInMB = Buffer.byteLength(code, 'utf8') / (1024 * 1024);
            if (sizeInMB > 5) {
                return res.status(413).json({ success: false, error: 'File size too large. Maximum allowed size is 5MB.' });
            }
            zip.file('index.html', code, { binary: false });
            zip.file('_headers', headersContent);
        }

        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        let siteId = existingSiteId;
        let deployUrl;

        // STEP 1: Create a new Netlify site — only if no existing siteId provided
        if (!siteId) {
            const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: `code-ignite-${Date.now()}` })
            });

            if (!siteResponse.ok) {
                throw new Error(`Netlify Error (Create Site): ${await siteResponse.text()}`);
            }
            const siteData = await siteResponse.json();
            siteId = siteData.id;
            deployUrl = siteData.ssl_url;
        } else {
            // Fetch the existing site's URL
            const siteInfoRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (siteInfoRes.ok) {
                const siteInfo = await siteInfoRes.json();
                deployUrl = siteInfo.ssl_url || siteInfo.url;
            }
        }

        // STEP 2: Upload ZIP to deploy (new or existing site)
        const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/zip',
            },
            body: zipBuffer
        });

        if (!deployResponse.ok) {
            const errText = await deployResponse.text();
            throw new Error(`Netlify Error (Upload Zip): ${errText}`);
        }

        res.status(200).json({ success: true, url: deployUrl, previewUrl: deployUrl, siteId });

    } catch (error) {
        console.error('Deploy Proxy Error:', error);
        res.status(500).json({ success: false, error: error.message || 'An internal server error occurred while deploying.' });
    }
});

export default app;
