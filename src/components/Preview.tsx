import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Monitor, MessageSquare, Code2, Play, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { buildPreviewDocument, buildStandaloneBlob } from '../services/buildPreviewDocument';
import type { FileSystem, ProjectMode, PreviewError } from '../types';

interface PreviewProps {
    // Single-file mode
    code: string;
    // Multi-file mode
    projectMode?: ProjectMode;
    files?: FileSystem;
    // Navigation
    activeTab?: 'chat' | 'code' | 'preview';
    onTabChange?: (tab: 'chat' | 'code' | 'preview') => void;
    onTryToFix?: (error: PreviewError) => void;
}

const Preview: React.FC<PreviewProps> = ({
    code,
    projectMode = 'single',
    files = {},
    activeTab,
    onTabChange,
    onTryToFix,
}) => {
    // ── Multi-page navigation & Error state ─────────────────────────────────────────
    const [navHistory, setNavHistory] = useState<string[]>(['index.html']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [runtimeError, setRuntimeError] = useState<PreviewError | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const currentPage = navHistory[historyIndex];
    const canGoBack = historyIndex > 0;
    const canGoForward = historyIndex < navHistory.length - 1;

    // Reset navigation when the project changes (new files loaded)
    const fileKeys = Object.keys(files).sort().join(',');
    useEffect(() => {
        if (projectMode === 'multi') {
            setNavHistory(['index.html']);
            setHistoryIndex(0);
        }
    }, [fileKeys, projectMode]);

    // Clear error state when code or files change
    useEffect(() => {
        setRuntimeError(null);
    }, [code, fileKeys, projectMode, currentPage]);

    // Listen for navigation messages from the iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'preview-error') {
                setRuntimeError(event.data.error);
                return;
            }
            if (event.data?.type !== 'preview-navigate') return;
            const rawHref: string = event.data.href ?? '';
            if (!rawHref) return;

            // Resolve path relative to current page's directory
            const currentDir = currentPage.includes('/')
                ? currentPage.split('/').slice(0, -1).join('/') + '/'
                : '';
            const resolved = normalizePath(
                rawHref.startsWith('/') ? rawHref.slice(1) : currentDir + rawHref
            );

            // Check the file actually exists in the project
            const target = findFile(files, resolved);
            if (!target) {
                console.warn(`[Preview] Navigation target not found: "${resolved}"`);
                return;
            }

            // Push to history, discarding any forward history
            setNavHistory(prev => {
                const base = prev.slice(0, historyIndex + 1);
                return [...base, target];
            });
            setHistoryIndex(prev => prev + 1);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [currentPage, historyIndex, files]);

    // Navigation controls
    const goBack = () => { if (canGoBack) setHistoryIndex(i => i - 1); };
    const goForward = () => { if (canGoForward) setHistoryIndex(i => i + 1); };
    const reload = () => setNavHistory(h => [...h]); // force re-render

    // ── Build srcdoc ────────────────────────────────────────────────────────
    const safeSrcDoc = useMemo(() => {
        if (projectMode === 'multi') {
            if (Object.keys(files).length === 0) return emptyDoc();
            return buildPreviewDocument(files, currentPage);
        }
        if (!code?.trim()) return emptyDoc();
        return code;
    }, [projectMode, files, currentPage, code]);

    // ── Open in new tab ─────────────────────────────────────────────────────
    const handleOpenInNewTab = useCallback(() => {
        const content = projectMode === 'multi'
            ? buildStandaloneBlob(files, currentPage)
            : code;
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [projectMode, files, currentPage, code]);

    const showNavBar = projectMode === 'multi' && Object.keys(files).length > 0;

    return (
        <div className="h-full w-full overflow-hidden rounded-[var(--radius)] border border-[hsl(var(--border))] bg-white flex flex-col">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700">Preview</span>
                    {projectMode === 'multi' && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">multi-file</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Mobile tabs */}
                    {onTabChange && (
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 lg:hidden">
                            <button onClick={() => onTabChange('chat')}
                                className={`p-1.5 rounded transition-all ${activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Chat"><MessageSquare className="h-3.5 w-3.5" /></button>
                            <button onClick={() => onTabChange('code')}
                                className={`p-1.5 rounded transition-all ${activeTab === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Code"><Code2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => onTabChange('preview')}
                                className={`p-1.5 rounded transition-all ${activeTab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Preview"><Play className="h-3.5 w-3.5" /></button>
                        </div>
                    )}
                    <button
                        onClick={handleOpenInNewTab}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        title="Open in new tab"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Open</span>
                    </button>
                </div>
            </div>

            {/* ── Multi-page navigation bar ── */}
            {showNavBar && (
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    {/* Back */}
                    <button
                        onClick={goBack}
                        disabled={!canGoBack}
                        className={`p-1 rounded transition-colors ${canGoBack ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'}`}
                        title="Back"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    {/* Forward */}
                    <button
                        onClick={goForward}
                        disabled={!canGoForward}
                        className={`p-1 rounded transition-colors ${canGoForward ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'}`}
                        title="Forward"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    {/* Reload */}
                    <button
                        onClick={reload}
                        className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors"
                        title="Reload"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    {/* Address bar */}
                    <div className="flex-1 mx-2 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500 font-mono truncate select-none">
                        {currentPage}
                    </div>
                </div>
            )}

            {/* ── iframe ── */}
            <div className="flex-1 relative w-full h-full min-h-0 bg-white">
                {runtimeError && onTryToFix && (
                    <div className="absolute bottom-4 left-4 right-4 bg-red-900/95 backdrop-blur-sm text-white p-3 lg:p-4 rounded-xl shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom border border-red-700/50">
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-semibold text-sm mb-1 text-red-200 flex items-center gap-2">
                                <span className="flex h-5 w-5 rounded-full bg-red-800/80 items-center justify-center text-xs">⚠️</span>
                                Runtime Error
                            </h3>
                            <p className="text-xs font-mono opacity-90 truncate" title={runtimeError.message}>
                                {runtimeError.message}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setRuntimeError(null);
                                onTryToFix(runtimeError);
                            }}
                            className="flex-shrink-0 bg-white text-red-900 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-semibold hover:bg-red-50 transition-colors shadow-sm"
                        >
                            Try to Fix
                        </button>
                    </div>
                )}
                
                <iframe
                    ref={iframeRef}
                    key={`${currentPage}::${safeSrcDoc.length}`}
                    srcDoc={safeSrcDoc}
                    title="Preview"
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                />
            </div>
        </div>
    );
};

/** Normalize path: remove leading slash, collapse ./ */
function normalizePath(path: string): string {
    return path
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\//, '')
        // Collapse any .. segments (basic, not spec-level)
        .split('/')
        .reduce<string[]>((acc, seg) => {
            if (seg === '..') acc.pop();
            else if (seg && seg !== '.') acc.push(seg);
            return acc;
        }, [])
        .join('/');
}

/** Find a file in the FileSystem (case-insensitive fallback) */
function findFile(files: FileSystem, path: string): string | null {
    if (files[path] !== undefined) return path;
    const lower = path.toLowerCase();
    const key = Object.keys(files).find(k => k.toLowerCase() === lower);
    return key ?? null;
}

function emptyDoc(): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#999;background:#fafafa">
<p>No preview</p></body></html>`;
}

export default Preview;
