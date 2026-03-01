import type { FileSystem } from '../types';

export interface DeployResult {
    success: boolean;
    url?: string;
    previewUrl?: string;
    siteId?: string;
    error?: string;
}

interface NetlifyDeployOptions {
    /** Multi-file project files. If provided, deploys all files instead of single `code`. */
    files?: FileSystem;
    /** User's own Netlify personal access token. Falls back to system token if omitted. */
    netlifyToken?: string;
    /** Force creating a new site even if a previous siteId is stored. */
    forceNew?: boolean;
}

const NETLIFY_SITE_KEY = 'netlify_site_id';

/** Clears the stored siteId so the next deploy creates a fresh Netlify site. */
export function clearNetlifySiteId(): void {
    localStorage.removeItem(NETLIFY_SITE_KEY);
}

/**
 * Deploy to Netlify via the secure backend proxy.
 * Automatically reuses the same site on re-deploys (stored in localStorage).
 * Pass `forceNew: true` to create a brand new site and replace the stored id.
 */
export async function deployToNetlify(
    code: string,
    options: NetlifyDeployOptions = {}
): Promise<DeployResult> {
    try {
        const { files, netlifyToken, forceNew = false } = options;
        const isMultiFile = files && Object.keys(files).length > 0;

        const storedSiteId = forceNew ? null : localStorage.getItem(NETLIFY_SITE_KEY);

        const body: Record<string, unknown> = isMultiFile ? { files } : { code };
        if (netlifyToken?.trim()) body.netlifyToken = netlifyToken.trim();
        if (storedSiteId) body.siteId = storedSiteId;

        const response = await fetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            if (response.status === 429) return { success: false, error: 'Rate limit exceeded. Please wait before deploying again.' };
            if (response.status === 413) return { success: false, error: 'Generated application is too large to deploy.' };
            return { success: false, error: data.error || `Deployment error: ${response.statusText}` };
        }

        // Persist the siteId for future re-deploys
        if (data.siteId) {
            localStorage.setItem(NETLIFY_SITE_KEY, data.siteId);
        }

        return { success: true, url: data.url, previewUrl: data.previewUrl, siteId: data.siteId };
    } catch (error) {
        console.error('Netlify deployment error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred.' };
    }
}

/**
 * Deploy code to GitHub Gist
 * @param code - The HTML code to deploy
 * @param token - GitHub Personal Access Token
 * @param filename - Name of the file (default: index.html)
 * @returns DeployResult with gist URL and preview URL
 */
export async function deployToGitHubGist(
    code: string,
    token: string,
    filename: string = 'index.html'
): Promise<DeployResult> {
    try {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                description: 'Created with AI Coder by Goutham Sai',
                public: true,
                files: {
                    [filename]: { content: code }
                }
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: 'Invalid GitHub token. Please check your token in Settings.' };
            }
            if (response.status === 403) {
                return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
            }
            return { success: false, error: `GitHub API error: ${response.status}` };
        }

        const data = await response.json();
        const gistUrl = data.html_url;
        const gistId = data.id;
        const owner = data.owner?.login;

        // Get the raw URL for the HTML file
        const rawUrl = data.files[filename]?.raw_url;

        // Create preview URL using multiple options:
        // 1. gist.githack.com - Production CDN for gists (most reliable)
        // 2. htmlpreview.github.io - Fallback option
        let previewUrl: string | undefined;

        if (owner && gistId) {
            // githack.com production CDN - most reliable for serving gist HTML
            previewUrl = `https://gistcdn.githack.com/${owner}/${gistId}/raw/${filename}`;
        } else if (rawUrl) {
            // Fallback to htmlpreview if we can't construct githack URL
            previewUrl = `https://htmlpreview.github.io/?${rawUrl}`;
        }

        return {
            success: true,
            url: gistUrl,
            previewUrl: previewUrl,
        };
    } catch (error) {
        console.error('GitHub Gist deployment error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Create StackBlitz project URL
 * @param code - The HTML code to embed
 * @returns URL to open in StackBlitz
 */
export function createStackBlitzUrl(_code: string): string {
    // StackBlitz supports opening projects via URL with base64 encoded files
    // For simplicity, we'll use their project creation endpoint
    // Note: StackBlitz doesn't support inline code in URL for HTML projects directly

    // Using StackBlitz's URL-based project creation
    // This opens a new vanilla HTML project with the code
    const baseUrl = 'https://stackblitz.com/edit/web-platform';

    // StackBlitz doesn't support inline code in URL for HTML projects directly,
    // so we'll use their API through a form POST or SDK
    return baseUrl;
}

/**
 * Open code in StackBlitz using their SDK approach (form-based)
 * Returns form data that can be posted
 */
export function createStackBlitzFormData(code: string): { project: object } {
    return {
        project: {
            files: {
                'index.html': code,
            },
            title: 'AI Coder Project',
            description: 'Created with AI Coder by Goutham Sai',
            template: 'html',
        }
    };
}
