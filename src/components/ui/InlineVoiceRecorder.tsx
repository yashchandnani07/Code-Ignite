import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, VolumeX, Sparkles, Loader2, X, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InlineVoiceRecorderProps {
    onTranscriptionResult: (text: string) => void;
    onClose: () => void;
}

export function InlineVoiceRecorder({ onTranscriptionResult, onClose }: InlineVoiceRecorderProps) {
    const [phase, setPhase] = useState<'idle' | 'listening' | 'processing' | 'done' | 'error'>('idle');
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0);
    const [waveform, setWaveform] = useState<number[]>(Array(20).fill(2));
    const [errorMsg, setErrorMsg] = useState('');

    // Use refs to avoid stale-closure bugs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // A ref that tracks whether we are actively recording (not subject to closure)
    const isListeningRef = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCleanup();
        };
    }, []);

    const stopCleanup = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) audioCtxRef.current.close().catch(() => { });
        streamRef.current = null;
        audioCtxRef.current = null;
        analyserRef.current = null;
        isListeningRef.current = false;
    };

    const startWaveformLoop = () => {
        const tick = () => {
            if (!analyserRef.current || !isListeningRef.current) return;
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            const step = Math.floor(data.length / 20);
            const bars = Array(20).fill(0).map((_, i) => Math.max(2, (data[i * step] / 255) * 40));
            setWaveform(bars);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setVolume(avg / 255);
            animFrameRef.current = requestAnimationFrame(tick);
        };
        animFrameRef.current = requestAnimationFrame(tick);
    };

    const startRecording = async () => {
        try {
            setErrorMsg('');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            audioCtxRef.current = audioCtx;
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = handleRecorderStop;
            recorder.start(100);
            mediaRecorderRef.current = recorder;
            isListeningRef.current = true;

            setPhase('listening');
            setDuration(0);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
            startWaveformLoop();
        } catch {
            setErrorMsg('Microphone permission denied.');
            setPhase('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListeningRef.current) {
            isListeningRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            mediaRecorderRef.current.stop();
            // Stream and audio context will be cleaned in handleRecorderStop
        }
    };

    const handleRecorderStop = async () => {
        // Cleanup audio resources
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => { }); audioCtxRef.current = null; }

        setPhase('processing');
        setWaveform(Array(20).fill(2));

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('file', blob, 'audio.webm');

        try {
            const res = await fetch('/api/stt', { method: 'POST', body: form });
            const data = await res.json();
            if (data.success && data.text) {
                setPhase('done');
                setTimeout(() => {
                    onTranscriptionResult(data.text);
                    onClose();
                }, 600);
            } else {
                setErrorMsg(data.error || 'Transcription failed.');
                setPhase('error');
            }
        } catch {
            setErrorMsg('Network error connecting to server.');
            setPhase('error');
        }
    };

    const handleMainButton = () => {
        if (phase === 'idle' || phase === 'error') startRecording();
        else if (phase === 'listening') stopRecording();
    };

    const formatTime = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="flex items-center gap-3 w-full px-2 py-2 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
            {/* Main mic/stop button */}
            <motion.button
                type="button"
                onClick={handleMainButton}
                disabled={phase === 'processing' || phase === 'done'}
                whileTap={{ scale: 0.9 }}
                className={[
                    "relative w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors",
                    phase === 'listening' ? "bg-red-500/20 border-2 border-red-500 text-red-400" :
                        phase === 'processing' ? "bg-yellow-500/10 border-2 border-yellow-500 text-yellow-400" :
                            phase === 'done' ? "bg-green-500/10  border-2 border-green-500  text-green-400" :
                                phase === 'error' ? "bg-red-500/10    border-2 border-red-400    text-red-400" :
                                    "bg-blue-500/10 border-2 border-blue-500 text-blue-400 hover:bg-blue-500/20"
                ].join(' ')}
            >
                <AnimatePresence mode="wait">
                    {phase === 'processing' ? (
                        <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </motion.span>
                    ) : phase === 'listening' ? (
                        <motion.span key="stop" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <Square className="w-4 h-4 fill-current" />
                        </motion.span>
                    ) : (
                        <motion.span key="mic" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <Mic className="w-5 h-5" />
                        </motion.span>
                    )}
                </AnimatePresence>
                {/* Pulse ring when listening */}
                {phase === 'listening' && (
                    <motion.span
                        className="absolute inset-0 rounded-full border-2 border-red-400"
                        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                    />
                )}
            </motion.button>

            {/* Waveform / status area */}
            <div className="flex-1 min-w-0">
                {phase === 'listening' && (
                    <div className="flex items-end gap-[2px] h-8">
                        {waveform.map((h, i) => (
                            <motion.div
                                key={i}
                                className="flex-1 bg-blue-400 rounded-full"
                                animate={{ height: h }}
                                transition={{ duration: 0.1 }}
                                style={{ minHeight: 2 }}
                            />
                        ))}
                    </div>
                )}
                {(phase === 'idle' || phase === 'error') && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {phase === 'error' ? <span className="text-red-400">{errorMsg}</span> : 'Tap ● to start recording'}
                    </p>
                )}
                {phase === 'processing' && (
                    <p className="text-xs text-yellow-400 animate-pulse">Transcribing with Whisper...</p>
                )}
                {phase === 'done' && (
                    <p className="text-xs text-green-400">Done! Inserting text...</p>
                )}
            </div>

            {/* Timer + volume + close */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {phase === 'listening' && (
                    <>
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{formatTime(duration)}</span>
                        <div className="flex items-center gap-1">
                            {volume < 0.05
                                ? <VolumeX className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                                : <Volume2 className="w-3 h-3 text-blue-400" />
                            }
                            <div className="w-12 h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                                <motion.div className="h-full bg-blue-400 rounded-full" animate={{ width: `${Math.min(100, volume * 200)}%` }} transition={{ duration: 0.1 }} />
                            </div>
                        </div>
                    </>
                )}
                {(phase !== 'processing' && phase !== 'done') && (
                    <button
                        type="button"
                        onClick={() => { stopCleanup(); onClose(); }}
                        className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                        title="Cancel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
                {phase === 'idle' && (
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Whisper
                    </span>
                )}
            </div>
        </div>
    );
}
