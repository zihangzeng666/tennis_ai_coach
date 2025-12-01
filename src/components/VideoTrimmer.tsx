import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, Check, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface VideoTrimmerProps {
    file: File;
    onConfirm: (startTime: number, endTime: number) => void;
    onCancel: () => void;
}

export default function VideoTrimmer({ file, onConfirm, onCancel }: VideoTrimmerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Range state
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string>('');

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const vidDuration = videoRef.current.duration;
            setDuration(vidDuration);
            setEndTime(vidDuration);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const curr = videoRef.current.currentTime;
            setCurrentTime(curr);

            // Loop logic for preview
            if (curr >= endTime) {
                videoRef.current.pause();
                videoRef.current.currentTime = startTime;
                setIsPlaying(false);
            }
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                if (videoRef.current.currentTime >= endTime) {
                    videoRef.current.currentTime = startTime;
                }
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    };

    // Handle slider changes
    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const newStart = Math.min(val, endTime - 0.5); // Min 0.5s duration
        setStartTime(newStart);
        if (videoRef.current) videoRef.current.currentTime = newStart;
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const newEnd = Math.max(val, startTime + 0.5); // Min 0.5s duration
        setEndTime(newEnd);
        if (videoRef.current) videoRef.current.currentTime = newEnd;
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-[#D4F804]/10 rounded-lg">
                        <Scissors className="w-6 h-6 text-yellow-600 dark:text-[#D4F804]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trim Video</h2>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Select the segment to analyze</p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </motion.button>
            </div>

            {/* Video Preview */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-6 group shadow-lg">
                <video
                    ref={videoRef}
                    src={videoUrl || undefined}
                    className="w-full h-full object-contain"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />

                {/* Overlay Play Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="p-4 bg-black/50 backdrop-blur-sm rounded-full">
                        {isPlaying ? <Pause className="w-8 h-8 text-white fill-current" /> : <Play className="w-8 h-8 text-white fill-current ml-1" />}
                    </div>
                </div>
                <button
                    className="absolute inset-0 w-full h-full cursor-pointer"
                    onClick={togglePlay}
                />
            </div>

            {/* Controls */}
            <div className="space-y-6">
                {/* Time Display */}
                <div className="flex justify-between text-sm font-mono text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div>Start: <span className="text-yellow-600 dark:text-[#D4F804] font-bold">{formatTime(startTime)}</span></div>
                    <div>Current: <span className="text-slate-900 dark:text-white">{formatTime(currentTime)}</span></div>
                    <div>End: <span className="text-blue-600 dark:text-blue-400 font-bold">{formatTime(endTime)}</span></div>
                </div>

                {/* Sliders */}
                <div className="relative h-12 flex items-center select-none">
                    {/* Track Background */}
                    <div className="absolute w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        {/* Selected Range Highlight */}
                        <div
                            className="absolute h-full bg-gradient-to-r from-yellow-400 to-blue-500 dark:from-[#D4F804] dark:to-blue-500 opacity-80"
                            style={{
                                left: `${(startTime / duration) * 100}%`,
                                width: `${((endTime - startTime) / duration) * 100}%`
                            }}
                        />
                    </div>

                    {/* Start Slider */}
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={startTime}
                        onChange={handleStartChange}
                        className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-yellow-500 dark:[&::-webkit-slider-thumb]:bg-[#D4F804] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20"
                    />

                    {/* End Slider */}
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={endTime}
                        onChange={handleEndChange}
                        className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-blue-600 dark:[&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300 rounded-xl font-medium transition-all"
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onConfirm(startTime, endTime)}
                        className="flex-[2] px-4 py-3 bg-yellow-400 dark:bg-[#D4F804] hover:bg-yellow-300 dark:hover:bg-[#b8d604] text-slate-900 dark:text-black rounded-xl font-bold shadow-lg shadow-yellow-500/20 dark:shadow-[#D4F804]/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        Analyze Segment ({formatTime(endTime - startTime)})
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
