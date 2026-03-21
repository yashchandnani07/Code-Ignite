import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalStorageString } from './useLocalStorage';
import { STORAGE_KEYS } from '../constants/storage';
import { DEFAULT_CODE, APP_CONFIG } from '../constants/app';
import { downloadAsHtml } from '../utils/download';
import { useToast } from '../components/Toast';
import type { EditorState, EditorActions, FileSystem, ProjectMode } from '../types';

/**
 * Manages code state, history for undo, and pending diffs.
 * Supports both single-file (legacy) and multi-file project modes.
 */
export function useCodeEditor(): EditorState & EditorActions {
    const { showToast } = useToast();

    // ─── Single-file state (legacy, unchanged) ───────────────────────
    const [code, setCodeRaw] = useLocalStorageString(
        STORAGE_KEYS.SAVED_CODE,
        DEFAULT_CODE
    );
    const [history, setHistory] = useState<string[]>([]);
    const [pendingCode, setPendingCode] = useState<string | null>(null);
    const isDefault = code.trim() === DEFAULT_CODE.trim();

    // ─── Multi-file state ─────────────────────────────────────────────
    const [projectMode, setProjectMode] = useLocalStorageString(
        STORAGE_KEYS.PROJECT_MODE,
        'single'
    ) as [ProjectMode, (v: ProjectMode) => void];

    // Files: in-memory state updates immediately; localStorage write is debounced
    // to prevent blocking the main thread on every keypress.
    const [files, setFilesImmediate] = useState<FileSystem>(() => {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEYS.PROJECT_FILES) ?? '{}'
            ) as FileSystem;
        } catch { return {}; }
    });
    const pendingFilesRef = useRef<FileSystem | null>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Flush pending files to localStorage when the component unmounts
    useEffect(() => {
        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
                if (pendingFilesRef.current !== null) {
                    try {
                        localStorage.setItem(
                            STORAGE_KEYS.PROJECT_FILES,
                            JSON.stringify(pendingFilesRef.current)
                        );
                    } catch { /* quota exceeded — silent */ }
                }
            }
        };
    }, []);

    const [activeFile, setActiveFileRaw] = useLocalStorageString(
        STORAGE_KEYS.ACTIVE_FILE,
        'index.html'
    );

    // Snapshot history for multi-file undo (in-memory only)
    const [projectHistory, setProjectHistory] = useState<FileSystem[]>([]);

    // ─── Helpers ──────────────────────────────────────────────────────
    const persistFiles = useCallback((fs: FileSystem) => {
        // 1. Update React state immediately so the UI reflects the change at once
        setFilesImmediate(fs);
        pendingFilesRef.current = fs;

        // 2. Debounce the actual localStorage write — fires 800ms after last call
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            const pending = pendingFilesRef.current;
            if (pending === null) return;
            pendingFilesRef.current = null;

            const json = JSON.stringify(pending);
            const sizeMB = new Blob([json]).size / (1024 * 1024);
            if (sizeMB > 4) {
                showToast('Project is large — consider starting fresh to avoid storage limits.', 'warning');
            }
            try {
                localStorage.setItem(STORAGE_KEYS.PROJECT_FILES, json);
            } catch {
                showToast('Storage quota exceeded — oldest data may be lost.', 'warning');
            }
        }, 800);
    }, [showToast]);

    const pushProjectToHistory = useCallback((current: FileSystem) => {
        setProjectHistory(prev => [
            ...prev.slice(-(APP_CONFIG.CODE_HISTORY_LIMIT - 1)),
            current
        ]);
    }, []);

    // ─── Single-file actions (unchanged) ──────────────────────────────
    const pushToHistory = useCallback(() => {
        if (!isDefault) {
            setHistory(prev => [...prev.slice(-(APP_CONFIG.CODE_HISTORY_LIMIT - 1)), code]);
        }
    }, [code, isDefault]);

    const undo = useCallback((): boolean => {
        if (projectMode === 'multi') {
            if (projectHistory.length === 0) return false;
            const prev = projectHistory[projectHistory.length - 1];
            setProjectHistory(h => h.slice(0, -1));
            persistFiles(prev);
            showToast('Restored previous project state', 'info');
            return true;
        }
        if (history.length === 0) return false;
        const previousCode = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setCodeRaw(previousCode);
        showToast('Restored previous code', 'info');
        return true;
    }, [projectMode, projectHistory, history, setCodeRaw, persistFiles, showToast]);

    const applyPendingCode = useCallback(() => {
        if (pendingCode) {
            pushToHistory();
            setCodeRaw(pendingCode);
            setPendingCode(null);
            showToast('Changes applied!', 'success');
        }
    }, [pendingCode, pushToHistory, setCodeRaw, showToast]);

    const rejectPendingCode = useCallback(() => {
        setPendingCode(null);
        showToast('Changes rejected', 'info');
    }, [showToast]);

    const reset = useCallback(() => {
        setCodeRaw(DEFAULT_CODE);
        setHistory([]);
        setPendingCode(null);
        setProjectMode('single');
        persistFiles({});
        setProjectHistory([]);
        setActiveFileRaw('index.html');
    }, [setCodeRaw, setProjectMode, persistFiles, setActiveFileRaw]);

    const download = useCallback(() => {
        downloadAsHtml(code);
        showToast('Code downloaded!', 'success');
    }, [code, showToast]);

    const copy = useCallback(async (): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(
                projectMode === 'multi' ? (files[activeFile] ?? '') : code
            );
            showToast('Code copied to clipboard', 'success');
            return true;
        } catch {
            showToast('Failed to copy code', 'error');
            return false;
        }
    }, [code, projectMode, files, activeFile, showToast]);

    // ─── Multi-file actions ───────────────────────────────────────────

    /** AI writes a brand-new project (full generation). */
    const setProject = useCallback((newFiles: FileSystem, isStreaming?: boolean) => {
        if (!isStreaming) pushProjectToHistory(files);
        persistFiles(newFiles);
        setProjectMode('multi');
        // Open index.html by default, fall back to first file only when not streaming 
        // to avoid active file stealing focus constantly during generation
        if (!isStreaming) {
            const entry = newFiles['index.html']
                ? 'index.html'
                : Object.keys(newFiles)[0] ?? 'index.html';
            setActiveFileRaw(entry);
        }
    }, [files, pushProjectToHistory, persistFiles, setProjectMode, setActiveFileRaw]);

    /** AI sends only the files it wants to add/modify (plus optional deletions). */
    const updateFiles = useCallback((patches: FileSystem, deletions: string[] = [], isStreaming?: boolean) => {
        if (!isStreaming) pushProjectToHistory(files);
        const updated = { ...files, ...patches };
        deletions.forEach(p => delete updated[p]);
        persistFiles(updated);
    }, [files, pushProjectToHistory, persistFiles]);

    /** Switch which file is open in the editor. */
    const setActiveFile = useCallback((path: string) => {
        setActiveFileRaw(path);
    }, [setActiveFileRaw]);

    /** User edits a file directly in Monaco. */
    const setFileContent = useCallback((path: string, content: string) => {
        persistFiles({ ...files, [path]: content });
    }, [files, persistFiles]);

    /** Add a new empty (or seeded) file. */
    const addFile = useCallback((path: string, content: string = '') => {
        if (files[path] !== undefined) {
            showToast(`File "${path}" already exists`, 'warning');
            return;
        }
        persistFiles({ ...files, [path]: content });
        setActiveFileRaw(path);
    }, [files, persistFiles, setActiveFileRaw, showToast]);

    /** Remove a file from the project. */
    const deleteFile = useCallback((path: string) => {
        const updated = { ...files };
        delete updated[path];
        persistFiles(updated);
        // If we deleted the active file, switch to first remaining
        if (path === activeFile) {
            const next = Object.keys(updated)[0] ?? 'index.html';
            setActiveFileRaw(next);
        }
    }, [files, activeFile, persistFiles, setActiveFileRaw]);

    /** Download a multi-file project as a .zip archive. */
    const downloadProject = useCallback(async () => {
        try {
            // Dynamically import JSZip to keep the bundle lean
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            Object.entries(files).forEach(([path, content]) => {
                zip.file(path, content);
            });
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'code-ignite-project.zip';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Project downloaded as ZIP!', 'success');
        } catch (err) {
            console.error('ZIP download failed:', err);
            showToast('Failed to create ZIP file', 'error');
        }
    }, [files, showToast]);

    return {
        // ── Single-file state ──
        code,
        history,
        pendingCode,
        isDefault,
        // ── Multi-file state ──
        projectMode,
        files,
        activeFile,
        // ── Single-file actions ──
        setCode: setCodeRaw,
        undo,
        applyPendingCode,
        rejectPendingCode,
        reset,
        download,
        copy,
        setPendingCode,
        pushToHistory,
        // ── Multi-file actions ──
        setProject,
        updateFiles,
        setActiveFile,
        setFileContent,
        addFile,
        deleteFile,
        downloadProject,
    };
}
