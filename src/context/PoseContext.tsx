'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Script from 'next/script';

interface PoseContextType {
    poseDetector: any;
    proPoseDetector: any;
    isModelLoading: boolean;
}

const PoseContext = createContext<PoseContextType | undefined>(undefined);

export function PoseProvider({ children }: { children: ReactNode }) {
    const [poseDetector, setPoseDetector] = useState<any>(null);
    const [proPoseDetector, setProPoseDetector] = useState<any>(null);
    const [isModelLoading, setIsModelLoading] = useState(true);

    const onScriptLoad = () => {
        const initPose = async () => {
            // @ts-ignore
            if (typeof window !== 'undefined' && window.Pose) {
                console.log("Initializing Global Pose Models...");

                // 1. Main Pose Detector
                // @ts-ignore
                const pose = new window.Pose({
                    locateFile: (file: string) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file
                });
                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                // We don't set onResults here, individual components will attach their own listeners
                setPoseDetector(pose);

                // 2. Pro Pose Detector (for comparison video)
                // @ts-ignore
                const proPose = new window.Pose({
                    locateFile: (file: string) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file
                });
                proPose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                setProPoseDetector(proPose);

                setIsModelLoading(false);
                console.log("Global Pose Models Ready");
            }
        };
        initPose();
    };

    return (
        <PoseContext.Provider value={{ poseDetector, proPoseDetector, isModelLoading }}>
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"
                onLoad={onScriptLoad}
                strategy="afterInteractive"
            />
            {children}
        </PoseContext.Provider>
    );
}

export function usePose() {
    const context = useContext(PoseContext);
    if (context === undefined) {
        throw new Error('usePose must be used within a PoseProvider');
    }
    return context;
}
