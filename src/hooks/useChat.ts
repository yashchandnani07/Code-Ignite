import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storage';
import { storage } from '../utils/storage';
import { generateCodeStream } from '../services/ai';
import { isMultiFileResponse, parseMultiFileResponse } from '../services/ai/parseMultiFile';
import { formatApiError } from '../utils/errors';
import { useToast } from '../components/Toast';
import type { Message, FileAttachment, ChatState, ChatActions, ApiSettings, FileSystem, FirebaseConfig } from '../types';

interface UseChatOptions {
    apiSettings: ApiSettings;
    code: string;
    isDefaultCode: boolean;
    setCode: (code: string) => void;
    setPendingCode: (code: string | null) => void;
    pushToHistory: () => void;
    // Multi-file project actions (from useCodeEditor)
    setProject: (files: FileSystem, isStreaming?: boolean) => void;
    updateFiles: (patches: FileSystem, deletions?: string[], isStreaming?: boolean) => void;
    projectMode: 'single' | 'multi';
    /** Full virtual filesystem — passed to AI as context in multi-file mode */
    files: FileSystem;
    firebaseConfig?: FirebaseConfig | null;
}

/**
 * Manages chat messages and AI code generation
 */
export function useChat({
    apiSettings, code, isDefaultCode, setCode, setPendingCode,
    pushToHistory, setProject, updateFiles, projectMode, files, firebaseConfig
}: UseChatOptions): ChatState & ChatActions {
    const { showToast } = useToast();

    // Load initial messages from storage once on mount
    const [messages, setMessages] = useState<Message[]>(() =>
        storage.get<Message[]>(STORAGE_KEYS.CHAT_MESSAGES, [])
    );

    // ── Persist messages with hard limits ──────────────────────────────
    // In-memory array is never trimmed (full session UX)
    // Only the localStorage copy is capped
    const MAX_MESSAGES = 30;          // keep at most 30 messages in storage
    const MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard cap

    useEffect(() => {
        let toStore = messages;

        // 1. Cap by message count — retain newest
        if (toStore.length > MAX_MESSAGES) {
            toStore = toStore.slice(-MAX_MESSAGES);
        }

        // 2. Cap by serialized size — drop oldest pairs until within limit
        while (toStore.length > 2) {
            const bytes = new Blob([JSON.stringify(toStore)]).size;
            if (bytes <= MAX_BYTES) break;
            toStore = toStore.slice(2); // drop one user+assistant pair at a time
        }

        storage.set(STORAGE_KEYS.CHAT_MESSAGES, toStore);
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    const [isLoading, setIsLoading] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastPrompt, setLastPrompt] = useState('');

    const sendMessage = useCallback(async (
        message: string,
        attachments?: FileAttachment[]
    ) => {
        // BYOK only — require an API key
        if (!apiSettings.apiKey) {
            setLastError('No API key configured. Please add your Google AI key (or other provider) in Settings.');
            showToast('Add your API key in Settings to continue.', 'error');
            return;
        }

        setLastPrompt(message);
        setLastError(null);

        const newMessages: Message[] = [...messages, { role: 'user', content: message }];
        setMessages(newMessages);
        setIsLoading(true);

        if (!isDefaultCode) {
            pushToHistory();
        }

        setMessages(prev => [
            ...prev,
            { role: 'assistant', content: '⧳ Generating code…' },
        ]);

        try {
            let result: { code: string; summary: string; files?: FileSystem; deletions?: string[] };

            let accumulatedCode = '';

            result = await generateCodeStream(
                apiSettings.apiKey,
                apiSettings.model,
                newMessages,
                code,
                (chunk) => {
                    accumulatedCode += chunk;
                    if (isMultiFileResponse(accumulatedCode)) {
                        const parsed = parseMultiFileResponse(accumulatedCode);
                        if (Object.keys(parsed.files).length > 0) {
                            if (projectMode !== 'multi') {
                                setProject(parsed.files, true);
                                // ensure the first parsed file is active immediately so user can watch it type
                                const entry = parsed.files['index.html'] ? 'index.html' : Object.keys(parsed.files)[0];
                                if (entry) {
                                    // The active file will be shown immediately
                                }
                            } else {
                                updateFiles(parsed.files, parsed.deletions, true);
                            }
                        }
                    } else if (isDefaultCode && !accumulatedCode.includes('===')) {
                        // Fallback: If it looks like a clean code block starting, we can try to stream it.
                        // However, to keep it clean and prevent chatter, we only extract text inside ``` blocks.
                        // If no blocks, we skip to avoid showing conversation.
                        const matches = accumulatedCode.match(/```[a-z]*\n([\s\S]*?)($|```)/);
                        if (matches && matches[1]) {
                            setCode(matches[1]);
                        } else {
                            // If no code block, just stream the raw content for single file mode
                            setCode(accumulatedCode);
                        }
                    }
                },
                apiSettings.provider,
                attachments,
                apiSettings.baseUrl,
                projectMode === 'multi' ? files : undefined,
                projectMode,
                firebaseConfig
            );

            if (result.files && Object.keys(result.files).length > 0) {
                if (projectMode === 'multi') {
                    updateFiles(result.files, result.deletions);
                    showToast('Project updated!', 'success');
                } else {
                    setProject(result.files);
                    showToast('Multi-file project generated!', 'success');
                }
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: 'assistant',
                        content: result.summary || '✅ Project generated.',
                    };
                    return updated;
                });
                return;
            }

            if (isDefaultCode) {
                setCode(result.code);
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: result.summary };
                    return updated;
                });
                showToast('Code generated successfully!', 'success');
            } else {
                setPendingCode(result.code);
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: 'assistant',
                        content:
                            result.summary +
                            '\n\n📝 Review the diff and click Apply to accept changes.',
                    };
                    return updated;
                });
                showToast('Review the diff before applying', 'info');
            }
        } catch (error) {
            const friendlyError = formatApiError(error);
            setLastError(friendlyError);

            setMessages(prev => prev.slice(0, -1));
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        friendlyError.includes('free test limit') ||
                            friendlyError.includes('FREE_LIMIT_REACHED')
                            ? `${friendlyError}\n\nAdd your own API key in Settings to keep using AI.`
                            : `❌ Error: ${friendlyError}\n\nClick "Retry" to try again.`,
                },
            ]);

            showToast(friendlyError, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiSettings, messages, code, isDefaultCode, setCode, setPendingCode, pushToHistory, setProject, updateFiles, projectMode, showToast, setMessages, files, firebaseConfig]);


    const retry = useCallback(() => {
        if (lastPrompt && !isLoading) {
            setMessages(prev => prev.slice(0, -2));
            sendMessage(lastPrompt);
        }
    }, [lastPrompt, isLoading, sendMessage, setMessages]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setLastError(null);
        showToast('Chat history cleared', 'info');
    }, [setMessages, showToast]);

    const clearAll = useCallback(() => {
        setMessages([]);
        setLastError(null);
        setLastPrompt('');
    }, [setMessages]);

    return {
        // State
        messages,
        isLoading,
        lastError,
        lastPrompt,
        // Actions
        sendMessage,
        retry,
        clearMessages,
        clearAll,
    };
}
