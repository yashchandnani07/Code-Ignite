import React, { useState, useCallback, Component } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, Copy, Check, MessageSquare, Play, X, FolderOpen, AlertTriangle } from 'lucide-react';
import type { FileSystem, ProjectMode } from '../types';

// Error boundary
// Catches Monaco crashes (CDN blocked, worker failure, etc.) and shows
// a working textarea so the user isn't staring at a blank screen.
interface EditorErrorBoundaryState { hasError: boolean; errorMsg: string }

class EditorErrorBoundary extends Component<
    { children: React.ReactNode; fallbackCode: string; onChange: (v: string) => void },
    EditorErrorBoundaryState
> {
    state: EditorErrorBoundaryState = { hasError: false, errorMsg: '' };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, errorMsg: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[Monaco Error Boundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border-b border-amber-700/40 text-amber-300 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Editor failed to load. Using plain text mode.</span>
                    </div>
                    <textarea
                        className="flex-1 w-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm resize-none outline-none"
                        value={this.props.fallbackCode}
                        onChange={e => this.props.onChange(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            );
        }
        return this.props.children;
    }
}

// Main component

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    isLoading?: boolean;
    activeTab?: 'chat' | 'code' | 'preview';
    onTabChange?: (tab: 'chat' | 'code' | 'preview') => void;
    // Multi-file mode props
    projectMode?: ProjectMode;
    files?: FileSystem;
    activeFile?: string;
    onFileSelect?: (path: string) => void;
    onFileContentChange?: (path: string, content: string) => void;
    onCloseTab?: (path: string) => void;
    // File tree toggle
    onToggleFileTree?: () => void;
    showFileTree?: boolean;
}

/** Map file extension to Monaco language id */
function getMonacoLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
        html: 'html', css: 'css', js: 'javascript', mjs: 'javascript',
        ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
        json: 'json', md: 'markdown', svg: 'xml', xml: 'xml',
        py: 'python', sh: 'shell', yaml: 'yaml', yml: 'yaml',
    };
    return map[ext] ?? 'plaintext';
}

const CodeEditorComponent: React.FC<CodeEditorProps> = ({
    code, onChange, isLoading: _isLoading, activeTab, onTabChange,
    projectMode = 'single', files = {}, activeFile = 'index.html',
    onFileSelect, onFileContentChange, onCloseTab,
    onToggleFileTree, showFileTree = true,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }, [code]);

    // Which file's content is displayed
    const displayCode = projectMode === 'multi'
        ? (files[activeFile] ?? '')
        : code;
    const monacoLang = projectMode === 'multi'
        ? getMonacoLanguage(activeFile)
        : 'html';

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (projectMode === 'multi' && onFileContentChange) {
            onFileContentChange(activeFile, value ?? '');
        } else {
            onChange(value);
        }
    }, [projectMode, activeFile, onFileContentChange, onChange]);

    // Show only a limited number of file tabs (most recent / open files)
    const openTabs = projectMode === 'multi'
        ? Object.keys(files).slice(0, 8)   // show up to 8 tabs
        : [];

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="h-full w-full overflow-hidden card flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <span className="text-sm font-medium">Editor</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
                        {formatSize(new Blob([displayCode]).size)}
                    </span>
                    {/* Files toggle button, shown in multi-file mode or always for discoverability */}
                    {onToggleFileTree && (
                        <button
                            onClick={onToggleFileTree}
                            className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded transition-colors ml-1 ${projectMode === 'multi' && showFileTree
                                    ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]'
                                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                                }`}
                            title={projectMode === 'multi' ? (showFileTree ? 'Hide file tree' : 'Show file tree') : 'Switch to multi-file mode'}
                        >
                            <FolderOpen className="h-3 w-3" />
                            <span>Files</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Quick Navigation Toggle (Mobile Only) */}
                    {onTabChange && (
                        <div className="flex items-center gap-1 glass rounded-lg p-1 lg:hidden">
                            <button onClick={() => onTabChange('chat')}
                                className={`p-1.5 rounded transition-all ${activeTab === 'chat' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'}`}
                                title="Chat"><MessageSquare className="h-4 w-4" /></button>
                            <button onClick={() => onTabChange('code')}
                                className={`p-1.5 rounded transition-all ${activeTab === 'code' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'}`}
                                title="Code"><Code2 className="h-4 w-4" /></button>
                            <button onClick={() => onTabChange('preview')}
                                className={`p-1.5 rounded transition-all ${activeTab === 'preview' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'}`}
                                title="Preview"><Play className="h-4 w-4" /></button>
                        </div>
                    )}
                    {/* Copy Button */}
                    <button onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-[hsl(var(--accent))] transition-colors"
                        title="Copy code">
                        {copied
                            ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400 hidden sm:inline">Copied</span></>
                            : <><Copy className="h-3 w-3 text-[hsl(var(--muted-foreground))]" /><span className="text-[hsl(var(--muted-foreground))] hidden sm:inline">Copy</span></>}
                    </button>
                    {/* Traffic lights */}
                    <div className="hidden sm:flex space-x-1.5">
                        <div className="h-3 w-3 rounded-full bg-[hsl(var(--destructive))] opacity-50" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                    </div>
                </div>
            </div>

            {/* File tabs (multi-file mode only) */}
            {projectMode === 'multi' && openTabs.length > 0 && (
                <div className="flex items-center gap-0 overflow-x-auto border-b border-[hsl(var(--border))] flex-shrink-0 bg-[hsl(var(--card))]">
                    {openTabs.map(tab => (
                        <div
                            key={tab}
                            onClick={() => onFileSelect?.(tab)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-[hsl(var(--border))] transition-colors flex-shrink-0
                                ${tab === activeFile
                                    ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-b-2 border-b-[hsl(var(--primary))]'
                                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'}`}
                        >
                            <span className="max-w-[100px] truncate">{tab.split('/').pop()}</span>
                            {onCloseTab && (
                                <button
                                    onClick={e => { e.stopPropagation(); onCloseTab(tab); }}
                                    className="p-0.5 rounded hover:bg-white/10 opacity-50 hover:opacity-100"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Editor, wrapped in an error boundary so a Monaco crash shows a textarea fallback */}
            <div className="relative flex-1 min-h-0">
                <EditorErrorBoundary fallbackCode={displayCode} onChange={v => handleEditorChange(v)}>
                    <Editor
                        height="100%"
                        language={monacoLang}
                        value={displayCode}
                        onChange={handleEditorChange}
                        theme="vs-dark"
                        loading={
                            <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-[#888] text-sm">
                                Loading editor...
                            </div>
                        }
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            wordWrap: 'on',
                            padding: { top: 16, bottom: 16 },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                            fontLigatures: true,
                            smoothScrolling: true,
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                            lineNumbers: 'on',
                            renderLineHighlight: 'line',
                            scrollbar: {
                                verticalScrollbarSize: 6,
                                horizontalScrollbarSize: 6,
                            }
                        }}
                    />
                </EditorErrorBoundary>
            </div>
        </div>
    );
};

export default CodeEditorComponent;
