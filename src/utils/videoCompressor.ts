import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export class VideoCompressor {
    private ffmpeg: FFmpeg;
    private loaded: boolean = false;

    constructor() {
        this.ffmpeg = new FFmpeg();
    }

    async load() {
        if (this.loaded) return;

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        this.loaded = true;
    }

    async compress(file: File, onProgress: (progress: number) => void, startTime?: number, endTime?: number): Promise<Blob> {
        if (!this.loaded) await this.load();

        const { ffmpeg } = this;
        const inputName = 'input.mov'; // Generic name
        const outputName = 'output.mp4';

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        ffmpeg.on('progress', ({ progress }) => {
            onProgress(Math.round(progress * 100));
        });

        // Build FFmpeg arguments
        const args = [];

        // Seek to start time (fast seek before input)
        if (startTime !== undefined) {
            args.push('-ss', startTime.toString());
        }

        args.push('-i', inputName);

        // Duration/End time
        if (endTime !== undefined && startTime !== undefined) {
            args.push('-t', (endTime - startTime).toString());
        } else if (endTime !== undefined) {
            args.push('-to', endTime.toString());
        }

        // Compression settings
        args.push(
            '-vf', 'scale=-2:720', // Scale height to 720, keep aspect ratio
            '-c:v', 'libx264',
            '-crf', '28', // Constant Rate Factor
            '-preset', 'ultrafast', // Fast compression
            outputName
        );

        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile(outputName);
        return new Blob([data as any], { type: 'video/mp4' });
    }

    async convert(blob: Blob, onProgress: (progress: number) => void): Promise<Blob> {
        if (!this.loaded) await this.load();

        const { ffmpeg } = this;
        const inputName = 'recording.webm';
        const outputName = 'export.mp4';

        await ffmpeg.writeFile(inputName, await fetchFile(blob));

        ffmpeg.on('progress', ({ progress }) => {
            onProgress(Math.round(progress * 100));
        });

        // Convert to MP4 (H.264)
        // We use ultrafast to make it quick for the user
        // -movflags +faststart ensures the video is web-ready and metadata is at the start
        await ffmpeg.exec([
            '-i', inputName,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '22',
            '-movflags', '+faststart',
            outputName
        ]);

        const data = await ffmpeg.readFile(outputName);
        return new Blob([data as any], { type: 'video/mp4' });
    }
}
