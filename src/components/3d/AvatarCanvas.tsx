import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import CharacterModel, { CharacterType } from './CharacterModel';
import { clsx } from 'clsx';

interface AvatarCanvasProps {
    landmarks: any[];
}

export default function AvatarCanvas({ landmarks }: AvatarCanvasProps) {
    const [character, setCharacter] = useState<CharacterType>('rabbit');

    return (
        <div className="w-full h-full bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl overflow-hidden relative group">
            <Canvas
                shadows
                camera={{ position: [0, 0, 4], fov: 50 }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.7} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />

                    <group position={[0, -1, 0]}>
                        <CharacterModel landmarks={landmarks} character={character} />
                        <ContactShadows resolution={1024} scale={10} blur={1} opacity={0.5} far={10} color="#000000" />
                    </group>

                    <Environment preset="city" />
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
                </Suspense>
            </Canvas>

            {/* Overlay Text */}
            <div className="absolute top-4 left-4 bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-white pointer-events-none select-none">
                3D AVATAR MODE
            </div>

            {/* Character Selector */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                    onClick={() => setCharacter('rabbit')}
                    className={clsx(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                        character === 'rabbit'
                            ? "bg-white text-pink-500 shadow-lg scale-105"
                            : "text-white hover:bg-white/20"
                    )}
                >
                    🐰 Rabbit
                </button>
                <button
                    onClick={() => setCharacter('bear')}
                    className={clsx(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                        character === 'bear'
                            ? "bg-white text-amber-700 shadow-lg scale-105"
                            : "text-white hover:bg-white/20"
                    )}
                >
                    🐻 Bear
                </button>
            </div>
        </div>
    );
}
