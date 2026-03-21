import { useCallback, useMemo } from 'react';
import { useLocalStorageString } from './useLocalStorage';
import { STORAGE_KEYS } from '../constants/storage';
import { DEFAULT_PROVIDER, getDefaultModel } from '../constants/models';
import type { ApiProvider, ApiSettings, FirebaseConfig } from '../types';

/**
 * Manages API provider, key, model selection, and GitHub token
 * All state is persisted to localStorage automatically
 */
export function useApiSettings() {
    const [storedProvider, setProviderRaw] = useLocalStorageString(
        STORAGE_KEYS.SELECTED_PROVIDER,
        DEFAULT_PROVIDER
    );

    // Normalize old 'Openrouter' from local storage to 'OpenRouter' to prevent crashes
    const provider = storedProvider === 'Openrouter' ? 'OpenRouter' : storedProvider;

    const [apiKey, setApiKey] = useLocalStorageString(
        STORAGE_KEYS.API_KEY,
        ''
    );

    const [model, setModel] = useLocalStorageString(
        STORAGE_KEYS.SELECTED_MODEL,
        getDefaultModel(provider as ApiProvider)
    );

    const [githubToken, setGithubToken] = useLocalStorageString(
        STORAGE_KEYS.GITHUB_TOKEN,
        ''
    );

    const [baseUrl, setBaseUrl] = useLocalStorageString(
        STORAGE_KEYS.CUSTOM_BASE_URL,
        ''
    );

    const [firebaseConfigStr, setFirebaseConfigStr] = useLocalStorageString(
        STORAGE_KEYS.FIREBASE_CONFIG,
        ''
    );

    const firebaseConfig = useMemo<FirebaseConfig | null>(() => {
        try {
            return firebaseConfigStr ? JSON.parse(firebaseConfigStr) : null;
        } catch {
            return null;
        }
    }, [firebaseConfigStr]);

    const setFirebaseConfig = useCallback((config: FirebaseConfig | null) => {
        setFirebaseConfigStr(config ? JSON.stringify(config) : '');
    }, [setFirebaseConfigStr]);

    // When provider changes, reset to default model for that provider
    const setProvider = useCallback((newProvider: ApiProvider) => {
        setProviderRaw(newProvider);
        setModel(getDefaultModel(newProvider));
    }, [setProviderRaw, setModel]);

    const settings: ApiSettings = {
        provider: provider as ApiProvider,
        apiKey,
        model,
        githubToken,
        baseUrl,
    };

    return {
        settings,
        setProvider,
        setApiKey,
        setModel,
        setGithubToken,
        setBaseUrl,
        hasApiKey: apiKey.length > 0,
        firebaseConfig,
        setFirebaseConfig,
        hasFirebase: !!(firebaseConfig && firebaseConfig.projectId),
    };
}
