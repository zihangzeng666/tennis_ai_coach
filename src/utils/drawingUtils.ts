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
        drawPandaStyle(ctx, landmarks);
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

function drawPandaStyle(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    // Panda Colors
    const furWhite = '#ffffff';
    const furBlack = '#1a1a1a';

    // Helper to draw rotated ellipse (limb segment)
    const drawLimb = (startIdx: number, endIdx: number, thickness: number, color: string) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        if (!p1 || !p2 || (p1.visibility && p1.visibility < 0.5) || (p2.visibility && p2.visibility < 0.5)) return;

        const x1 = p1.x * ctx.canvas.width;
        const y1 = p1.y * ctx.canvas.height;
        const x2 = p2.x * ctx.canvas.width;
        const y2 = p2.y * ctx.canvas.height;

        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Draw Ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, length / 2 + thickness / 2, thickness, 0, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Optional: Slight border for definition
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    };

    const drawCircle = (index: number, radius: number, color: string) => {
        const p = landmarks[index];
        if (!p || (p.visibility && p.visibility < 0.5)) return;
        const x = p.x * ctx.canvas.width;
        const y = p.y * ctx.canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    };

    // --- 1. Ears (Behind Head) ---
    // Estimate ear positions relative to nose/eyes
    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];

    if (nose && leftEye && rightEye) {
        const nx = nose.x * ctx.canvas.width;
        const ny = nose.y * ctx.canvas.height;
        const lex = leftEye.x * ctx.canvas.width;
        const ley = leftEye.y * ctx.canvas.height;
        const rex = rightEye.x * ctx.canvas.width;
        const rey = rightEye.y * ctx.canvas.height;

        // Simple ear offset logic
        const earRadius = 18;
        ctx.beginPath();
        ctx.arc(lex - 15, ley - 15, earRadius, 0, 2 * Math.PI); // Left Ear
        ctx.arc(rex + 15, rey - 15, earRadius, 0, 2 * Math.PI); // Right Ear
        ctx.fillStyle = furBlack;
        ctx.fill();
    }

    // --- 2. Limbs (Black/White) ---
    // Arms (Black)
    drawLimb(11, 13, 18, furBlack); // L Shoulder -> Elbow
    drawLimb(13, 15, 16, furBlack); // L Elbow -> Wrist
    drawLimb(12, 14, 18, furBlack); // R Shoulder -> Elbow
    drawLimb(14, 16, 16, furBlack); // R Elbow -> Wrist

    // Legs (Black)
    drawLimb(23, 25, 22, furBlack); // L Hip -> Knee
    drawLimb(25, 27, 20, furBlack); // L Knee -> Ankle
    drawLimb(24, 26, 22, furBlack); // R Hip -> Knee
    drawLimb(26, 28, 20, furBlack); // R Knee -> Ankle

    // Torso (White)
    // Draw a big oval between shoulders and hips
    const lShoulder = landmarks[11];
    const rShoulder = landmarks[12];
    const lHip = landmarks[23];
    const rHip = landmarks[24];

    if (lShoulder && rShoulder && lHip && rHip) {
        const sx = (lShoulder.x + rShoulder.x) / 2 * ctx.canvas.width;
        const sy = (lShoulder.y + rShoulder.y) / 2 * ctx.canvas.height;
        const hx = (lHip.x + rHip.x) / 2 * ctx.canvas.width;
        const hy = (lHip.y + rHip.y) / 2 * ctx.canvas.height;

        const cx = (sx + hx) / 2;
        const cy = (sy + hy) / 2;
        const length = Math.hypot(hx - sx, hy - sy);
        const angle = Math.atan2(hy - sy, hx - sx);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, length / 2 + 20, 45, 0, 0, 2 * Math.PI); // Fat body
        ctx.fillStyle = furWhite;
        ctx.fill();
        ctx.restore();
    }

    // --- 3. Paws (Black) ---
    drawCircle(15, 12, furBlack); // L Wrist
    drawCircle(16, 12, furBlack); // R Wrist
    drawCircle(27, 14, furBlack); // L Ankle
    drawCircle(28, 14, furBlack); // R Ankle

    // --- 4. Head (White) ---
    drawCircle(0, 35, furWhite); // Nose as center anchor for head

    // --- 5. Face Details ---
    if (nose && leftEye && rightEye) {
        const nx = nose.x * ctx.canvas.width;
        const ny = nose.y * ctx.canvas.height;
        const lex = leftEye.x * ctx.canvas.width;
        const ley = leftEye.y * ctx.canvas.height;
        const rex = rightEye.x * ctx.canvas.width;
        const rey = rightEye.y * ctx.canvas.height;

        // Eye Patches (Black Ovals)
        ctx.beginPath();
        ctx.ellipse(lex, ley, 10, 8, -0.2, 0, 2 * Math.PI);
        ctx.ellipse(rex, rey, 10, 8, 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = furBlack;
        ctx.fill();

        // Eyes (White dots)
        ctx.beginPath();
        ctx.arc(lex, ley - 2, 3, 0, 2 * Math.PI);
        ctx.arc(rex, rey - 2, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Nose (Black)
        ctx.beginPath();
        ctx.ellipse(nx, ny + 5, 6, 4, 0, 0, 2 * Math.PI);
        ctx.fillStyle = furBlack;
        ctx.fill();
    }
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
