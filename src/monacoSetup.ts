/**
 * Monaco Editor Setup - self-hosted with proper web workers
 *
 * Problem: @monaco-editor/react loads Monaco from cdn.jsdelivr.net by default.
 * Brave/Comet block this CDN. Even with local Monaco, the workers fail because
 * rolldown-vite's dep optimizer can't handle ?worker imports from node_modules.
 *
 * Fix: Use `new URL() + new Worker()` pattern which Vite handles natively,
 * and exclude monaco-editor from the dep optimizer entirely.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure workers using the `new URL()` pattern.
// Vite resolves these at build time into proper worker bundle URLs.
self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
        if (label === 'json') {
            return new Worker(
                new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
                { type: 'module' }
            );
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new Worker(
                new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
                { type: 'module' }
            );
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new Worker(
                new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
                { type: 'module' }
            );
        }
        if (label === 'typescript' || label === 'javascript') {
            return new Worker(
                new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
                { type: 'module' }
            );
        }
        // Default editor worker (handles diff, formatting, etc.)
        return new Worker(
            new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
            { type: 'module' }
        );
    },
};

// Use our local Monaco instance instead of CDN
loader.config({ monaco });
