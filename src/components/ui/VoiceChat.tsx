import { useState, useEffect, useRef } from "react";
import { Mic, Volume2, VolumeX, Sparkles, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface VoiceChatProps {
    onTranscriptionResult: (text: string) => void;
    onClose: () => void;
    className?: string;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    velocity: { x: number; y: number };
}

export function VoiceChat({
    onTranscriptionResult,
    onClose,
    className
}: VoiceChatProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);
    const [duration, setDuration] = useState(0);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [waveformData, setWaveformData] = useState<number[]>(Array(32).fill(0));
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        // Escape to close
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Generate particles for ambient effect
    useEffect(() => {
        const generateParticles = () => {
            const newParticles: Particle[] = [];
            for (let i = 0; i < 20; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 400,
                    y: Math.random() * 400,
                    size: Math.random() * 3 + 1,
                    opacity: Math.random() * 0.3 + 0.1,
                    velocity: {
                        x: (Math.random() - 0.5) * 0.5,
                        y: (Math.random() - 0.5) * 0.5
                    }
                });
            }
            setParticles(newParticles);
        };

        generateParticles();
    }, []);

    // Animate particles
    useEffect(() => {
        const animateParticles = () => {
            setParticles(prev => prev.map(particle => ({
                ...particle,
                x: (particle.x + particle.velocity.x + 400) % 400,
                y: (particle.y + particle.velocity.y + 400) % 400,
                opacity: particle.opacity + (Math.random() - 0.5) * 0.02
            })));
            animationRef.current = requestAnimationFrame(animateParticles);
        };

        animationRef.current = requestAnimationFrame(animateParticles);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Timer and waveform 
    useEffect(() => {
        if (isListening) {
            intervalRef.current = setInterval(() => {
                setDuration(prev => prev + 1);

                // Use live audio data if available
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);

                    // Map the frequency data to our 32-bar waveform
                    const step = Math.floor(dataArray.length / 32);
                    const newWaveform = Array(32).fill(0).map((_, i) => {
                        const val = dataArray[i * step];
                        return (val / 255) * 100; // normalize 0-100
                    });
                    setWaveformData(newWaveform);

                    // Calc average volume
                    const sum = dataArray.reduce((a, b) => a + b, 0);
                    const avg = sum / (dataArray.length || 1);
                    setVolume((avg / 255) * 100);
                } else {
                    // Fallback simulation
                    const newWaveform = Array(32).fill(0).map(() => Math.random() * 100);
                    setWaveformData(newWaveform);
                    setVolume(Math.random() * 100);
                }
            }, 100);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setWaveformData(Array(32).fill(0));
            setVolume(0);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isListening]);

    const cleanupAudio = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
    }

    const startRecording = async () => {
        try {
            setErrorMsg(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio visualizer context
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Note: using webm since Whisper supports it well
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(100);
            setIsListening(true);
        } catch (err) {
            console.error("Microphone access denied:", err);
            setErrorMsg("Microphone permission denied. Please allow access in your browser.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.onstop = async () => {
                cleanupAudio();
                setIsProcessing(true);

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                const formData = new FormData();
                formData.append('file', audioBlob, 'audio.webm');

                try {
                    const res = await fetch('/api/stt', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();

                    if (data.success && data.text) {
                        setIsSpeaking(true);
                        setTimeout(() => {
                            onTranscriptionResult(data.text);
                            setIsSpeaking(false);
                            onClose();
                        }, 1000);
                    } else {
                        setErrorMsg(data.error || "Failed to transcribe audio.");
                        setIsProcessing(false);
                        setDuration(0);
                    }
                } catch (err) {
                    console.error("STT Error:", err);
                    setErrorMsg("Network error connecting to transcription server.");
                    setIsProcessing(false);
                    setDuration(0);
                }
            };
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const handleToggleListening = () => {
        if (isListening) {
            stopRecording();
        } else {
            setDuration(0);
            startRecording();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getStatusText = () => {
        if (errorMsg) return errorMsg;
        if (isListening) return "Listening... Tap to stop";
        if (isProcessing) return "Transcribing...";
        if (isSpeaking) return "Done!";
        return "Tap mic to speak";
    };

    const getStatusColor = () => {
        if (errorMsg) return "text-red-400";
        if (isListening) return "text-blue-400";
        if (isProcessing) return "text-yellow-400";
        if (isSpeaking) return "text-green-400";
        return "text-[hsl(var(--muted-foreground))]";
    };

    return (
        <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center bg-[hsl(var(--background))]/95 backdrop-blur-xl relative overflow-hidden", className)}>

            {/* Close Button */}
            <button
                onClick={() => { cleanupAudio(); onClose(); }}
                className="absolute top-6 right-6 z-50 p-2 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Ambient particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        className="absolute w-1 h-1 bg-[hsl(var(--primary))]/20 rounded-full"
                        style={{
                            left: particle.x,
                            top: particle.y,
                            opacity: particle.opacity
                        }}
                        animate={{
                            scale: [1, 1.5, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Background glow effects */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    className="w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl"
                    animate={{
                        scale: isListening ? [1, 1.2, 1] : [1, 1.1, 1],
                        opacity: isListening ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-8">
                {/* Main voice button */}
                <motion.div
                    className="relative"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.button
                        onClick={handleToggleListening}
                        disabled={isProcessing || isSpeaking}
                        className={cn(
                            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                            "bg-gradient-to-br from-[hsl(var(--primary))]/20 to-[hsl(var(--primary))]/10 border-2",
                            isListening ? "border-blue-500 shadow-lg shadow-blue-500/25" :
                                isProcessing ? "border-yellow-500 shadow-lg shadow-yellow-500/25" :
                                    isSpeaking ? "border-green-500 shadow-lg shadow-green-500/25" :
                                        "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50"
                        )}
                        animate={{
                            boxShadow: isListening
                                ? ["0 0 0 0 rgba(59, 130, 246, 0.4)", "0 0 0 20px rgba(59, 130, 246, 0)"]
                                : undefined
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: isListening ? Infinity : 0
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {isProcessing ? (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                                </motion.div>
                            ) : isSpeaking ? (
                                <motion.div
                                    key="speaking"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <Volume2 className="w-12 h-12 text-green-500" />
                                </motion.div>
                            ) : isListening ? (
                                <motion.div
                                    key="listening"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <Mic className="w-12 h-12 text-blue-500" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <Mic className="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>

                    {/* Pulse rings */}
                    <AnimatePresence>
                        {isListening && (
                            <>
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-blue-500/30"
                                    initial={{ scale: 1, opacity: 0.6 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeOut"
                                    }}
                                />
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-blue-500/20"
                                    initial={{ scale: 1, opacity: 0.4 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeOut",
                                        delay: 0.5
                                    }}
                                />
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Waveform visualizer */}
                <div className="flex items-center justify-center space-x-1 h-16 w-full max-w-[200px] overflow-hidden">
                    {waveformData.map((height, index) => (
                        <motion.div
                            key={index}
                            className={cn(
                                "w-1 rounded-full transition-colors duration-300",
                                isListening ? "bg-blue-500" :
                                    isProcessing ? "bg-yellow-500" :
                                        isSpeaking ? "bg-green-500" :
                                            "bg-[hsl(var(--muted))]"
                            )}
                            animate={{
                                height: `${Math.max(4, height * 0.6)}px`,
                                opacity: isListening || isSpeaking ? 1 : 0.3
                            }}
                            transition={{
                                duration: 0.1,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>

                {/* Status and timer */}
                <div className="text-center space-y-2 max-w-sm px-4">
                    <motion.p
                        className={cn("text-lg font-medium transition-colors", getStatusColor())}
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{
                            duration: 2,
                            repeat: isListening || isProcessing || isSpeaking ? Infinity : 0
                        }}
                    >
                        {getStatusText()}
                    </motion.p>

                    <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">
                        {formatTime(duration)}
                    </p>

                    {/* Volume specific to AudioContext, nicely integrated */}
                    {volume > 0 && isListening && (
                        <motion.div
                            className="flex items-center justify-center space-x-2 pt-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <VolumeX className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            <div className="w-24 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500 rounded-full"
                                    animate={{ width: `${Math.min(100, volume * 2)}%` }} // amplify visually
                                    transition={{ duration: 0.1 }}
                                />
                            </div>
                            <Volume2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        </motion.div>
                    )}
                </div>

                {/* AI indicator */}
                <motion.div
                    className="flex items-center space-x-2 text-sm text-[hsl(var(--primary))] opacity-80"
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Whisper Model</span>
                </motion.div>
            </div>
        </div>
    );
}
