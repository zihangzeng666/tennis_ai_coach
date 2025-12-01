export interface Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export class CourtDetector {
    private cv: any;
    private isReady: boolean = false;

    constructor() {
        // OpenCV will be available globally as `cv` when the script loads
        if (typeof window !== 'undefined' && (window as any).cv) {
            this.cv = (window as any).cv;
            this.isReady = true;
        }
    }

    public checkReady(): boolean {
        if (!this.isReady && typeof window !== 'undefined' && (window as any).cv) {
            this.cv = (window as any).cv;
            // Check if onRuntimeInitialized has fired or if cv.Mat is available
            if (this.cv.Mat) {
                this.isReady = true;
            }
        }
        return this.isReady;
    }

    public detectLines(videoElement: HTMLVideoElement): Line[] {
        if (!this.checkReady()) return [];

        const cv = this.cv;
        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;

        // Downscale for performance (process at max 640px width)
        const scale = Math.min(640 / width, 1);
        const processWidth = Math.floor(width * scale);
        const processHeight = Math.floor(height * scale);

        let src: any = null;
        let dst: any = null;
        let lines: any = null;

        try {
            // 1. Create matrices
            src = new cv.Mat(processHeight, processWidth, cv.CV_8UC4);
            dst = new cv.Mat(processHeight, processWidth, cv.CV_8UC1);
            lines = new cv.Mat();

            // 2. Draw video frame to a temporary canvas to read pixels (OpenCV.js needs this)
            // Or better: use a temporary canvas to draw the video frame, then read from it.
            // Since we can't pass HTMLVideoElement directly to cv.imread in all versions efficiently without a canvas.
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = processWidth;
            tempCanvas.height = processHeight;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) return [];

            ctx.drawImage(videoElement, 0, 0, processWidth, processHeight);
            const imgData = ctx.getImageData(0, 0, processWidth, processHeight);
            src.data.set(imgData.data);

            // 3. Preprocessing
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);

            // 4. Edge Detection
            // Thresholds: Lowered to detect fainter lines (white lines on green/blue court)
            cv.Canny(dst, dst, 30, 100, 3);

            // 5. Hough Line Transform
            // rho: 1 pixel resolution
            // theta: 1 degree resolution (Math.PI / 180)
            // threshold: minimum intersection points to detect a line (Lowered)
            // minLineLength: minimum length of a line (Lowered)
            // maxLineGap: maximum gap between points to consider them the same line (Increased)
            cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 30, 30, 20);

            const detectedLines: Line[] = [];

            // 6. Extract Lines
            for (let i = 0; i < lines.rows; ++i) {
                const startPoint = { x: lines.data32S[i * 4], y: lines.data32S[i * 4 + 1] };
                const endPoint = { x: lines.data32S[i * 4 + 2], y: lines.data32S[i * 4 + 3] };

                // Filter logic:
                // - Ignore very short lines (already handled by minLineLength, but double check)
                // - Normalize coordinates back to 0-1 range for the main canvas

                detectedLines.push({
                    x1: startPoint.x / processWidth,
                    y1: startPoint.y / processHeight,
                    x2: endPoint.x / processWidth,
                    y2: endPoint.y / processHeight
                });
            }

            return detectedLines;

        } catch (err) {
            console.error("OpenCV Line Detection Error:", err);
            return [];
        } finally {
            // 7. Cleanup
            if (src) src.delete();
            if (dst) dst.delete();
            if (lines) lines.delete();
        }
    }
}
