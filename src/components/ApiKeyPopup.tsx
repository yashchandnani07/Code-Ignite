import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Key, Cpu, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverBorderGradient } from './ui/hover-border-gradient';
import type { ApiProvider } from '../types';

const PROVIDERS: ApiProvider[] = ['Google AI', 'OpenRouter', 'Openai', 'Claude', 'OpenAI-compatible'];

const apiKeyLinks: Record<string, string> = {
    "Google AI": "https://aistudio.google.com/app/apikey",
    "OpenRouter": "https://openrouter.ai/keys",
    "Openai": "https://platform.openai.com/api-keys",
    "Claude": "https://platform.claude.com/dashboard",
    "OpenAI-compatible": "",
};

const modelsByProvider: Record<string, string[]> = {
    "Google AI": ["gemini-2.0-flash-exp", "gemini-2.5-pro-preview", "gemini-1.5-pro"],
    "OpenRouter": ["google/gemini-2.0-flash-exp:free", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
    "Openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview"],
    "Claude": ["claude-sonnet-4-5", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
    "OpenAI-compatible": [],
};

interface ApiKeyPopupProps {
    apiKey: string;
    setApiKey: (key: string) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    selectedProvider: ApiProvider;
    setSelectedProvider: (provider: ApiProvider) => void;
    baseUrl: string;
    setBaseUrl: (url: string) => void;
    onDismiss: () => void;
}

export const ApiKeyPopup: React.FC<ApiKeyPopupProps> = ({
    apiKey,
    setApiKey,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    baseUrl,
    setBaseUrl,
    onDismiss
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Reset model when provider changes
    useEffect(() => {
        const models = modelsByProvider[selectedProvider] ?? [];
        setSelectedModel(models[0] ?? "");
    }, [selectedProvider]);

    const handleSubmit = async () => {
        if (!apiKey.trim()) return;
        setIsLoading(true);
        await new Promise((res) => setTimeout(res, 800));
        onDismiss();
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-6 overflow-y-auto">
            {/* ─── MODAL CONTAINER — LIGHT GLASSMORPHIC ─── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-[500px] my-auto p-8 md:p-10
                    bg-white/10 backdrop-blur-xl saturate-150
                    border border-white/20 rounded-3xl
                    shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
            >
                <button
                    onClick={onDismiss}
                    className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors rounded-full z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8 relative z-20">
                    {/* ─── LOGO ─── */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20
                                    shadow-[0_8px_32px_rgba(249,115,22,0.15)] mb-2">
                        <img
                            src="/logo/code-ignite.jpeg"
                            alt="Code Ignite"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                        Welcome to the future.
                    </h1>
                    <p className="text-white/70 max-w-sm text-sm md:text-base leading-relaxed">
                        Connect your preferred AI provider to ignite your coding engine.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* ─── Provider Selection ─── */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-white/50 ml-1 flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5" />
                            AI Engine
                        </label>
                        <div className="relative">
                            <select
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value as ApiProvider)}
                                className="w-full appearance-none bg-white/10 backdrop-blur-xl
                                    border border-white/20 text-white
                                    px-5 py-4 rounded-xl text-sm
                                    focus:outline-none focus:ring-2 focus:ring-white/20
                                    focus:border-white/30 transition-all cursor-pointer"
                            >
                                {PROVIDERS.map(p => (
                                    <option key={p} value={p} className="bg-slate-900 text-white">
                                        {p}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* ─── API Key Input ─── */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-medium uppercase tracking-widest text-white/50 flex items-center gap-2">
                                <Key className="w-3.5 h-3.5" />
                                Access Key
                            </label>
                            {apiKeyLinks[selectedProvider] && (
                                <a
                                    href={apiKeyLinks[selectedProvider]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                                >
                                    Get API Key
                                </a>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                autoComplete="new-password"
                                className="w-full bg-white/10 backdrop-blur-xl
                                    border border-white/20 text-white
                                    px-5 py-4 rounded-xl text-sm
                                    focus:outline-none focus:ring-2 focus:ring-white/20
                                    focus:border-white/30 transition-all
                                    placeholder:text-white/40"
                                style={{ WebkitBoxShadow: '0 0 0 1000px rgba(255,255,255,0.05) inset' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-4 top-1/2 -translate-y-1/2
                                           text-white/50 hover:text-white transition-colors"
                            >
                                {showKey
                                    ? <EyeOff className="w-4 h-4" />
                                    : <Eye className="w-4 h-4" />
                                }
                            </button>
                        </div>
                    </div>

                    {/* ─── OpenAI Compatible Base URL ─── */}
                    {selectedProvider === 'OpenAI-compatible' && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-widest text-white/50 ml-1">
                                Base URL
                            </label>
                            <input
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="https://your-endpoint.com/v1"
                                autoComplete="new-password"
                                className="w-full bg-white/10 backdrop-blur-xl
                                    border border-white/20 text-white
                                    px-5 py-4 rounded-xl text-sm
                                    focus:outline-none focus:ring-2 focus:ring-white/20
                                    focus:border-white/30 transition-all
                                    placeholder:text-white/40"
                                style={{ WebkitBoxShadow: '0 0 0 1000px rgba(255,255,255,0.05) inset' }}
                            />
                        </div>
                    )}

                    {/* ─── Model Selection ─── */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-white/50 ml-1">
                            Available Model
                        </label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full appearance-none bg-white/10 backdrop-blur-xl
                                border border-white/20 text-white
                                px-5 py-4 rounded-xl text-sm
                                focus:outline-none focus:ring-2 focus:ring-white/20
                                focus:border-white/30 transition-all cursor-pointer"
                        >
                            {(modelsByProvider[selectedProvider] ?? []).map((model) => (
                                <option key={model} value={model} className="bg-slate-900 text-white">
                                    {model}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ─── Submit Button with HoverBorderGradient ─── */}
                    <HoverBorderGradient
                        as="button"
                        containerClassName="w-full rounded-full mt-4"
                        className={cn(
                            "w-full text-sm font-semibold transition-all duration-300",
                            apiKey.trim()
                                ? "text-black" // Changed to black
                                : "text-black/30 cursor-not-allowed pointer-events-none" // Changed to black/30
                        )}
                        onClick={apiKey.trim() ? handleSubmit : undefined}
                        duration={1.2}
                        clockwise={true}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                <span>Igniting...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span>Ignite Engine</span>
                                <ArrowRight className="w-4 h-4 text-orange-600" />
                            </div>
                        )}
                    </HoverBorderGradient>
                </div>
            </motion.div>
        </div>
    );
};
