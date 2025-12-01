import { NormalizedLandmark } from '@mediapipe/pose';

// Connections for visualization
export const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
    [11, 23], [12, 24], [23, 24], // Torso
    [23, 25], [25, 27], [24, 26], [26, 28], // Lower body
    [27, 29], [27, 31], [28, 30], [28, 32]  // Feet (optional, but good for completeness)
] as [number, number][];

export type SkeletonStyle = 'neon' | 'minimal' | 'geometric' | 'cartoon';

export function drawRobustSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    style: SkeletonStyle = 'neon',
    opacity: number = 1.0
) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (style === 'neon') {
        drawNeonStyle(ctx, landmarks);
    } else if (style === 'minimal') {
        drawMinimalStyle(ctx, landmarks);
    } else if (style === 'geometric') {
        drawGeometricStyle(ctx, landmarks);
    } else if (style === 'cartoon') {
        drawCartoonStyle(ctx, landmarks);
    }

    ctx.restore();
}

function drawNeonStyle(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    // Left: Cyan, Right: Magenta, Center: Yellow
    const colorLeft = '#00FFFF';
    const colorRight = '#FF00FF';
    const colorCenter = '#FFFF00';

    // Draw Connections
    POSE_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (!p1 || !p2 || (p1.visibility && p1.visibility < 0.5) || (p2.visibility && p2.visibility < 0.5)) return;

        let color = '#FFFFFF';
        // Determine side based on index (odd=left, even=right usually, but MP is specific)
        // MP Pose: 11=left shoulder, 12=right shoulder. 
        // Odd indices are mostly left, even are right.
        if ((start % 2 !== 0 && end % 2 !== 0) || start === 11 || end === 11 || start === 23 || end === 23) {
            color = colorLeft;
        } else if ((start % 2 === 0 && end % 2 === 0) || start === 12 || end === 12 || start === 24 || end === 24) {
            color = colorRight;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
        ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
    });

    // Draw Landmarks
    landmarks.forEach((landmark: any, index: number) => {
        if (index > 32 || (landmark.visibility && landmark.visibility < 0.5)) return;

        ctx.beginPath();
        ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = index % 2 !== 0 ? colorLeft : colorRight;
        if (index === 0) ctx.fillStyle = colorCenter; // Nose

        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

function drawMinimalStyle(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    // Clean White Lines, Small Dots
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;

    POSE_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (!p1 || !p2 || (p1.visibility && p1.visibility < 0.5) || (p2.visibility && p2.visibility < 0.5)) return;

        ctx.beginPath();
        ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
        ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
        ctx.stroke();
    });

    // Joints
    ctx.fillStyle = '#ffffff';
    landmarks.forEach((landmark: any, index: number) => {
        if (index > 32 || (landmark.visibility && landmark.visibility < 0.5)) return;
        ctx.beginPath();
        ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawGeometricStyle(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    // Angular, Tech-y look
    ctx.strokeStyle = '#D4F804'; // Neon Lime
    ctx.lineWidth = 3;

    POSE_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (!p1 || !p2 || (p1.visibility && p1.visibility < 0.5) || (p2.visibility && p2.visibility < 0.5)) return;

        ctx.beginPath();
        ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
        ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
        ctx.stroke();
    });

    // Square Joints
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#D4F804';
    landmarks.forEach((landmark: any, index: number) => {
        if (index > 32 || (landmark.visibility && landmark.visibility < 0.5)) return;
        const x = landmark.x * ctx.canvas.width;
        const y = landmark.y * ctx.canvas.height;
        ctx.beginPath();
        ctx.rect(x - 4, y - 4, 8, 8);
        ctx.fill();
        ctx.stroke();
    });
}

function drawCartoonStyle(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    // Cute, thick, rounded style
    const limbColor = '#ffffff';
    const jointColor = '#ffc0cb'; // Pink
    const outlineColor = '#000000';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw Limbs (Thick Capsules)
    POSE_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (!p1 || !p2 || (p1.visibility && p1.visibility < 0.5) || (p2.visibility && p2.visibility < 0.5)) return;

        const x1 = p1.x * ctx.canvas.width;
        const y1 = p1.y * ctx.canvas.height;
        const x2 = p2.x * ctx.canvas.width;
        const y2 = p2.y * ctx.canvas.height;

        // Outline
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 14;
        ctx.stroke();

        // Fill
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = limbColor;
        ctx.lineWidth = 10;
        ctx.stroke();
    });

    // 2. Draw Joints (Circles)
    landmarks.forEach((landmark: any, index: number) => {
        if (index > 32 || (landmark.visibility && landmark.visibility < 0.5)) return;

        const x = landmark.x * ctx.canvas.width;
        const y = landmark.y * ctx.canvas.height;

        let radius = 6;
        let color = jointColor;

        // Head (Nose)
        if (index === 0) {
            radius = 20; // Big head
            color = '#ffffff';
        }
        // Hands/Feet
        else if (index >= 15 && index <= 22 || index >= 27) {
            radius = 10; // Big paws
        }

        // Outline
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        ctx.fillStyle = outlineColor;
        ctx.fill();

        // Fill
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Eyes (if Head)
        if (index === 0) {
            ctx.fillStyle = '#000';
            // Left Eye
            ctx.beginPath();
            ctx.arc(x - 6, y - 2, 2, 0, 2 * Math.PI);
            ctx.fill();
            // Right Eye
            ctx.beginPath();
            ctx.arc(x + 6, y - 2, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

/**
 * Fits landmarks from a source aspect ratio into a destination aspect ratio (contain).
 * Returns new landmarks with adjusted x, y coordinates.
 */
export const fitLandmarks = (
    landmarks: any[],
    srcWidth: number,
    srcHeight: number,
    destWidth: number,
    destHeight: number
): any[] => {
    if (!landmarks || landmarks.length === 0) return [];

    const srcRatio = srcWidth / srcHeight;
    const destRatio = destWidth / destHeight;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (srcRatio > destRatio) {
        // Source is wider than destination (fit to width)
        scale = destWidth / srcWidth;
        const scaledHeight = srcHeight * scale;
        offsetY = (destHeight - scaledHeight) / 2;
    } else {
        // Source is taller than destination (fit to height)
        scale = destHeight / srcHeight;
        const scaledWidth = srcWidth * scale;
        offsetX = (destWidth - scaledWidth) / 2;
    }

    // Normalized offset
    const normOffsetX = offsetX / destWidth;
    const normOffsetY = offsetY / destHeight;

    // Normalized scale (relative to destination dimensions)
    // We need to map 0..1 in src to 0..1 in dest, but scaled and offset.
    // x_dest = (x_src * srcWidth * scale + offsetX) / destWidth
    //        = x_src * (srcWidth * scale / destWidth) + normOffsetX

    const scaleX = (srcWidth * scale) / destWidth;
    const scaleY = (srcHeight * scale) / destHeight;

    return landmarks.map(lm => ({
        ...lm,
        x: lm.x * scaleX + normOffsetX,
        y: lm.y * scaleY + normOffsetY,
        z: lm.z * scale // Z is roughly relative to image scale
    }));
};
