/**
 * Centralized localStorage keys
 * Single source of truth - change once, updates everywhere
 */
export const STORAGE_KEYS = {
    API_KEY: 'ai_api_key',
    SELECTED_PROVIDER: 'selected_provider',
    SELECTED_MODEL: 'selected_model',
    CUSTOM_BASE_URL: 'custom_base_url',
    CHAT_MESSAGES: 'chat_messages',
    SAVED_CODE: 'saved_code',
    GITHUB_TOKEN: 'github_token',
    HAS_VISITED: 'has_visited_app',
    FIREBASE_CONFIG: 'firebase_config',
    PROJECT_FILES: 'project_files',    // multi-file: JSON-serialised FileSystem
    PROJECT_MODE: 'project_mode',      // 'single' | 'multi'
    ACTIVE_FILE: 'active_file',        // currently open file path
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
