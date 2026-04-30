import type { FileSystem } from '../types';

/**
 * Builds a single, self-contained HTML document suitable for the Preview iframe.
 *
 * It stitches local CSS and JS directly into the HTML string, and rewrites
 * internal <a href> tags to use onclick handlers that postMessage back to React.
 * This completely prevents the iframe sandbox from attempting native navigation.
 * 
 * CRITICAL: This function ONLY mutates the generated output string. The original
 * `files` object remains untouched, so zip downloads export standard HTML.
 */
export function buildPreviewDocument(
    files: FileSystem,
    entryPoint: string = 'index.html'
): string {
    return compileDocument(files, entryPoint, 'iframe');
}

/**
 * Builds a self-sufficient HTML Blob string for the "Open in new tab" window.
 * 
 * It injects a tiny router and the entire virtual filesystem into the page.
 * Internal links are rewritten to call the local router, which generates a NEW
 * Blob URL on the fly and navigates to it, providing native Back/Forward
 * capabilities in the new tab without needing a server.
 */
export function buildStandaloneBlob(
    files: FileSystem,
    entryPoint: string = 'index.html'
): string {
    return compileDocument(files, entryPoint, 'blob');
}

export function instrumentPreviewDocument(html: string): string {
    return injectIframeBridge(html);
}

type CompileMode = 'iframe' | 'blob';

function compileDocument(
    files: FileSystem,
    entryPoint: string,
    mode: CompileMode
): string {
    const normalizedEntry = normalizePath(entryPoint);
    const baseHtml = files[normalizedEntry] ?? findCaseInsensitive(files, normalizedEntry);

    if (baseHtml === null || baseHtml === undefined) {
        return buildErrorDocument(`Page not found: "${entryPoint}"`);
    }

    let html = baseHtml;

    // --- 1. Inline local <link rel="stylesheet"> ---
    html = html.replace(
        /<link(\s[^>]*?)rel=(["'])stylesheet\2([^>]*?)href=(["'])([^"']+)\4([^>]*?)\/?>/gi,
        (match, _b1, _q1, _b2, _q2, href, _b3) => {
            if (isExternal(href)) return match;
            const content = resolveFile(files, href, normalizedEntry);
            if (content === null) return `<!-- Missing CSS: ${href} -->`;
            return `<style>/* ${href} */\n${content}</style>`;
        }
    );

    // Handle href-before-rel variant
    html = html.replace(
        /<link(\s[^>]*?)href=(["'])([^"']+)\2([^>]*?)rel=(["'])stylesheet\5([^>]*?)\/?>/gi,
        (match, _b1, _q1, href, _b2, _q2, _b3) => {
            if (isExternal(href)) return match;
            const content = resolveFile(files, href, normalizedEntry);
            if (content === null) return `<!-- Missing CSS: ${href} -->`;
            return `<style>/* ${href} */\n${content}</style>`;
        }
    );

    // --- 2. Inline local <script src="..."> ---
    html = html.replace(
        /<script(\s[^>]*?)src=(["'])([^"']+)\2([^>]*?)>\s*<\/script>/gi,
        (match, b1, _q1, src, b2) => {
            if (isExternal(src)) return match;
            const content = resolveFile(files, src, normalizedEntry);
            if (content === null) return `<!-- Missing JS: ${src} -->`;
            // Note: keeping the original attributes (like type="module")
            return `<script${b1}${b2}>/* ${src} */\n${content}<\/script>`;
        }
    );

    // --- 3. Rewrite local <a href="..."> for virtual routing ---
    // We do NOT modify the original file content. We only modify this output string.
    html = html.replace(
        /<a(\s[^>]*?)href=(["'])([^"']+)\2([^>]*?)>/gi,
        (match, b1, q, href, b2) => {
            if (isExternal(href) || href.startsWith('#')) return match;

            const resolved = resolveHref(normalizedEntry, href);
            if (!resolved) return match;

            if (mode === 'iframe') {
                // PostMessage to React
                return `<a${b1}href=${q}${href}${q}${b2} onclick="event.preventDefault(); window.parent.postMessage({ type: 'preview-navigate', href: '${resolved}' }, '*');">`;
            } else {
                // Blob self-navigation
                return `<a${b1}href=${q}${href}${q}${b2} onclick="event.preventDefault(); window.__CI_NAVIGATE__('${resolved}');">`;
            }
        }
    );

    // --- 3. Inject preview bridge (for iframe mode only) ---
    if (mode === 'iframe') {
        html = injectIframeBridge(html);
    }

    // --- 4. Inject Blob Router (for blob mode only) ---
    if (mode === 'blob') {
        // We inject the entire file system and our compiler function into the blob 
        // string. This allows the blob window to generate its next page locally.
        const filesJson = JSON.stringify(files);
        const filesBase64 = btoa(
            encodeURIComponent(filesJson).replace(/%([0-9A-F]{2})/g, (_, p1) =>
                String.fromCharCode(parseInt(p1, 16))
            )
        );
        const blobRouterScript = `
<script>
function __b64ToUtf8(b64) {
    try {
        var bin = atob(b64);
        var esc = '';
        for (var i = 0; i < bin.length; i++) {
            var h = bin.charCodeAt(i).toString(16);
            esc += '%' + (h.length === 1 ? '0' + h : h);
        }
        return decodeURIComponent(esc);
    } catch (e) {
        try { return atob(b64); } catch (_) { return ''; }
    }
}
var __filesJson = __b64ToUtf8('${filesBase64}');
window.__FILES__ = JSON.parse(__filesJson);
window.__CI_NAVIGATE__ = function(targetPath) {
    var files = window.__FILES__;
    var key = targetPath;
    var html = files[key];
    if (html == null) {
        var lower = key.toLowerCase();
        var ci = Object.keys(files).find(function(k){ return k.toLowerCase() === lower; });
        if (ci) html = files[ci];
    }
    if (html == null && !/\\.html?$/i.test(key) && files[key + '.html']) {
        html = files[key + '.html'];
    }
    if (html == null && /\\/$/.test(key)) {
        var ix = key.replace(/\\/$/, '') + '/index.html';
        if (files[ix]) html = files[ix];
    }
    if (html == null) {
        alert("File not found in project: " + targetPath);
        return;
    }
    
    function resolve(href) {
        var baseDir = targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') + '/' : '';
        var res = baseDir + href;
        res = res.replace(/\\\\/g, '/').replace(/^\\.\\//, '').replace(/^\\//, '');
        return res;
    }
    
    function isExt(url) { return /^(https?:|\\/\\/|data:|blob:|mailto:|tel:)/.test(url); }
    
    // CSS
    html = html.replace(/<link(\\s[^>]*?)rel=(["'])stylesheet\\2([^>]*?)href=(["'])([^"']+)\\4([^>]*?)\\/?>/gi, function(m, b1, q1, b2, q2, href, b3) {
        if (isExt(href)) return m;
        var r = resolve(href);
        return window.__FILES__[r] ? '<style>/* ' + href + ' */\\n' + window.__FILES__[r] + '</style>' : m;
    });
    html = html.replace(/<link(\\s[^>]*?)href=(["'])([^"']+)\\2([^>]*?)rel=(["'])stylesheet\\5([^>]*?)\\/?>/gi, function(m, b1, q1, href, b2, q2, b3) {
        if (isExt(href)) return m;
        var r = resolve(href);
        return window.__FILES__[r] ? '<style>/* ' + href + ' */\\n' + window.__FILES__[r] + '</style>' : m;
    });
    
    // JS
    html = html.replace(/<script(\\s[^>]*?)src=(["'])([^"']+)\\2([^>]*?)>\\s*<\\/script>/gi, function(m, b1, q, src, b2) {
        if (isExt(src)) return m;
        var r = resolve(src);
        return window.__FILES__[r] ? '<script' + b1 + b2 + '>/* ' + src + ' */\\n' + window.__FILES__[r] + '<\\/script>' : m;
    });
    
    // A tags (recursive routing)
    html = html.replace(/<a(\\s[^>]*?)href=(["'])([^"']+)\\2([^>]*?)>/gi, function(m, b1, q, href, b2) {
        if (isExt(href) || href.startsWith('#')) return m;
        var r = resolve(href);
        return '<a' + b1 + 'href=' + q + href + q + b2 + ' onclick="event.preventDefault(); window.__NAVIGATE__(\\'' + r + '\\');">';
    });
    
    // Navigate to new page
    var blob = new Blob([html], { type: 'text/html' });
    window.location.href = URL.createObjectURL(blob);
};
</script>`;

        if (/<\/head>/i.test(html)) {
            html = html.replace(/<\/head>/i, `${blobRouterScript}\n</head>`);
        } else {
            html = blobRouterScript + '\n' + html;
        }
    }

    return html;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function resolveHref(basePage: string, href: string): string | null {
    if (isExternal(href)) return null;
    const baseDir = basePage.includes('/') ? basePage.split('/').slice(0, -1).join('/') + '/' : '';
    return normalizePath(baseDir + href);
}

function resolveFile(
    files: FileSystem,
    href: string,
    currentPage: string
): string | null {
    const resolved = resolveHref(currentPage, href);
    if (!resolved) return null;

    if (files[resolved] !== undefined) return files[resolved];

    const found = findCaseInsensitive(files, resolved);
    if (found !== null) return found;

    console.warn(`[buildPreviewDocument] Not found: "${href}" (resolved: ${resolved})`);
    return null;
}

function normalizePath(path: string): string {
    return path
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\//, '')
        .split('/')
        .reduce<string[]>((acc, seg) => {
            if (seg === '..') acc.pop();
            else if (seg && seg !== '.') acc.push(seg);
            return acc;
        }, [])
        .join('/');
}

function findCaseInsensitive(files: FileSystem, path: string): string | null {
    const lower = path.toLowerCase();
    const key = Object.keys(files).find(k => k.toLowerCase() === lower);
    return key !== undefined ? files[key] : null;
}

function isExternal(url: string): boolean {
    return /^(https?:|\/\/|data:|blob:|mailto:|tel:)/i.test(url);
}

function injectIframeBridge(html: string): string {
    const bridgeScript = `
<script>
(function() {
    var postToParent = function(payload) {
        window.parent.postMessage(payload, '*');
    };

    window.onerror = function(msg, url, line, col, error) {
        postToParent({
            type: 'preview-error',
            error: {
                message: String(msg),
                line: typeof line === 'number' ? line : undefined,
                col: typeof col === 'number' ? col : undefined,
                stack: error ? error.stack : undefined
            }
        });
    };

    window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason;
        postToParent({
            type: 'preview-error',
            error: {
                message: reason ? String(reason.message || reason) : 'Unhandled Rejection',
                stack: reason && typeof reason === 'object' ? reason.stack : undefined
            }
        });
    });

    var originalConsoleError = console.error;
    console.error = function() {
        var args = Array.prototype.slice.call(arguments);
        postToParent({
            type: 'preview-error',
            error: {
                message: args.map(function(arg) { return typeof arg === 'string' ? arg : String(arg); }).join(' ')
            }
        });
        originalConsoleError.apply(console, args);
    };
})();
</script>`;

    if (/<head>/i.test(html)) {
        return html.replace(/<head>/i, `<head>\n${bridgeScript}`);
    }
    if (/<html>/i.test(html)) {
        return html.replace(/<html>/i, `<html>\n<head>${bridgeScript}</head>`);
    }
    return bridgeScript + '\n' + html;
}

function buildErrorDocument(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Preview Error</title>
<style>
  body { display:flex; align-items:center; justify-content:center; height:100vh;
         font-family:sans-serif; background:#0f0f0f; color:#f87171; margin:0; }
  .box { text-align:center; padding:2rem; border:1px solid #3f3f46; border-radius:12px;
         background:#18181b; max-width:480px; }
  h2 { margin:0 0 0.5rem; font-size:1.2rem; }
  p  { margin:0; font-size:0.875rem; color:#a1a1aa; }
</style></head>
<body>
  <div class="box">
    <h2>⚠ Preview Error</h2>
    <p>${message}</p>
  </div>
</body></html>`;
}
