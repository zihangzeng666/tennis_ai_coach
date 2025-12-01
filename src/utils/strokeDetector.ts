import { NormalizedLandmark } from '@mediapipe/pose';

export type StrokeType = 'FOREHAND' | 'BACKHAND' | 'READY' | 'SERVE';

export class StrokeDetector {
    private history: NormalizedLandmark[] = [];
    private windowSize: number = 5;
    private velocityThreshold: number = 0.03; // Threshold to start a swing
    private lastStroke: StrokeType = 'READY';

    // Swing State
    private isSwinging: boolean = false;
    private peakVelocity: number = 0;
    private directionAtPeak: number = 0; // dx at peak
    private swingFrameCount: number = 0;

    detect(landmarks: NormalizedLandmark[]): StrokeType {
        const rightWrist = landmarks[16];

        if (!rightWrist) return 'READY';

        this.history.push(rightWrist);
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }

        if (this.history.length < 2) return this.lastStroke;

        // Calculate velocity
        const oldest = this.history[0];
        const newest = this.history[this.history.length - 1];
        const dx = newest.x - oldest.x;
        const dy = newest.y - oldest.y;
        const velocity = Math.sqrt(dx * dx + dy * dy);

        // Serve Detection (Vertical Motion)
        if (dy < -0.05 && rightWrist.y < 0.5) {
            this.lastStroke = 'SERVE';
            return 'SERVE';
        }

        // Groundstroke Detection
        if (velocity > this.velocityThreshold) {
            if (!this.isSwinging) {
                // Start of swing
                this.isSwinging = true;
                this.peakVelocity = velocity;
                this.directionAtPeak = dx;
                this.swingFrameCount = 0;
            } else {
                // Continue swing, check for new peak
                if (velocity > this.peakVelocity) {
                    this.peakVelocity = velocity;
                    this.directionAtPeak = dx;
                }
                this.swingFrameCount++;
            }
        } else {
            if (this.isSwinging) {
                // End of swing - Classify based on Peak
                this.isSwinging = false;

                // Only classify if swing was significant
                if (this.peakVelocity > 0.05 && this.swingFrameCount > 3) {
                    if (this.directionAtPeak < 0) {
                        this.lastStroke = 'FOREHAND'; // Right to Left
                    } else {
                        this.lastStroke = 'BACKHAND'; // Left to Right
                    }
                }
            }
        }

        return this.lastStroke;
    }
}
