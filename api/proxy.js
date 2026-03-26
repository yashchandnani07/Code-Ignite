import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors({ origin: '*' }));

// Vercel serverless function body parsing size limit
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

// Also apply express.json() for local Vite dev testing since Vite doesn't auto-parse
app.use(express.json({ limit: '10mb' }));

app.all(/^\/api\/proxy(.*)/, async (req, res) => {
    try {
        const targetUrlBase = req.headers['x-target-url'];
        if (!targetUrlBase) {
            return res.status(400).json({ error: 'Missing x-target-url header' });
        }

        // Get the remaining path after /api/proxy
        // req.originalUrl could be /api/proxy/completions, so pathRemaining = /completions
        // Use URL object to safely append paths without corrupting query strings
        const urlObj = new URL(targetUrlBase);
        const [originalPath, originalQuery] = req.originalUrl.split('?');
        const pathRemaining = originalPath.replace(/^\/api\/proxy/, '');
        
        urlObj.pathname = urlObj.pathname.replace(/\/$/, '') + pathRemaining;
        if (originalQuery) {
            urlObj.search = originalQuery; // Append any query parameters
        }
        
        const targetUrl = urlObj.toString();

        const fetchOptions = {
            method: req.method,
            headers: { ...req.headers },
        };

        // Remove proxy-specific and problematic headers
        delete fetchOptions.headers['x-target-url'];
        delete fetchOptions.headers['host'];
        delete fetchOptions.headers['connection'];
        delete fetchOptions.headers['content-length'];

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            if (req.body && Object.keys(req.body).length > 0) {
                fetchOptions.body = JSON.stringify(req.body);
            } else {
                fetchOptions.body = req;
            }
        }

        const response = await fetch(targetUrl, fetchOptions);

        res.status(response.status);
        
        response.headers.forEach((value, name) => {
            // Remove encoding headers since Node-fetch handles decoding automatically,
            // and we don't want to double-compress or supply mismatching headers to the browser.
            const lowerName = name.toLowerCase();
            if (lowerName !== 'content-encoding' && lowerName !== 'transfer-encoding') {
                res.setHeader(name, value);
            }
        });

        if (response.body) {
            response.body.pipe(res);
        } else {
            res.end();
        }
    } catch (error) {
        console.error('[proxy error]', error);
        res.status(500).json({ error: 'Proxy implementation error: ' + error.message });
    }
});

export default app;
