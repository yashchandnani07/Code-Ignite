import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ApiProvider } from '../types';

export interface CliConfig {
    provider: ApiProvider;
    apiKey: string;
    model: string;
    githubToken: string;
    baseUrl: string;
    netlifyToken: string;
    firebaseConfigJson: string; // Stored as a JSON string for easy CLI config
}

const CONFIG_DIR = path.join(os.homedir(), '.codeignite');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: CliConfig = {
    provider: 'OpenRouter',
    apiKey: '',
    model: 'google/gemini-2.5-pro',
    githubToken: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    netlifyToken: '',
    firebaseConfigJson: '',
};

/**
 * Loads config from the config file, creating it with defaults if it doesn't exist.
 */
export function loadConfigFile(): CliConfig {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return DEFAULT_CONFIG;
        }
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return { ...DEFAULT_CONFIG, ...parsed };
    } catch (error) {
        console.error('Warning: Failed to load config file, using defaults.', error);
        return DEFAULT_CONFIG;
    }
}

/**
 * Saves config to the config file.
 */
export function saveConfigFile(config: Partial<CliConfig>): void {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        const current = loadConfigFile();
        const updated = { ...current, ...config };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
    } catch (error) {
        console.error('Error: Failed to save config file.', error);
    }
}

/**
 * Resolves the configuration by merging:
 * 1. CLI option overrides
 * 2. Environment variables
 * 3. Local config file (~/.codeignite/config.json)
 * 4. Default values
 */
export function getResolvedConfig(options: Partial<CliConfig> = {}): CliConfig {
    const fileConfig = loadConfigFile();

    const envConfig: Partial<CliConfig> = {};
    if (process.env.CODEIGNITE_PROVIDER) envConfig.provider = process.env.CODEIGNITE_PROVIDER as ApiProvider;
    if (process.env.CODEIGNITE_API_KEY) envConfig.apiKey = process.env.CODEIGNITE_API_KEY;
    if (process.env.CODEIGNITE_MODEL) envConfig.model = process.env.CODEIGNITE_MODEL;
    if (process.env.CODEIGNITE_GITHUB_TOKEN) envConfig.githubToken = process.env.CODEIGNITE_GITHUB_TOKEN;
    if (process.env.CODEIGNITE_BASE_URL) envConfig.baseUrl = process.env.CODEIGNITE_BASE_URL;
    if (process.env.NETLIFY_AUTH_TOKEN || process.env.CODEIGNITE_NETLIFY_TOKEN) {
        envConfig.netlifyToken = process.env.NETLIFY_AUTH_TOKEN || process.env.CODEIGNITE_NETLIFY_TOKEN || '';
    }
    if (process.env.CODEIGNITE_FIREBASE_CONFIG) envConfig.firebaseConfigJson = process.env.CODEIGNITE_FIREBASE_CONFIG;

    return {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...envConfig,
        ...options,
    };
}
