import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, RefreshCw, Cpu, Key, GitBranch, Box } from 'lucide-react';
import type { ApiProvider, ModelOption } from '../types';
import { AI_MODELS } from '../constants/models';
import { validateApiKey } from '../services/aiValidate';
import { fetchLatestModels } from '../services/fetchModels';

interface SettingsModalProps {
    apiKey: string;
    setApiKey: (key: string) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    selectedProvider: ApiProvider;
    setSelectedProvider: (provider: ApiProvider) => void;
    githubToken: string;
    setGithubToken: (token: string) => void;
    baseUrl: string;
    setBaseUrl: (url: string) => void;
    onClose: () => void;
    onOpenSetup: () => void;
}

// Export for backward compatibility
export const AVAILABLE_MODELS = AI_MODELS;

const PROVIDERS: ApiProvider[] = [
    'Google AI',
    'Openrouter',
    'Openai',
    'Claude',
    'OpenAI-compatible',
];

const SettingsModal: React.FC<SettingsModalProps> = ({
    apiKey,
    setApiKey,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    githubToken,
    setGithubToken,
    baseUrl,
    setBaseUrl,
    onClose,
    onOpenSetup,
}) => {
    const [activeTab, setActiveTab] = useState<'provider' | 'model' | 'deploy'>('provider');
    const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
    const [keyError, setKeyError] = useState<string | null>(null);

    // Live model list state
    const [models, setModels] = useState<ModelOption[]>(AI_MODELS[selectedProvider] ?? []);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsFromApi, setModelsFromApi] = useState(false);

    // Custom model ID state
    const [customExpanded, setCustomExpanded] = useState(false);
    const [customModelInput, setCustomModelInput] = useState('');

    const loadModels = useCallback(async (provider: ApiProvider, key: string, base?: string) => {
        setModelsLoading(true);
        const result = await fetchLatestModels(provider, key, base);
        setModels(result.models);
        setModelsFromApi(result.fromApi);
        setModelsLoading(false);
    }, []);

    // Auto-fetch on mount and whenever provider/apiKey changes
    useEffect(() => {
        setModels(AI_MODELS[selectedProvider] ?? []);
        setModelsFromApi(false);
        // Fetch live list for providers that support it without needing a key
        // (OpenRouter is public). For others, only fetch if key is present.
        const canAutoFetch = selectedProvider === 'Openrouter' || !!apiKey;
        if (canAutoFetch) {
            loadModels(selectedProvider, apiKey, baseUrl || undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProvider, apiKey]);

    const handleProviderChange = (provider: ApiProvider) => {
        setSelectedProvider(provider);
        const firstStatic = AI_MODELS[provider]?.[0];
        if (firstStatic) setSelectedModel(firstStatic.id);
        setKeyStatus('idle');
        setKeyError(null);
    };

    // When models load, keep the selected model if still in list; else pick first
    useEffect(() => {
        if (!models.length) return;
        const ids = models.map(m => m.id);
        if (!ids.includes(selectedModel)) {
            // If the current selectedModel is a custom value not in the list, keep it
            if (customModelInput && selectedModel === customModelInput) return;
            setSelectedModel(models[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [models]);

    const applyCustomModel = () => {
        const trimmed = customModelInput.trim();
        if (trimmed) setSelectedModel(trimmed);
    };

    const handleTestKey = async () => {
        if (!apiKey) return;
        setKeyStatus('testing');
        setKeyError(null);
        try {
            const result = await validateApiKey(
                selectedProvider,
                apiKey,
                selectedModel,
                selectedProvider === 'OpenAI-compatible' ? baseUrl : undefined,
            );
            if (result.valid) {
                setKeyStatus('valid');
            } else {
                setKeyStatus('invalid');
                setKeyError(result.error || 'Invalid API key or model for this provider.');
            }
        } catch {
            setKeyStatus('invalid');
            setKeyError('Unable to validate key. Please try again.');
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#0a0a0b]/80 backdrop-blur-sm z-40 animate-in"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] md:w-[750px] max-w-4xl bg-[#1c1d21] rounded-xl shadow-2xl overflow-hidden border border-[#2b2d31] flex flex-col md:flex-row h-[85vh] md:h-[550px] animate-in slide-in-from-bottom-4 zoom-in-95">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-[#18191c] border-b md:border-b-0 md:border-r border-[#2b2d31] flex flex-col">
                    <div className="p-5 border-b border-[#2b2d31]">
                        <h2 className="text-sm font-semibold text-white tracking-wide">Project Settings</h2>
                    </div>

                    <div className="p-3 flex-1 space-y-1 overflow-y-auto">
                        <button
                            onClick={() => setActiveTab('provider')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'provider'
                                ? 'bg-[#2b2d31] text-white'
                                : 'text-[#949ba4] hover:bg-[#2b2d31]/50 hover:text-[#dbdee1]'
                                }`}
                        >
                            <Key className="w-4 h-4" />
                            AI Provider
                        </button>

                        <button
                            onClick={() => setActiveTab('model')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'model'
                                ? 'bg-[#2b2d31] text-white'
                                : 'text-[#949ba4] hover:bg-[#2b2d31]/50 hover:text-[#dbdee1]'
                                }`}
                        >
                            <Cpu className="w-4 h-4" />
                            Model Config
                        </button>

                        <button
                            onClick={() => setActiveTab('deploy')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'deploy'
                                ? 'bg-[#2b2d31] text-white'
                                : 'text-[#949ba4] hover:bg-[#2b2d31]/50 hover:text-[#dbdee1]'
                                }`}
                        >
                            <GitBranch className="w-4 h-4" />
                            Git Integration
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-[#1c1d21]">
                    {/* Content Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#2b2d31] bg-[#1c1d21]">
                        <div>
                            <h3 className="text-base font-semibold text-white tracking-tight">
                                {activeTab === 'provider' && 'AI Provider Settings'}
                                {activeTab === 'model' && 'Model Configuration'}
                                {activeTab === 'deploy' && 'Deployment & Git'}
                            </h3>
                            <p className="text-xs text-[#949ba4] mt-1">
                                {activeTab === 'provider' && 'Configure secure API keys for your AI generation.'}
                                {activeTab === 'model' && 'Select the specific AI model to power the code generation.'}
                                {activeTab === 'deploy' && 'Set up GitHub access for one-click deployments.'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 text-[#949ba4] hover:text-white transition-colors rounded-md hover:bg-[#2b2d31]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* PROVIDER TAB */}
                        {activeTab === 'provider' && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                                        Select Provider
                                    </label>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {PROVIDERS.map((provider) => (
                                            <button
                                                key={provider}
                                                onClick={() => handleProviderChange(provider)}
                                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${selectedProvider === provider
                                                    ? 'bg-[#00a3ff]/10 border-[#00a3ff] text-[#00a3ff]'
                                                    : 'bg-[#18191c] border-[#2b2d31] text-[#949ba4] hover:bg-[#2b2d31] hover:text-white'
                                                    }`}
                                            >
                                                {provider}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                                        {selectedProvider === 'Google AI'
                                            ? 'Google AI Studio API Key'
                                            : `${selectedProvider} API Key`}
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder={selectedProvider === 'Google AI' ? 'AIza…' : 'sk-…'}
                                            className="flex-1 bg-[#18191c] border border-[#2b2d31] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#00a3ff] focus:ring-1 focus:ring-[#00a3ff] transition-all placeholder:text-[#4f545c]"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleTestKey}
                                            className="bg-[#2b2d31] hover:bg-[#383a40] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!apiKey || keyStatus === 'testing'}
                                        >
                                            {keyStatus === 'testing' ? 'Testing…' : 'Verify Key'}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-[#949ba4]">
                                            {selectedProvider === 'Google AI' ? (
                                                <>Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#00a3ff] hover:underline">Google AI Studio</a></>
                                            ) : selectedProvider === 'Openrouter' ? (
                                                <>Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[#00a3ff] hover:underline">openrouter.ai</a></>
                                            ) : selectedProvider === 'Openai' ? (
                                                <>Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[#00a3ff] hover:underline">OpenAI Dashboard</a></>
                                            ) : selectedProvider === 'Claude' ? (
                                                <>Get your key from <a href="https://platform.claude.com/dashboard" target="_blank" rel="noreferrer" className="text-[#00a3ff] hover:underline">Claude Dashboard</a></>
                                            ) : selectedProvider === 'OpenAI-compatible' ? (
                                                <>Use any OpenAI-compatible endpoint (Together, Fireworks, DeepInfra, Novita, custom, etc.).</>
                                            ) : null}
                                        </p>
                                        {keyStatus === 'valid' && (
                                            <span className="text-[11px] text-emerald-400 font-medium">✓ Key active and verified</span>
                                        )}
                                        {keyStatus === 'invalid' && (
                                            <span className="text-[11px] text-red-400 font-medium">
                                                {keyError || 'Key validation failed'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {selectedProvider === 'OpenAI-compatible' && (
                                    <div className="space-y-3 pt-6 border-t border-[#2b2d31]">
                                        <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                                            OpenAI-compatible Base URL
                                        </label>
                                        <input
                                            type="text"
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder="https://your-endpoint.com/v1"
                                            className="w-full bg-[#18191c] border border-[#2b2d31] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#00a3ff] focus:ring-1 focus:ring-[#00a3ff] transition-all placeholder:text-[#4f545c]"
                                        />
                                    </div>
                                )}

                                <div className="pt-6 border-t border-[#2b2d31]">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onOpenSetup();
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all group"
                                    >
                                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                        <span>Re-run Welcome Setup</span>
                                    </button>
                                    <p className="text-[10px] text-[#949ba4] mt-2 text-center">
                                        Use this to re-configure your AI provider with the interactive guide.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* MODEL TAB */}
                        {activeTab === 'model' && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                                            Available Models
                                            {modelsFromApi && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
                                            )}
                                        </label>
                                        <button
                                            onClick={() => loadModels(selectedProvider, apiKey, baseUrl || undefined)}
                                            disabled={modelsLoading}
                                            title="Refresh model list"
                                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2b2d31] hover:bg-[#383a40] transition-colors text-xs font-medium text-[#dbdee1]"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                        {modelsLoading ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-sm text-[#949ba4]">
                                                <RefreshCw className="h-5 w-5 animate-spin mb-3 text-[#00a3ff]" />
                                                Fetching latest models over the network…
                                            </div>
                                        ) : models.length > 0 ? (
                                            models.map((model) => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => setSelectedModel(model.id)}
                                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between group ${selectedModel === model.id
                                                        ? 'bg-[#00a3ff]/10 border-[#00a3ff]/50 text-white'
                                                        : 'bg-[#18191c] border-[#2b2d31] text-[#949ba4] hover:bg-[#2b2d31] hover:text-[#dbdee1]'
                                                        }`}
                                                >
                                                    <div>
                                                        <span className="text-sm font-medium block text-white">{model.name}</span>
                                                        {model.description && (
                                                            <span className="text-xs text-[#949ba4] mt-0.5 block">{model.description}</span>
                                                        )}
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-4 ${selectedModel === model.id ? 'border-[#00a3ff] bg-[#00a3ff]' : 'border-[#4f545c]'}`}>
                                                        {selectedModel === model.id && <Check className="h-3 w-3 text-[#18191c] font-bold" />}
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-sm text-[#949ba4] bg-[#18191c] rounded-lg border border-[#2b2d31]">
                                                No models found. Check your API key.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom model ID input */}
                                <div className="pt-4 border-t border-[#2b2d31]">
                                    <button
                                        type="button"
                                        onClick={() => setCustomExpanded(v => !v)}
                                        className="flex items-center gap-2 text-sm font-medium text-[#949ba4] hover:text-white transition-colors"
                                    >
                                        <Box className="w-4 h-4" />
                                        Use a custom model ID
                                        <span className="text-[10px] bg-[#2b2d31] px-1.5 py-0.5 rounded ml-2">Advanced</span>
                                    </button>

                                    {customExpanded && (
                                        <div className="mt-4 p-4 rounded-lg bg-[#18191c] border border-[#2b2d31] space-y-3">
                                            <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider block">
                                                Custom Model String
                                            </label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={customModelInput}
                                                    onChange={e => setCustomModelInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') applyCustomModel(); }}
                                                    placeholder="e.g. gpt-4o, claude-3-opus-20240229"
                                                    className="flex-1 bg-[#2b2d31] border border-[#1e1f22] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#00a3ff] focus:ring-1 focus:ring-[#00a3ff] transition-all font-mono"
                                                    spellCheck={false}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={applyCustomModel}
                                                    disabled={!customModelInput.trim()}
                                                    className="bg-[#00a3ff] hover:bg-[#0082cc] text-[#18191c] px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            {customModelInput.trim() && selectedModel === customModelInput.trim() && (
                                                <p className="text-[11px] text-emerald-400 font-medium pt-1">✓ Serving custom model: {selectedModel}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* DEPLOY TAB */}
                        {activeTab === 'deploy' && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                                        GitHub Personal Access Token
                                    </label>
                                    <p className="text-sm text-[#949ba4] leading-relaxed">
                                        Required for deploying projects directly to GitHub Gists. The token needs the <code className="bg-[#2b2d31] px-1 py-0.5 rounded text-white mx-1 text-xs">gist</code> scope.
                                    </p>
                                    <div className="pt-2">
                                        <input
                                            type="password"
                                            value={githubToken}
                                            onChange={(e) => setGithubToken(e.target.value)}
                                            placeholder="ghp_••••••••••••••••••••••••••••••••••••"
                                            className="w-full bg-[#18191c] border border-[#2b2d31] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#00a3ff] focus:ring-1 focus:ring-[#00a3ff] transition-all placeholder:text-[#4f545c] font-mono"
                                        />
                                    </div>
                                    <p className="text-[11px] text-[#949ba4] pt-1">
                                        Don't have one? <a href="https://github.com/settings/tokens/new?scopes=gist&description=Code+Ignite+Gist+Export" target="_blank" rel="noreferrer" className="text-[#00a3ff] hover:underline">Create a new token on GitHub →</a>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsModal;
