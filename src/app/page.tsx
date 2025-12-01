'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import UploadZone from '@/components/UploadZone';
import VideoAnalyzer from '@/components/VideoAnalyzer';
import VideoTrimmer from '@/components/VideoTrimmer';
import { VideoCompressor } from '@/utils/videoCompressor';
import { Loader2, HelpCircle, Moon, Sun } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import InstructionsModal from '@/components/InstructionsModal';

function HomeContent() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const compressorRef = useRef<VideoCompressor | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const searchParams = useSearchParams();
  const testMode = searchParams.get('test');

  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setTrimmingFile(file);
  };

  const handleTrimConfirm = async (startTime: number, endTime: number) => {
    if (!trimmingFile) return;

    setTrimmingFile(null); // Hide trimmer
    setIsCompressing(true);
    setCompressionProgress(0);

    try {
      if (!compressorRef.current) {
        compressorRef.current = new VideoCompressor();
      }

      const compressedBlob = await compressorRef.current.compress(
        trimmingFile,
        (progress) => {
          setCompressionProgress(progress);
        },
        startTime,
        endTime
      );

      const compressedFile = new File([compressedBlob], "compressed_video.mp4", { type: "video/mp4" });
      setVideoFile(compressedFile);
    } catch (error) {
      console.error("Compression failed:", error);
      setVideoFile(trimmingFile); // Fallback to original
    } finally {
      setIsCompressing(false);
    }
  };

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Background Pattern */}
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-500">
        {theme === 'dark' ? (
          <>
            {/* Dark Theme Background */}
            <div className="absolute inset-0 bg-[#0f172a]"></div>
            <div className="absolute inset-0 bg-[url('/bg-texture.png')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900/80"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-multiply"></div>
          </>
        ) : (
          <>
            {/* Light Theme Background - Premium Porcelain & Ambient Light */}
            <div className="absolute inset-0 bg-[#F8F9FA]"></div>

            {/* Background Image Integration - Visible & Colorful */}
            <div className="absolute inset-0 bg-[url('/backgrounds/background1.png')] bg-cover bg-center bg-no-repeat opacity-30"></div>

            {/* Soft Ambient Gradients Overlay - Reduced Opacity */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-200/30 blur-[120px] mix-blend-multiply"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-[120px] mix-blend-multiply"></div>

            {/* Subtle Noise Texture for Depth */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* Delicate Grid Overlay (Optional, very subtle) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setShowInstructions(true)}
            className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-white hover:scale-110 transition-transform shadow-lg border border-white/20"
            title="Help"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-white hover:scale-110 transition-transform shadow-lg border border-white/20"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </div>

        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12 text-center pt-16 md:pt-12"
        >
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter drop-shadow-sm">
            Skeleton <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600 dark:from-[#D4F804] dark:to-[#A3C000]">Tennis</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium px-4">
            Turn your videos into skeleton, <span className="opacity-80">have fun.</span>
          </p>
        </motion.header>

        <AnimatePresence mode="wait">
          {!videoFile && !isCompressing && !testMode && !trimmingFile && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto w-full"
            >
              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-4 shadow-2xl border border-white/20 dark:border-white/10">
                <UploadZone onFileSelected={handleFileSelect} />
              </div>
            </motion.div>
          )}

          {trimmingFile && (
            <motion.div
              key="trimmer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-white/10">
                <VideoTrimmer file={trimmingFile} onConfirm={handleTrimConfirm} onCancel={() => setTrimmingFile(null)} />
              </div>
            </motion.div>
          )}

          {isCompressing && (
            <motion.div
              key="compressing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 dark:border-white/10 text-center">
                <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6 mx-auto" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Optimizing Video...</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Preparing your footage for AI analysis</p>
                <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${compressionProgress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {(videoFile || testMode) && (
            <motion.div
              key="analyzer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-[1600px] mx-auto"
            >
              <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-[2rem] p-6 shadow-2xl border border-white/20 dark:border-white/5">
                <VideoAnalyzer videoFile={videoFile || undefined} videoUrlProp={testMode ? '/test.mov' : undefined} onReset={() => {
                  setVideoFile(null);
                  setTrimmingFile(null);
                }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

      {/* Author Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-sm font-medium text-slate-400 dark:text-slate-600 tracking-wide">
          Designed & Built by <span className="text-slate-600 dark:text-slate-400 font-bold">JasonZeng</span>
        </p>
      </footer>
    </div >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
