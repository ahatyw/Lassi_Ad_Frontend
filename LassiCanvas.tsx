'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';

const FRAME_COUNT = 224;

export default function LassiCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);

    // Normalized progress of the video playback (0.0 to 1.0)
    const videoProgress = useMotionValue(0);

    // Preload images
    useEffect(() => {
        let loadedCount = 0;
        const loadedImages: HTMLImageElement[] = [];

        for (let i = 0; i < FRAME_COUNT; i++) {
            const img = new Image();
            const frameIndex = i.toString().padStart(3, '0');
            img.src = `/sequence/frame_${frameIndex}.jpg`;
            img.onload = () => {
                loadedCount++;
                setLoadProgress(Math.floor((loadedCount / FRAME_COUNT) * 100));
                if (loadedCount === FRAME_COUNT) {
                    setImages(loadedImages);
                    setIsLoading(false);
                }
            };
            loadedImages[i] = img;
        }
    }, []);

    // Frame rendering logic
    const renderFrame = (index: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !images[index]) return;

        const img = images[index];

        // Contain fit logic to maintain ultra HD graphics
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;
        canvas.width = canvasWidth * window.devicePixelRatio;
        canvas.height = canvasHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const imgRatio = img.width / img.height;
        const canvasRatio = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            offsetX = 0;
            offsetY = (canvasHeight - drawHeight) / 2;
        } else {
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
            offsetX = (canvasWidth - drawWidth) / 2;
            offsetY = 0;
        }

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Update CSS variables for watermark positioning relative to the drawn image
        if (containerRef.current) {
            containerRef.current.style.setProperty('--img-offset-x', `${offsetX}px`);
            containerRef.current.style.setProperty('--img-offset-y', `${offsetY}px`);
        }
    };

    const currentFrameRef = useRef(0);
    const lastDrawTimeRef = useRef(0);

    useEffect(() => {
        if (isLoading || images.length === 0) return;

        let animationId: number;
        const TARGET_FPS = 30; // Smooth cinematic playback loop
        const frameInterval = 1000 / TARGET_FPS;

        const playLoop = (timestamp: number) => {
            if (timestamp - lastDrawTimeRef.current >= frameInterval) {
                currentFrameRef.current = (currentFrameRef.current + 1) % FRAME_COUNT;
                renderFrame(currentFrameRef.current);
                // Sync the text animations to the video timeline instead of scroll
                videoProgress.set(currentFrameRef.current / (FRAME_COUNT - 1));
                lastDrawTimeRef.current = timestamp;
            }
            animationId = requestAnimationFrame(playLoop);
        };

        animationId = requestAnimationFrame(playLoop);

        return () => cancelAnimationFrame(animationId);
    }, [isLoading, images]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            renderFrame(currentFrameRef.current);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [images, isLoading]);

    return (
        <div ref={containerRef} className="relative h-screen w-full bg-[#050505] overflow-hidden [--img-offset-x:0px] [--img-offset-y:0px]">
            {/* Canvas Container */}
            <div className="absolute inset-0 flex items-center justify-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${loadProgress}%` }}
                            />
                        </div>
                        <p className="text-white/40 text-sm font-light tracking-widest uppercase">
                            Preparing the Experience {loadProgress}%
                        </p>
                    </div>
                ) : (
                    <>
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full object-contain relative z-0"
                        />
                        {/* Ambient Video Glow / Vignette */}
                        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_150px_rgba(251,191,36,0.15)] bg-[radial-gradient(circle_at_center,transparent_40%,rgba(5,5,5,0.6)_100%)]" />
                    </>
                )}

                {/* Heritage Seal (Watermark Concealment) */}
                {!isLoading && (
                    <div className="absolute inset-0 pointer-events-none z-[60]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute flex items-center justify-center p-3 text-center origin-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl pointer-events-none"
                            style={{
                                bottom: 'calc(var(--img-offset-y) - 0.5rem)',
                                right: 'calc(var(--img-offset-x) - 1rem)'
                            }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                className="relative w-32 h-32 flex items-center justify-center -m-3"
                            >
                                {/* Outer dashed ring with strong background to block watermark */}
                                <div className="absolute inset-1 border border-dashed border-accent/30 rounded-full bg-[#050505]/70 backdrop-blur-lg" />

                                <div className="relative z-10 flex flex-col items-center space-y-1">
                                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-accent/80 mt-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-accent/90 leading-tight">
                                        100%<br />Authentic<br />Amritsari
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Scrollytelling Content Layers synced to Video loop */}
            <ContentOverlay progress={videoProgress} />
        </div>
    );
}

function ContentOverlay({ progress }: { progress: any }) {
    // Beat A: 0-25% - Fly from inside screen to screen, stay (slightly moving), fly out
    const beatAOpacity = useTransform(progress, [0, 0.03, 0.22, 0.25], [0, 1, 1, 0]);
    const beatAScale = useTransform(progress, [0, 0.03, 0.22, 0.25], [0.3, 0.95, 1.05, 3]);
    const beatAShadow = useTransform(progress, [0, 0.03, 0.22, 0.25], [
        "0 0 0px rgba(255,255,255,0)",
        "0 0 40px rgba(255,165,0,0.4), 0 0 80px rgba(255,215,0,0.2)",
        "0 0 40px rgba(255,165,0,0.4), 0 0 80px rgba(255,215,0,0.2)",
        "0 0 150px rgba(255,255,255,0.8), 0 0 300px rgba(255,165,0,0.4)"
    ]);

    // Beat B: 25-50% - Fly from inside left, to screen, stay (slightly moving), fly out
    const beatBOpacity = useTransform(progress, [0.25, 0.28, 0.47, 0.5], [0, 1, 1, 0]);
    const beatBScale = useTransform(progress, [0.25, 0.28, 0.47, 0.5], [0.3, 0.95, 1.05, 3]);
    const beatBX = useTransform(progress, [0.25, 0.28, 0.47, 0.5], ["-40vw", "-2vw", "2vw", "40vw"]);
    const beatBShadow = useTransform(progress, [0.25, 0.28, 0.47, 0.5], [
        "-100px 0 80px rgba(255,165,0,0.6), -50px 0 40px rgba(255,215,0,0.4)",
        "0 0 30px rgba(255,255,255,0.2)",
        "0 0 30px rgba(255,255,255,0.2)",
        "150px 0 100px rgba(255,165,0,0.8), 100px 0 60px rgba(255,215,0,0.6)"
    ]);

    // Beat C: 50-75% - Fly from behind right, to screen, stay (slightly moving), fly out
    const beatCOpacity = useTransform(progress, [0.5, 0.53, 0.72, 0.75], [0, 1, 1, 0]);
    const beatCScale = useTransform(progress, [0.5, 0.53, 0.72, 0.75], [0.3, 0.95, 1.05, 3]);
    const beatCX = useTransform(progress, [0.5, 0.53, 0.72, 0.75], ["40vw", "2vw", "-2vw", "-40vw"]);
    const beatCShadow = useTransform(progress, [0.5, 0.53, 0.72, 0.75], [
        "100px 0 80px rgba(255,165,0,0.6), 50px 0 40px rgba(255,215,0,0.4)",
        "0 0 30px rgba(255,255,255,0.2)",
        "0 0 30px rgba(255,255,255,0.2)",
        "-150px 0 100px rgba(255,165,0,0.8), -100px 0 60px rgba(255,215,0,0.6)"
    ]);

    // Beat D: 75-100% - Appear from out of screen (large), fly towards screen, stay (slightly moving), slowly fade
    const beatDOpacity = useTransform(progress, [0.75, 0.8, 0.95, 1], [0, 1, 1, 0]);
    const beatDScale = useTransform(progress, [0.75, 0.8, 0.95, 1], [4, 1.1, 0.95, 0.85]);
    const beatDShadow = useTransform(progress, [0.75, 0.85, 0.95, 1], [
        "0 0 200px rgba(255,255,255,0.8), 0 0 400px rgba(255,215,0,0.4)",
        "0 0 40px rgba(255,215,0,0.3)",
        "0 0 40px rgba(255,215,0,0.3)",
        "0 0 0px rgba(0,0,0,0)"
    ]);

    const cyberGlowTitle = { textShadow: "0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(255,255,255,0.4)" };
    const cyberGlowAccent = { textShadow: "0 0 30px rgba(251,191,36,1), 0 0 60px rgba(251,191,36,0.8), 0 0 100px rgba(251,191,36,0.5)" };
    const cyberGlowP = { textShadow: "0 0 5px rgba(255,255,255,1), 0 0 15px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.4), 0 0 50px rgba(255,255,255,0.2)" };

    const glassPanelClass = "bg-transparent p-8 rounded-3xl border border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2),inset_0_0_20px_rgba(255,255,255,0.2)] transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.4),inset_0_0_40px_rgba(255,255,255,0.4)]";

    return (
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
            {/* Beat A */}
            <motion.div
                style={{ opacity: beatAOpacity, scale: beatAScale }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            >
                <motion.div className={glassPanelClass} style={{ boxShadow: beatAShadow }}>
                    <h2 className="text-6xl md:text-9xl font-black tracking-tighter text-white/90" style={cyberGlowTitle}>
                        THE <span className="text-accent" style={cyberGlowAccent}>LIQUID GOLD</span>
                    </h2>
                    <p className="mt-6 text-black text-xl font-black tracking-wide" style={cyberGlowP}>
                        Amritsar's rich heritage, spun into absolute perfection.
                    </p>
                </motion.div>
            </motion.div>

            {/* Beat B */}
            <motion.div
                style={{ opacity: beatBOpacity, scale: beatBScale, x: beatBX }}
                className="absolute inset-0 flex flex-col items-start justify-center px-12 md:px-24"
            >
                <motion.div className={`${glassPanelClass} max-w-2xl`} style={{ boxShadow: beatBShadow }}>
                    <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white/90" style={cyberGlowTitle}>
                        THE <span className="text-accent" style={cyberGlowAccent}>SLOW CHURN</span>
                    </h2>
                    <p className="mt-6 text-black text-xl font-black tracking-wide" style={cyberGlowP}>
                        Pure, thick curd frothed traditionally in wooden madhanis for that unmatched, airy texture.
                    </p>
                </motion.div>
            </motion.div>

            {/* Beat C */}
            <motion.div
                style={{ opacity: beatCOpacity, scale: beatCScale, x: beatCX }}
                className="absolute inset-0 flex flex-col items-end justify-center text-right ml-auto px-12 md:px-24"
            >
                <motion.div className={`${glassPanelClass} max-w-2xl`} style={{ boxShadow: beatCShadow }}>
                    <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white/90 leading-tight" style={cyberGlowTitle}>
                        THE CROWN <br /> OF <span className="text-accent" style={cyberGlowAccent}>MALAI</span>
                    </h2>
                    <p className="mt-6 text-black text-xl font-black tracking-wide" style={cyberGlowP}>
                        A decadent, impossibly thick layer of fresh cream that demands a spoon, not a straw.
                    </p>
                </motion.div>
            </motion.div>

            {/* Beat D */}
            <motion.div
                style={{ opacity: beatDOpacity, scale: beatDScale }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            >
                <motion.div className={`${glassPanelClass} flex flex-col items-center`} style={{ boxShadow: beatDShadow }}>
                    <h2 className="text-6xl md:text-9xl font-black tracking-tighter text-white/90" style={cyberGlowTitle}>
                        TASTE <span className="text-accent" style={cyberGlowAccent}>TRADITION</span>
                    </h2>
                    <p className="mt-6 text-black text-xl max-w-2xl font-black tracking-wide" style={cyberGlowP}>
                        Experience the authentic Peda Lassi of Punjab.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(251, 191, 36, 0.4)", boxShadow: "0 0 60px rgba(251, 191, 36, 0.9)" }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-10 px-14 py-5 border-2 border-accent rounded-full text-accent tracking-[0.4em] font-black uppercase text-sm backdrop-blur-md pointer-events-auto transition-all shadow-[0_0_40px_rgba(251,191,36,0.6)] bg-black/60"
                    >
                        Order Now
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
}
