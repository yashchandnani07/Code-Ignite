import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Key, Sparkles, Cpu, X } from 'lucide-react';
import { LiquidGlassCard } from './ui/liquid-glass';
import type { ApiProvider } from '../types';
import { AI_MODELS, getDefaultModel } from '../constants/models';
import { validateApiKey } from '../services/aiValidate';

const PROVIDERS: ApiProvider[] = ['Google AI', 'Openrouter', 'Openai', 'Claude', 'OpenAI-compatible'];

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
    const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'invalid'>('idle');
    const [keyError, setKeyError] = useState<string | null>(null);

    // If changing provider, ensure we load default model
    useEffect(() => {
        const defaultModel = getDefaultModel(selectedProvider);
        if (defaultModel) setSelectedModel(defaultModel);
        setKeyStatus('idle');
        setKeyError(null);
    }, [selectedProvider, setSelectedModel]);

    const handleVerifyAndStart = async () => {
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
                // Once valid, we dismiss the blocking overlay
                onDismiss();
            } else {
                setKeyStatus('invalid');
                setKeyError(result.error || 'Invalid API key or model for this provider.');
            }
        } catch {
            setKeyStatus('invalid');
            setKeyError('Unable to validate key. Please try again.');
        }
    };

    const getLinkForProvider = (provider: ApiProvider) => {
        switch (provider) {
            case 'Google AI': return 'https://aistudio.google.com/app/apikey';
            case 'Openrouter': return 'https://openrouter.ai/keys';
            case 'Openai': return 'https://platform.openai.com/api-keys';
            case 'Claude': return 'https://console.anthropic.com/settings/keys';
            default: return null;
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center isolation-auto bg-black/10 backdrop-blur-[2px]"
            >
                <LiquidGlassCard
                    initial={{ y: 20, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.1 }}
                    blurIntensity="md"
                    shadowIntensity="lg"
                    glowIntensity="lg"
                    borderRadius="28px"
                    className="relative w-[85vw] md:w-[500px] p-8 md:p-10"
                >
                    <button 
                        onClick={onDismiss} 
                        className="absolute top-6 right-6 p-2 text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors rounded-full z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8 relative z-20">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner mb-2 relative">
                            <Sparkles className="w-8 h-8 text-white/90" />
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                            Welcome to the future.
                        </h1>
                        <p className="text-[#a1a1aa] max-w-sm text-sm md:text-base leading-relaxed">
                            Connect your preferred AI provider to ignite your coding engine.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Provider Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-widest text-[#a1a1aa] ml-1 flex items-center gap-2">
                                <Cpu className="w-3.5 h-3.5" />
                                AI Engine
                            </label>
                            <div className="relative">
                                <select 
                                    value={selectedProvider}
                                    onChange={(e) => setSelectedProvider(e.target.value as ApiProvider)}
                                    className="w-full appearance-none bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all backdrop-blur-md cursor-pointer"
                                >
                                    {PROVIDERS.map(p => (
                                        <option key={p} value={p} className="bg-[#18191c] text-white">
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* API Key Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-xs font-medium uppercase tracking-widest text-[#a1a1aa] flex items-center gap-2">
                                    <Key className="w-3.5 h-3.5" />
                                    Access Key
                                </label>
                                {getLinkForProvider(selectedProvider) && (
                                    <a 
                                        href={getLinkForProvider(selectedProvider)!} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors underline decoration-indigo-300/30 underline-offset-4"
                                    >
                                        Get API Key
                                    </a>
                                )}
                            </div>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all backdrop-blur-md placeholder:text-white/20"
                            />
                            {keyStatus === 'invalid' && (
                                <p className="text-xs text-red-400 font-medium ml-1 mt-2">
                                    {keyError || 'Verification failed.'}
                                </p>
                            )}
                        </div>

                        {/* OpenAI Compatible specific input */}
                        {selectedProvider === 'OpenAI-compatible' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-xs font-medium uppercase tracking-widest text-[#a1a1aa] ml-1">
                                    Base URL
                                </label>
                                <input
                                    type="text"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    placeholder="https://your-endpoint.com/v1"
                                    className="w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all backdrop-blur-md placeholder:text-white/20"
                                />
                            </div>
                        )}

                        {/* Model Overrides dropdown */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-widest text-[#a1a1aa] ml-1">
                                Default Model
                            </label>
                            <select 
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full appearance-none bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all backdrop-blur-md cursor-pointer"
                            >
                                {(AI_MODELS[selectedProvider] || []).map(m => (
                                    <option key={m.id} value={m.id} className="bg-[#18191c] text-white">
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleVerifyAndStart}
                            disabled={!apiKey || keyStatus === 'testing'}
                            className="w-full bg-white text-black hover:bg-white/90 active:scale-[0.98] transition-all px-5 py-4 rounded-xl text-sm md:text-base font-semibold flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {keyStatus === 'testing' ? (
                                <span className="animate-pulse">Verifying...</span>
                            ) : (
                                <>
                                    Ignite Engine
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </LiquidGlassCard>
            </motion.div>
        </AnimatePresence>
    );
};
