'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Script from 'next/script';
import { Play, Pause, RotateCcw, Loader2, Video, Activity, Settings, Download, Layout, Eye, Zap, Grid } from 'lucide-react';
import { analyzeKneeBend } from '@/utils/analysisEngine';
import { BallTracker } from '@/utils/ballTracker';
import { clsx } from 'clsx';
import { CourtDetector, Line } from '@/utils/courtDetector';
import { VideoCompressor } from '@/utils/videoCompressor';
import VideoTrimmer from './VideoTrimmer';
import { motion, AnimatePresence } from 'framer-motion';
import { drawRobustSkeleton, SkeletonStyle, fitLandmarks } from '@/utils/drawingUtils';
import { usePose } from '@/context/PoseContext';

interface VideoAnalyzerProps {
    videoFile?: File;
    videoUrlProp?: string;
    onReset: () => void;
}

export default function VideoAnalyzer({ videoFile, videoUrlProp, onReset }: VideoAnalyzerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);
    const combinedCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const proOverlayCanvasRef = useRef<HTMLCanvasElement>(null); // New Ref

    const [videoUrl, setVideoUrl] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side' | 'skeleton'>('overlay');

    // Detectors from Context
    const { poseDetector, proPoseDetector, isModelLoading } = usePose();

    // Analysis State
    const [kneeBend, setKneeBend] = useState<{ angle: number, status: 'Good' | "Granny's Legs" } | null>(null);
    const kneeAngleHistoryRef = useRef<number[]>([]);

    // Pro Video State
    const proVideoRef = useRef<HTMLVideoElement>(null);
    const [proVideoUrl, setProVideoUrl] = useState<string | null>(null);
    const [proLandmarks, setProLandmarks] = useState<any[]>([]);
    const proLandmarksRef = useRef<any[]>([]);

    // Pro Trimming State
    const [trimmingProFile, setTrimmingProFile] = useState<File | null>(null);
    const [isProcessingPro, setIsProcessingPro] = useState(false);

    // Customization State
    const [skeletonStyle, setSkeletonStyle] = useState<SkeletonStyle>('neon');
    const [bgStyle, setBgStyle] = useState<'black' | 'blue' | 'transparent'>('black');
    const [showSettings, setShowSettings] = useState(true); // Default to true to show controls

    const requestRef = useRef<number | null>(null);
    const compressorRef = useRef<VideoCompressor | null>(null);

    // Court Detection State
    const [courtLines, setCourtLines] = useState<Line[]>([]);
    const courtDetectorRef = useRef<CourtDetector | null>(null);
    const lastDetectionTimeRef = useRef<number>(0);

    const [ballTracker] = useState(() => new BallTracker());
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (videoUrlProp) {
            setVideoUrl(videoUrlProp);
        }
    }, [videoFile, videoUrlProp]);

    useEffect(() => {
        courtDetectorRef.current = new CourtDetector();
    }, []);

    const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.save();
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.textAlign = "right";
        ctx.fillText("v1.1.1 JasonZeng AI", width - 20, height - 20);
        ctx.restore();
    };

    const drawKneeBendStats = (ctx: CanvasRenderingContext2D, kneeBend: { angle: number, status: string }, width: number) => {
        ctx.save();
        const text = 'KNEE BEND: ' + kneeBend.angle.toFixed(0) + '° ' + kneeBend.status.toUpperCase();
        ctx.font = "bold 14px 'Press Start 2P', monospace";
        const padding = 10;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const boxHeight = 30;
        const boxWidth = textWidth + (padding * 2);
        const x = width - boxWidth - 15;
        const y = 15;

        // Fun colors for "Granny's Legs"
        if (kneeBend.status === "Granny's Legs") {
            ctx.fillStyle = 'rgba(220, 38, 38, 0.9)'; // Red
        } else {
            ctx.fillStyle = 'rgba(22, 163, 74, 0.7)'; // Green
        }

        ctx.fillRect(x, y, boxWidth, boxHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + padding, y + (boxHeight / 2));
        ctx.restore();
    };

    const onResults = useCallback((results: any) => {
        const video = videoRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const skeletonCanvas = skeletonCanvasRef.current;
        const proVideo = proVideoRef.current;
        const proOverlayCanvas = proOverlayCanvasRef.current;

        if (!video || !overlayCanvas || !skeletonCanvas) return;

        const overlayCtx = overlayCanvas.getContext('2d');
        const skeletonCtx = skeletonCanvas.getContext('2d');

        if (!overlayCtx || !skeletonCtx) return;

        if (skeletonCanvas.width === 0 && video.videoWidth > 0) {
            skeletonCanvas.width = video.videoWidth;
            skeletonCanvas.height = video.videoHeight;
        }
        if (overlayCanvas.width === 0 && video.videoWidth > 0) {
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
        }

        // Resize Pro Canvas
        if (proOverlayCanvas && proVideo && proVideo.videoWidth > 0) {
            if (proOverlayCanvas.width !== proVideo.videoWidth || proOverlayCanvas.height !== proVideo.videoHeight) {
                proOverlayCanvas.width = proVideo.videoWidth;
                proOverlayCanvas.height = proVideo.videoHeight;
            }
        }

        try {
            // --- 1. Render Overlay Canvas ---
            overlayCtx.save();
            overlayCtx.drawImage(video, 0, 0, overlayCanvas.width, overlayCanvas.height);

            let currentKneeBend = null;

            if (results.poseLandmarks) {
                drawRobustSkeleton(overlayCtx, results.poseLandmarks, 'neon', 1.0);

                // Calculate Raw Knee Bend
                const rawKneeBend = analyzeKneeBend(results.poseLandmarks);

                // Smooth the angle
                const history = kneeAngleHistoryRef.current;
                history.push(rawKneeBend.angle);
                if (history.length > 10) history.shift(); // Keep last 10 frames (~300ms at 30fps)

                const avgAngle = history.reduce((a, b) => a + b, 0) / history.length;

                // Re-evaluate status based on smoothed angle
                let status: 'Good' | "Granny's Legs" = 'Good';
                if (avgAngle > 165) status = "Granny's Legs";

                currentKneeBend = { angle: avgAngle, status };

                setKneeBend(currentKneeBend);

                if (currentKneeBend) {
                    drawKneeBendStats(overlayCtx, currentKneeBend, overlayCanvas.width);
                }
            }
            drawWatermark(overlayCtx, overlayCanvas.width, overlayCanvas.height);
            overlayCtx.restore();


            // --- 2. Render Skeleton Canvas ---
            skeletonCtx.save();
            skeletonCtx.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);

            if (bgStyle === 'black') {
                skeletonCtx.fillStyle = '#000000';
                skeletonCtx.fillRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
            } else if (bgStyle === 'blue') {
                skeletonCtx.fillStyle = '#3B82F6';
                skeletonCtx.fillRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
            }

            if (courtLines.length > 0) {
                skeletonCtx.save();
                skeletonCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                skeletonCtx.lineWidth = 2;
                skeletonCtx.setLineDash([10, 10]);
                courtLines.forEach(line => {
                    skeletonCtx.beginPath();
                    skeletonCtx.moveTo(line.x1 * skeletonCanvas.width, line.y1 * skeletonCanvas.height);
                    skeletonCtx.lineTo(line.x2 * skeletonCanvas.width, line.y2 * skeletonCanvas.height);
                    skeletonCtx.stroke();
                });
                skeletonCtx.restore();
            }

            if (proLandmarksRef.current) {
                let landmarksToDraw = proLandmarksRef.current;

                // Fit landmarks if we have pro video dimensions
                if (proVideo && proVideo.videoWidth > 0 && skeletonCanvas.width > 0) {
                    landmarksToDraw = fitLandmarks(
                        proLandmarksRef.current,
                        proVideo.videoWidth,
                        proVideo.videoHeight,
                        skeletonCanvas.width,
                        skeletonCanvas.height
                    );
                }

                drawRobustSkeleton(skeletonCtx, landmarksToDraw, skeletonStyle, 0.3);
            }

            if (results.poseLandmarks) {
                drawRobustSkeleton(skeletonCtx, results.poseLandmarks, skeletonStyle, 1.0);
                if (currentKneeBend) {
                    drawKneeBendStats(skeletonCtx, currentKneeBend, skeletonCanvas.width);
                }
            }

            drawWatermark(skeletonCtx, skeletonCanvas.width, skeletonCanvas.height);
            skeletonCtx.restore();

            // --- 3. Render Pro Overlay Canvas ---
            if (proOverlayCanvas) {
                const proCtx = proOverlayCanvas.getContext('2d');
                if (proCtx) {
                    proCtx.clearRect(0, 0, proOverlayCanvas.width, proOverlayCanvas.height);
                    if (proLandmarksRef.current && proLandmarksRef.current.length > 0) {
                        drawRobustSkeleton(proCtx, proLandmarksRef.current, skeletonStyle, 1.0);
                    }
                }
            }

            // --- 4. Render Combined Canvas (for Export) ---
            if (isRecording && combinedCanvasRef.current) {
                const combinedCtx = combinedCanvasRef.current.getContext('2d');
                if (combinedCtx) {
                    combinedCtx.fillStyle = '#000000';
                    combinedCtx.fillRect(0, 0, combinedCanvasRef.current.width, combinedCanvasRef.current.height);

                    if (proVideoUrl) {
                        // Pro Layout (2x2)
                        combinedCtx.drawImage(overlayCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);
                        if (proVideoRef.current) {
                            combinedCtx.drawImage(proVideoRef.current, overlayCanvas.width, 0, overlayCanvas.width, overlayCanvas.height);
                        }
                        const skeletonX = overlayCanvas.width / 2;
                        const skeletonY = overlayCanvas.height;
                        combinedCtx.drawImage(skeletonCanvas, skeletonX, skeletonY, overlayCanvas.width, overlayCanvas.height);

                        // Separators
                        combinedCtx.strokeStyle = '#333';
                        combinedCtx.lineWidth = 2;
                        combinedCtx.beginPath();
                        combinedCtx.moveTo(overlayCanvas.width, 0);
                        combinedCtx.lineTo(overlayCanvas.width, overlayCanvas.height);
                        combinedCtx.stroke();
                        combinedCtx.beginPath();
                        combinedCtx.moveTo(0, overlayCanvas.height);
                        combinedCtx.lineTo(combinedCanvasRef.current.width, overlayCanvas.height);
                        combinedCtx.stroke();

                    } else {
                        // Standard Layout (Side-by-Side)
                        combinedCtx.drawImage(overlayCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);
                        combinedCtx.drawImage(skeletonCanvas, overlayCanvas.width, 0, skeletonCanvas.width, skeletonCanvas.height);

                        combinedCtx.beginPath();
                        combinedCtx.moveTo(overlayCanvas.width, 0);
                        combinedCtx.lineTo(overlayCanvas.width, overlayCanvas.height);
                        combinedCtx.strokeStyle = '#333';
                        combinedCtx.lineWidth = 2;
                        combinedCtx.stroke();
                    }
                }
            }

            // --- Run Court Detection ---
            const now = Date.now();
            if (courtDetectorRef.current && now - lastDetectionTimeRef.current > 1000) {
                try {
                    if (courtDetectorRef.current.checkReady()) {
                        const lines = courtDetectorRef.current.detectLines(video);
                        if (lines.length > 0) {
                            setCourtLines(lines);
                        }
                        lastDetectionTimeRef.current = now;
                    }
                } catch (e) {
                    console.warn("Court detection failed", e);
                }
            }

        } catch (error) {
            console.error("Error in onResults:", error);
        }

    }, [skeletonStyle, bgStyle, isRecording, proVideoUrl, courtLines, ballTracker]);

    // Initialize Pro Pose Listener
    useEffect(() => {
        if (proPoseDetector) {
            proPoseDetector.onResults((results: any) => {
                if (results.poseLandmarks) {
                    proLandmarksRef.current = results.poseLandmarks;
                }
            });
        }
    }, [proPoseDetector]);

    useEffect(() => {
        if (poseDetector) {
            poseDetector.onResults(onResults);
        }
    }, [poseDetector, onResults]);

    const [playbackRate, setPlaybackRate] = useState(1.0);

    const handleProVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setTrimmingProFile(file);
        }
    };

    const handleProTrimConfirm = async (startTime: number, endTime: number) => {
        if (!trimmingProFile) return;
        setTrimmingProFile(null);
        setIsProcessingPro(true);
        try {
            if (!compressorRef.current) {
                compressorRef.current = new VideoCompressor();
            }
            const compressedBlob = await compressorRef.current.compress(
                trimmingProFile,
                (progress) => console.log('Pro compress:', progress),
                startTime,
                endTime
            );
            const url = URL.createObjectURL(compressedBlob);
            setProVideoUrl(url);
            setProLandmarks([]);
            proLandmarksRef.current = [];
        } catch (error) {
            console.error("Pro processing failed:", error);
            const url = URL.createObjectURL(trimmingProFile);
            setProVideoUrl(url);
        } finally {
            setIsProcessingPro(false);
        }
    };

    const startRecording = (mode: 'overlay' | 'skeleton' | 'combined') => {
        let canvas: HTMLCanvasElement | null = null;

        if (mode === 'combined') {
            if (!combinedCanvasRef.current) {
                combinedCanvasRef.current = document.createElement('canvas');
            }
            const video = videoRef.current;
            if (video && combinedCanvasRef.current) {
                if (proVideoUrl) {
                    combinedCanvasRef.current.width = video.videoWidth * 2;
                    combinedCanvasRef.current.height = video.videoHeight * 2;
                } else {
                    combinedCanvasRef.current.width = video.videoWidth * 2;
                    combinedCanvasRef.current.height = video.videoHeight;
                }
            }
            canvas = combinedCanvasRef.current;
        } else {
            canvas = mode === 'overlay' ? overlayCanvasRef.current : skeletonCanvasRef.current;
        }

        const video = videoRef.current;
        if (!canvas || !video) return;

        setIsExporting(true);
        const stream = canvas.captureStream(30);
        let mimeType = 'video/webm;codecs=vp9';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
            mimeType = 'video/webm;codecs=h264';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            recordedChunksRef.current = [];
            try {
                if (!compressorRef.current) {
                    compressorRef.current = new VideoCompressor();
                }
                const mp4Blob = await compressorRef.current.convert(blob, (progress) => {
                    console.log('Export progress:', progress);
                });
                const url = URL.createObjectURL(mp4Blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `tennis-${mode}-analysis.mp4`;
                a.click();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Export conversion failed:", error);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `tennis-${mode}-analysis.webm`;
                a.click();
                window.URL.revokeObjectURL(url);
            } finally {
                setIsExporting(false);
            }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);

        if (video.paused) {
            video.play();
            if (proVideoRef.current) proVideoRef.current.play();
            setIsPlaying(true);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (videoRef.current) videoRef.current.pause();
            if (proVideoRef.current) proVideoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const processFrame = useCallback(async () => {
        const video = videoRef.current;
        const proVideo = proVideoRef.current;
        const pose = poseDetector;
        const proPose = proPoseDetector;

        if (video && pose && !video.paused && !video.ended) {
            try {
                await pose.send({ image: video });
                if (proVideo && proPose && !proVideo.paused && !proVideo.ended) {
                    await proPose.send({ image: proVideo });
                }
            } catch (error) {
                console.error("Error processing frame:", error);
            }
            requestRef.current = requestAnimationFrame(processFrame);
        }
    }, [poseDetector, proPoseDetector]);

    useEffect(() => {
        if (isPlaying && poseDetector) {
            processFrame();
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }
    }, [isPlaying, poseDetector, processFrame]);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (video) {
            setCurrentTime(video.currentTime);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        const video = videoRef.current;
        const proVideo = proVideoRef.current;

        if (video) {
            video.currentTime = time;
            setCurrentTime(time);
        }
        if (proVideo) {
            proVideo.currentTime = time;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const skeletonCanvas = skeletonCanvasRef.current;
        if (video && overlayCanvas && skeletonCanvas) {
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            skeletonCanvas.width = video.videoWidth;
            skeletonCanvas.height = video.videoHeight;
            setDuration(video.duration);
        }
    };

    const togglePlay = () => {
        const video = videoRef.current;
        const proVideo = proVideoRef.current;
        if (video) {
            if (isPlaying) {
                video.pause();
                if (proVideo) proVideo.pause();
            } else {
                video.play();
                if (proVideo) proVideo.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const changeSpeed = (rate: number) => {
        setPlaybackRate(rate);
        if (videoRef.current) videoRef.current.playbackRate = rate;
        if (proVideoRef.current) proVideoRef.current.playbackRate = rate;
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
                strategy="afterInteractive"
            />
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
                strategy="afterInteractive"
            />
            <Script
                src="https://docs.opencv.org/4.8.0/opencv.js"
                strategy="afterInteractive"
                onLoad={() => console.log("OpenCV Loaded")}
            />

            {/* Top Toolbar */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2 md:p-4 flex flex-wrap items-center justify-between gap-2 md:gap-4 shadow-xl">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-4 md:py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {isModelLoading ? (
                            <>
                                <Loader2 className="w-3 h-3 md:w-5 md:h-5 text-yellow-500 animate-spin" />
                                <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-gray-300">Loading...</span>
                            </>
                        ) : (
                            <>
                                <Activity className="w-3 h-3 md:w-5 md:h-5 text-yellow-500" />
                                <span className="text-xs md:text-sm font-medium text-yellow-600">Ready</span>
                            </>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* View Mode Toggles - Premium Segmented Control */}
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <button
                            onClick={() => setViewMode('overlay')}
                            className={clsx(
                                "px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2",
                                viewMode === 'overlay'
                                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-100 font-medium"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            )}
                            title="Overlay View"
                        >
                            <Eye className={clsx("w-3 h-3 md:w-4 md:h-4", viewMode === 'overlay' && "stroke-[2.5px]")} />
                            <span className="hidden sm:inline text-sm">Overlay</span>
                        </button>
                        <button
                            onClick={() => setViewMode('side-by-side')}
                            className={clsx(
                                "px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2",
                                viewMode === 'side-by-side'
                                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-100 font-medium"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            )}
                            title="Side-by-Side View"
                        >
                            <Grid className={clsx("w-3 h-3 md:w-4 md:h-4", viewMode === 'side-by-side' && "stroke-[2.5px]")} />
                            <span className="hidden sm:inline text-sm">Split</span>
                        </button>
                        <button
                            onClick={() => setViewMode('skeleton')}
                            className={clsx(
                                "px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2",
                                viewMode === 'skeleton'
                                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-100 font-medium"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            )}
                            title="Skeleton Only"
                        >
                            <Zap className={clsx("w-3 h-3 md:w-4 md:h-4", viewMode === 'skeleton' && "stroke-[2.5px]")} />
                            <span className="hidden sm:inline text-sm">Skeleton</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
                        Reset
                    </button>

                    {/* Export Dropdown / Buttons */}
                    <div className="flex gap-1.5 md:gap-2">
                        {isRecording ? (
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-3 py-1.5 md:px-6 md:py-2 rounded-xl font-medium bg-red-500 text-white animate-pulse text-xs md:text-base"
                            >
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white" />
                                Stop
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => startRecording('overlay')}
                                    disabled={isExporting}
                                    className="px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    Overlay
                                </button>
                                <button
                                    onClick={() => startRecording('skeleton')}
                                    disabled={isExporting}
                                    className="px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    Skeleton
                                </button>
                                <button
                                    onClick={() => startRecording('combined')}
                                    disabled={isExporting}
                                    className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-500/20 text-[10px] md:text-sm"
                                >
                                    {isExporting ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Download className="w-3 h-3 md:w-4 md:h-4" />}
                                    All
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 'auto', opacity: 1 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
                            {/* Skeleton Style */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Skeleton Style</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(['neon', 'minimal', 'geometric'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => setSkeletonStyle(style)}
                                            className={clsx(
                                                "px-3 py-1.5 text-sm rounded-lg border transition-all duration-200",
                                                skeletonStyle === style
                                                    ? "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {style.charAt(0).toUpperCase() + style.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Background Style */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Background</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(['transparent', 'black', 'blue'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => setBgStyle(style)}
                                            className={clsx(
                                                "px-3 py-1.5 text-sm rounded-lg border transition-all duration-200",
                                                bgStyle === style
                                                    ? "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {style.charAt(0).toUpperCase() + style.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Playback Speed */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Playback Speed</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[0.25, 0.5, 1.0].map((rate) => (
                                        <button
                                            key={rate}
                                            onClick={() => changeSpeed(rate)}
                                            className={clsx(
                                                "px-3 py-1.5 text-sm rounded-lg border transition-all duration-200",
                                                playbackRate === rate
                                                    ? "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-500/20 dark:border-purple-500/50 dark:text-purple-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Video Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={clsx("relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group", viewMode === 'side-by-side' ? "h-auto md:aspect-[2/1]" : "aspect-video")}>

                        {/* Container for Side-by-Side Logic */}
                        <div className={clsx("w-full h-full flex", viewMode === 'side-by-side' ? "flex-col md:flex-row" : "relative")}>

                            {/* Video / Overlay Side */}
                            <div className={clsx("relative", viewMode === 'side-by-side' ? "w-full h-1/2 md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/10" : "w-full h-full", viewMode === 'skeleton' && "hidden")}>
                                <video
                                    ref={videoRef}
                                    src={videoUrl || undefined}
                                    className="absolute top-0 left-0 w-full h-full object-contain opacity-0 pointer-events-none"
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onTimeUpdate={handleTimeUpdate}
                                    playsInline
                                    muted
                                    loop
                                    crossOrigin="anonymous"
                                />
                                <canvas
                                    ref={overlayCanvasRef}
                                    className="absolute top-0 left-0 w-full h-full object-contain z-10"
                                />
                            </div>

                            {/* Skeleton Side */}
                            <div className={clsx("relative", viewMode === 'side-by-side' ? "w-full h-1/2 md:w-1/2 md:h-full" : "w-full h-full", viewMode === 'overlay' && "hidden")}>
                                <canvas
                                    ref={skeletonCanvasRef}
                                    className="absolute top-0 left-0 w-full h-full object-contain z-20"
                                />
                            </div>
                        </div>

                        {/* Hidden Combined Canvas */}
                        <canvas
                            ref={combinedCanvasRef}
                            className="hidden"
                        />

                        {/* Controls Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-30">
                            <div className="flex flex-col gap-2">
                                {/* Progress Bar */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-white/80 font-mono">
                                        {formatTime(currentTime)}
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 100}
                                        value={currentTime}
                                        onChange={handleSeek}
                                        className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                                    />
                                    <span className="text-xs font-medium text-white/80 font-mono">
                                        {formatTime(duration)}
                                    </span>
                                </div>

                                {/* Play/Pause Button */}
                                <div className="flex items-center justify-center">
                                    <button
                                        onClick={togglePlay}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all duration-300 transform hover:scale-105"
                                    >
                                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro Video Comparison */}
                    {proVideoUrl && (
                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                            <video
                                ref={proVideoRef}
                                src={proVideoUrl}
                                className="w-full h-full object-contain"
                                muted
                                playsInline
                                loop
                                crossOrigin="anonymous"
                            />
                            <canvas
                                ref={proOverlayCanvasRef}
                                className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
                            />
                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/10">
                                Comparison
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Stats & Tools */}
                <div className="space-y-6">
                    {/* Knee Bend Analysis Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                            Live Analysis
                        </h3>

                        {kneeBend ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Knee Bend Angle</span>
                                    <span className={clsx(
                                        "text-2xl font-bold",
                                        kneeBend.status === 'Good' ? "text-emerald-500" : "text-red-500"
                                    )}>
                                        {kneeBend.angle.toFixed(0)}°
                                    </span>
                                </div>

                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <div
                                        className={clsx(
                                            "h-full transition-all duration-300 ease-out",
                                            kneeBend.status === 'Good' ? "bg-emerald-500" : "bg-red-500"
                                        )}
                                        style={{ width: `${Math.min(Math.max((kneeBend.angle / 180) * 100, 0), 100)}%` }}
                                    />
                                </div>

                                <div className={clsx(
                                    "p-3 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors duration-300",
                                    kneeBend.status === 'Good'
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                                )}>
                                    {kneeBend.status === 'Good'
                                        ? <><Activity className="w-4 h-4" /> Optimal Bend</>
                                        : <><Activity className="w-4 h-4" /> GRANNY'S LEGS 👵</>
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Waiting for pose detection...</p>
                            </div>
                        )}
                    </div>

                    {/* Pro Video Upload */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                            Pro Comparison
                        </h3>

                        <label className="block w-full cursor-pointer group">
                            <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors duration-300 group-hover:border-blue-500/50 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/5">
                                <Video className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-sm font-medium text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400">
                                    Upload Pro Video
                                </span>
                            </div>
                            <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={handleProVideoUpload}
                            />
                        </label>
                    </div>

                    {/* Trimmer Modal */}
                    <AnimatePresence>
                        {trimmingProFile && (
                            <VideoTrimmer
                                file={trimmingProFile}
                                onConfirm={handleProTrimConfirm}
                                onCancel={() => setTrimmingProFile(null)}
                            />
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
}
