'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

const BACKGROUND_VIDEOS = [
  '/background_videos/1.mp4',
  '/background_videos/2.mp4',
  '/background_videos/3.mp4',
  '/background_videos/4.mp4',
];

export default function UploadZone({ onFileSelected }: UploadZoneProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0]);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % BACKGROUND_VIDEOS.length);
  };

  return (
    <div className="w-full relative rounded-[2rem] overflow-hidden shadow-2xl bg-black h-[500px] md:h-auto md:aspect-video group">

      {/* Background Video Layer - Full Size */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60 group-hover:opacity-40 transition-opacity duration-700">
        <AnimatePresence mode='wait'>
          <motion.video
            key={currentVideoIndex}
            ref={videoRef}
            src={BACKGROUND_VIDEOS[currentVideoIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop={false}
            playsInline
            onEnded={handleVideoEnded}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      </div>

      {/* Decorative Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 opacity-50 pointer-events-none">
        <div className="text-xs font-mono text-white/40 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
          AI POWERED BY v1.1.1 JASONZENG
        </div>
        <div className="flex gap-1 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={clsx(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                i === currentVideoIndex ? "bg-white w-4" : "bg-white/20"
              )}
            />
          ))}
        </div>
      </div>

      {/* Upload Button / Card - Bottom Positioned */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-center p-4 pb-8 md:p-8 md:pb-12">
        <div
          {...getRootProps()}
          className={clsx(
            "relative w-full max-w-2xl p-3 md:p-4 rounded-2xl backdrop-blur-xl border-2 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 cursor-pointer transition-all duration-500 group/card text-center sm:text-left",
            isDragActive
              ? "bg-blue-500/20 border-blue-400 scale-105 shadow-[0_0_50px_rgba(59,130,246,0.5)]"
              : "bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/40 hover:scale-105 hover:shadow-2xl"
          )}
        >
          <input {...getInputProps()} />

          {/* Icon */}
          <div className="relative shrink-0">
            <div className={clsx(
              "w-10 h-10 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all duration-500",
              isDragActive ? "bg-blue-500 text-white scale-110" : "bg-white/10 text-white/80 group-hover/card:bg-white/20 group-hover/card:text-white"
            )}>
              {isDragActive ? (
                <FileVideo className="w-5 h-5 sm:w-8 sm:h-8 animate-bounce" />
              ) : (
                <Upload className="w-5 h-5 sm:w-8 sm:h-8" />
              )}
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1">
            <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
              {isDragActive ? "Drop Video" : "Upload Your Swing"}
            </h3>
            <p className="text-[10px] sm:text-sm text-white/60 font-medium mt-0.5 sm:mt-0">
              Let AI do the rest.
              <span className="block sm:inline sm:ml-2 sm:border-l sm:border-white/20 sm:pl-2 mt-0.5 sm:mt-0 text-[9px] sm:text-xs opacity-50 uppercase tracking-wider">MP4 • MOV • AVI</span>
            </p>
          </div>

          {/* Arrow/Action Indicator */}
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 items-center justify-center group-hover/card:bg-white/20 transition-colors">
            <Upload className="w-5 h-5 text-white/70 rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
