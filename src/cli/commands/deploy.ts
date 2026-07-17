import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { getResolvedConfig } from '../config';
import { ui } from '../ui';
import { readWorkspace } from '../workspace';

const SITE_ID_FILE = '.codeignite-site-id';

/**
 * Handles the deploy command.
 * Supports deploying to Netlify (default) or GitHub Gist.
 */
export async function handleDeploy(options: { provider?: string; forceNew?: boolean }): Promise<void> {
    const config = getResolvedConfig();
    const provider = (options.provider || 'netlify').toLowerCase();

    if (provider === 'netlify') {
        await deployToNetlify(config, options.forceNew);
    } else if (provider === 'gist') {
        await deployToGist(config);
    } else {
        ui.printError(`Unknown deploy provider: "${options.provider}". Supported options: "netlify", "gist".`);
    }
}

/**
 * Deploys the workspace to Netlify using their API.
 */
async function deployToNetlify(config: any, forceNew?: boolean): Promise<void> {
    const token = config.netlifyToken;
    if (!token) {
        ui.printError('Netlify Personal Access Token is missing. Run "codeignite login" or set NETLIFY_AUTH_TOKEN in your environment.');
        return;
    }

    const currentDir = process.cwd();
    const indexFile = path.join(currentDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
        ui.printError(`Could not find "index.html" in the current directory: ${currentDir}.`);
        return;
    }

    const spinner = ui.createSpinner('Bundling project files...');
    spinner.start();

    try {
        const files = readWorkspace(currentDir);
        const zip = new JSZip();

        // Standard headers config for Netlify MIME types
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

        // Add files
        Object.entries(files).forEach(([relPath, content]) => {
            zip.file(relPath, content);
        });

        if (!files['_headers']) {
            zip.file('_headers', headersContent);
        }

        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        spinner.text = 'Resolving Netlify site...';

        const siteIdFile = path.join(currentDir, SITE_ID_FILE);
        let siteId = (!forceNew && fs.existsSync(siteIdFile)) ? fs.readFileSync(siteIdFile, 'utf8').trim() : null;
        let deployUrl = '';

        if (!siteId) {
            spinner.text = 'Creating new Netlify site...';
            const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: `code-ignite-cli-${Date.now()}` })
            });

            if (!siteResponse.ok) {
                const errText = await siteResponse.text();
                throw new Error(`Netlify Create Site failed: ${errText}`);
            }

            const siteData = await siteResponse.json() as any;
            siteId = siteData.id;
            deployUrl = siteData.ssl_url || siteData.url;
            
            // Save siteId locally for future incremental deploys
            if (siteId) {
                fs.writeFileSync(siteIdFile, siteId, 'utf8');
            }
        } else {
            // Get existing site URL
            const siteInfoRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (siteInfoRes.ok) {
                const siteInfo = await siteInfoRes.json() as any;
                deployUrl = siteInfo.ssl_url || siteInfo.url;
            }
        }

        spinner.text = 'Uploading deployment bundle...';
        const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/zip',
            },
            body: zipBuffer as any
        });

        if (!deployResponse.ok) {
            const errText = await deployResponse.text();
            throw new Error(`Netlify Upload Deploy failed: ${errText}`);
        }

        spinner.stop();
        ui.printSuccess('Deployment successful!');
        console.log(`\n  Site ID:     ${ui.colors.dim(siteId || '')}`);
        console.log(`  Live URL:    ${ui.colors.bold.cyan(deployUrl)}\n`);

    } catch (error) {
        spinner.stop();
        ui.printError(`Netlify deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deploys the workspace files to a GitHub Gist.
 */
async function deployGist(config: any): Promise<void> {
    const token = config.githubToken;
    if (!token) {
        ui.printError('GitHub Personal Access Token is missing. Run "codeignite login" or set CODEIGNITE_GITHUB_TOKEN.');
        return;
    }

    const currentDir = process.cwd();
    const files = readWorkspace(currentDir);
    
    if (Object.keys(files).length === 0) {
        ui.printError('No files found to upload.');
        return;
    }

    const spinner = ui.createSpinner('Uploading files to GitHub Gist...');
    spinner.start();

    try {
        const gistFiles: Record<string, { content: string }> = {};
        Object.entries(files).forEach(([relPath, content]) => {
            // Gists don't support directory structures natively, so we flatten path names with slashes
            const filename = relPath.replace(/\//g, '_');
            gistFiles[filename] = { content };
        });

        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Code-Ignite-CLI'
            },
            body: JSON.stringify({
                description: 'Code Ignite Project Export',
                public: true,
                files: gistFiles
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`GitHub Gist API error: ${response.status} ${errText}`);
        }

        const data = await response.json() as any;
        spinner.stop();

        ui.printSuccess('Gist created successfully!');
        console.log(`\n  Gist URL:     ${ui.colors.bold.cyan(data.html_url)}`);
        
        // Find githack raw preview URL if index.html is present
        const indexKey = Object.keys(gistFiles).find(k => k.endsWith('index.html'));
        if (indexKey && data.owner?.login && data.id) {
            const previewUrl = `https://gistcdn.githack.com/${data.owner.login}/${data.id}/raw/${indexKey}`;
            console.log(`  Live Preview: ${ui.colors.green(previewUrl)}\n`);
        }
        console.log();

    } catch (error) {
        spinner.stop();
        ui.printError(`Gist upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Map the method name correctly to prevent resolution issues
async function deployToGist(config: any): Promise<void> {
    return deployGist(config);
}
