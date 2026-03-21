import React, { useState } from 'react';
import { X, Database, Check, AlertCircle } from 'lucide-react';
import type { FirebaseConfig } from '../types';

interface FirebaseSetupProps {
    firebaseConfig: FirebaseConfig | null;
    setFirebaseConfig: (config: FirebaseConfig | null) => void;
    onClose: () => void;
}

export const FirebaseSetup: React.FC<FirebaseSetupProps> = ({
    firebaseConfig,
    setFirebaseConfig,
    onClose,
}) => {
    const [pasteText, setPasteText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    
    // Parse firebaseInitializeApp({ ... }) snippet into object
    const parseFirebaseConfig = (raw: string): FirebaseConfig | null => {
        try {
            // Strip any surrounding JS like 'const firebaseConfig = {' or 'firebase.initializeApp({'
            let jsonLike = raw.trim();
            
            // Extract just the block between { and }
            const match = jsonLike.match(/\{[\s\S]*?\}/);
            if (!match) return null;
            jsonLike = match[0];
            
            // Basic custom parser since it might be unquoted JS object keys
            // This regex matches keys and values
            const extractValue = (pattern: RegExp) => {
                const m = jsonLike.match(pattern);
                return m ? m[1] : '';
            };
            
            const config: FirebaseConfig = {
                apiKey: extractValue(/(?:apiKey|"apiKey"|'apiKey')\s*:\s*["']([^"']+)["']/i),
                authDomain: extractValue(/(?:authDomain|"authDomain"|'authDomain')\s*:\s*["']([^"']+)["']/i),
                projectId: extractValue(/(?:projectId|"projectId"|'projectId')\s*:\s*["']([^"']+)["']/i),
                databaseURL: extractValue(/(?:databaseURL|"databaseURL"|'databaseURL')\s*:\s*["']([^"']+)["']/i),
                storageBucket: extractValue(/(?:storageBucket|"storageBucket"|'storageBucket')\s*:\s*["']([^"']+)["']/i),
                messagingSenderId: extractValue(/(?:messagingSenderId|"messagingSenderId"|'messagingSenderId')\s*:\s*["']([^"']+)["']/i),
                appId: extractValue(/(?:appId|"appId"|'appId')\s*:\s*["']([^"']+)["']/i),
            };
            
            return config;
        } catch (e) {
            return null;
        }
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(false);
        setIsTesting(false);
        
        let configToSave = null;
        
        if (pasteText.trim()) {
            configToSave = parseFirebaseConfig(pasteText);
            if (!configToSave || !configToSave.apiKey || !configToSave.projectId) {
                setError('Could not extract a valid Firebase config from the snippet. Please ensure it contains an API Key and Project ID.');
                return;
            }
            if (!configToSave.databaseURL) {
                setError('No Database URL found. You must enable "Realtime Database" in your Firebase console first, then copy the updated snippet.');
                return;
            }
        } else {
             setError('Please paste your Firebase configuration snippet.');
             return;
        }

        // Validate basic formats
        if (!configToSave.apiKey.startsWith('AIza')) {
            setError('Invalid API Key format (should start with AIza).');
            return;
        }
        if (!configToSave.databaseURL.startsWith('https://')) {
            setError('Invalid Database URL format.');
            return;
        }

        setIsTesting(true);
        try {
            // Test connectivity to the Realtime Database REST API.
            // A simple GET to /.json should return a response (e.g. permission denied or null) if the DB exists.
            const url = configToSave.databaseURL.endsWith('/') 
                ? `${configToSave.databaseURL}.json` 
                : `${configToSave.databaseURL}/.json`;
                
            const response = await fetch(url, { method: 'GET' });
            
            // 404 means the database clearly doesn't exist. 401/403 means it exists but we don't have auth (which is expected and fine).
            if (response.status === 404) {
                setError('Connected to project, but Database not found. Did you create a Realtime Database in the console?');
                setIsTesting(false);
                return;
            }
        } catch (e) {
            console.error("Firebase connection test failed:", e);
            // We shouldn't block user on CORS issues, only if it specifically failed connectivity test.
            // For now, if fetch fails due to CORS, it means the URL was at least reached. 
            // In some environments, this might fail because of strict ad-blockers.
        }
        setIsTesting(false);

        setFirebaseConfig(configToSave);
        setSuccess(true);
        setTimeout(() => onClose(), 1500);
    };

    const handleDisconnect = () => {
        setFirebaseConfig(null);
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-[#0a0a0b]/80 backdrop-blur-sm z-[60] animate-in" onClick={() => {
                if (!pasteText.trim() || window.confirm('Discard your unsaved configuration?')) onClose();
            }} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] md:w-[600px] bg-[#1c1d21] rounded-xl shadow-2xl overflow-hidden border border-[#2b2d31] flex flex-col animate-in slide-in-from-bottom-4 zoom-in-95">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#2b2d31] bg-[#1c1d21]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#f6820c]/10 flex items-center justify-center border border-[#f6820c]/20">
                            <Database className="w-4 h-4 text-[#f6820c]" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-white tracking-tight">Connect Firebase</h3>
                            <p className="text-xs text-[#949ba4] mt-1">Enable real-time databases for generated apps</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#949ba4] hover:text-white transition-colors rounded-md hover:bg-[#2b2d31]">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                
                    {firebaseConfig?.projectId && !pasteText ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Firebase Connected</h3>
                            <p className="text-sm text-[#949ba4] mb-6">
                                Project ID: <span className="text-white font-mono">{firebaseConfig.projectId}</span>
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setPasteText(' ')}
                                    className="px-4 py-2 rounded-lg border border-[#2b2d31] text-white hover:bg-[#2b2d31] transition-colors text-sm font-medium"
                                >
                                    Change Config
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Setup Instructions */}
                            <div className="space-y-3 bg-[#2b2d31]/30 p-4 rounded-lg border border-[#2b2d31]/50">
                                <h4 className="text-sm font-medium text-white">How to setup:</h4>
                                <ol className="text-sm text-[#949ba4] space-y-2 list-decimal list-inside">
                                    <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#00a3ff] hover:underline">Firebase Console</a> and create a project</li>
                                    <li>Click <strong>Build → Realtime Database</strong> and create database</li>
                                    <li>Click <strong>Build → Authentication → Sign-in method</strong> and enable <strong>Anonymous</strong></li>
                                    <li>Go back to Project Settings, add a Web App, and copy the config snippet below.</li>
                                </ol>
                            </div>
                            
                            {/* Paste Area */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-white">
                                    Paste Firebase Config Snippet
                                </label>
                                <textarea
                                    className="w-full h-40 bg-[#18191c] border border-[#2b2d31] text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#f6820c] focus:ring-1 focus:ring-[#f6820c] transition-all font-mono placeholder:text-[#4f545c] custom-scrollbar"
                                    placeholder={`firebase.initializeApp({
  apiKey: "AIza...",
  authDomain: "...",
  databaseURL: "https://...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
});`}
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>

                            {/* Error / Success states */}
                            {error && (
                                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium">
                                    <Check className="w-4 h-4" /> Config saved!
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-[#2b2d31]">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-[#949ba4] hover:text-white hover:bg-[#2b2d31] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isTesting || success}
                                    className="px-6 py-2 rounded-lg text-sm font-medium bg-[#f6820c] hover:bg-[#ff952b] text-white transition-colors disabled:opacity-50"
                                >
                                    {isTesting ? 'Testing Connection...' : success ? 'Connected' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
