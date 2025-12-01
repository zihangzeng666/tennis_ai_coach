export class BallTracker {
    private offscreenCanvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;

    constructor() {
        if (typeof document !== 'undefined') {
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCanvas.width = 100; // Low res for performance
            this.offscreenCanvas.height = 100;
            this.ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
        } else {
            this.offscreenCanvas = null as any;
            this.ctx = null;
        }
    }

    findBall(video: HTMLVideoElement): { x: number, y: number } | null {
        if (!this.ctx || !video) return null;

        // Draw small frame
        this.ctx.drawImage(video, 0, 0, 100, 100);
        const frame = this.ctx.getImageData(0, 0, 100, 100);
        const data = frame.data;

        let sumX = 0;
        let sumY = 0;
        let count = 0;

        // Simple Color Thresholding for Tennis Ball Yellow
        // RGB ~ (200-255, 200-255, 0-100) - Bright Yellow/Green
        // HSV is better but expensive to convert in JS loop.
        // Heuristic: High G, High R, Low B. G > R usually for tennis balls.

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Tennis Ball Heuristic
            // 1. Bright: r + g + b > 300
            // 2. Yellow/Green: g > 100, r > 100
            // 3. Not White: b < 150 (White has high B)
            // 4. Green Dominant: g > b + 20

            if (g > 140 && r > 120 && b < 140 && g > b + 30 && r > b + 30) {
                const x = (i / 4) % 100;
                const y = Math.floor((i / 4) / 100);

                sumX += x;
                sumY += y;
                count++;
            }
        }

        if (count > 5) { // Minimum pixels to count as a ball
            return {
                x: (sumX / count) / 100,
                y: (sumY / count) / 100
            };
        }

        return null;
    }
}
