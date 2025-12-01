import { NormalizedLandmark } from '@mediapipe/pose';

export interface KeyAngles {
    rightElbow: number;
    leftElbow: number;
    rightKnee: number;
    leftKnee: number;
    rightShoulder: number;
    leftShoulder: number;
}

export function calculateAngle(
    a: NormalizedLandmark,
    b: NormalizedLandmark,
    c: NormalizedLandmark
): number {
    if (!a || !b || !c) return 0;

    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);

    if (angle > 180.0) {
        angle = 360.0 - angle;
    }

    return Math.round(angle);
}

export function analyzePose(landmarks: NormalizedLandmark[]): KeyAngles {
    // MediaPipe Pose Landmark Indices:
    // 11: left_shoulder, 12: right_shoulder
    // 13: left_elbow, 14: right_elbow
    // 15: left_wrist, 16: right_wrist
    // 23: left_hip, 24: right_hip
    // 25: left_knee, 26: right_knee
    // 27: left_ankle, 28: right_ankle

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    return {
        leftElbow: calculateAngle(leftShoulder, leftElbow, leftWrist),
        rightElbow: calculateAngle(rightShoulder, rightElbow, rightWrist),
        leftKnee: calculateAngle(leftHip, leftKnee, leftAnkle),
        rightKnee: calculateAngle(rightHip, rightKnee, rightAnkle),
        leftShoulder: calculateAngle(leftHip, leftShoulder, leftElbow),
        rightShoulder: calculateAngle(rightHip, rightShoulder, rightElbow),
    };
}

export class AngleSmoother {
    private history: KeyAngles[] = [];
    private windowSize: number;

    constructor(windowSize: number = 5) {
        this.windowSize = windowSize;
    }

    smooth(newAngles: KeyAngles): KeyAngles {
        this.history.push(newAngles);
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }

        const smoothed: any = {};
        const keys = Object.keys(newAngles) as (keyof KeyAngles)[];

        keys.forEach(key => {
            const sum = this.history.reduce((acc, curr) => acc + curr[key], 0);
            smoothed[key] = Math.round(sum / this.history.length);
        });

        return smoothed as KeyAngles;
    }
}

export function analyzeKneeBend(landmarks: any[]): { angle: number, status: 'Good' | "Granny's Legs" } {
    if (!landmarks) return { angle: 180, status: "Granny's Legs" };

    // Right Leg: Hip(24) -> Knee(26) -> Ankle(28)
    // Left Leg: Hip(23) -> Knee(25) -> Ankle(27)
    // Use the one with better visibility or just Right for now (assuming righty)

    const rightKneeVisibility = landmarks[26].visibility || 0;
    const leftKneeVisibility = landmarks[25].visibility || 0;

    let p1, p2, p3;

    if (rightKneeVisibility > leftKneeVisibility) {
        p1 = landmarks[24]; // R Hip
        p2 = landmarks[26]; // R Knee
        p3 = landmarks[28]; // R Ankle
    } else {
        p1 = landmarks[23]; // L Hip
        p2 = landmarks[25]; // L Knee
        p3 = landmarks[27]; // L Ankle
    }

    const angle = calculateAngle(p1, p2, p3);

    // Thresholds
    // < 150: Good Bend
    // > 165: Too Straight

    let status: 'Good' | "Granny's Legs" = 'Good';
    if (angle > 165) status = "Granny's Legs";

    return { angle: Math.round(angle), status };
}
