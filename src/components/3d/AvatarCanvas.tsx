import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import RabbitAvatar from './RabbitAvatar';

interface AvatarCanvasProps {
    landmarks: any[];
}

export default function AvatarCanvas({ landmarks }: AvatarCanvasProps) {
    return (
        <div className="w-full h-full bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl overflow-hidden">
            <Canvas
                shadows
                camera={{ position: [0, 0, 4], fov: 50 }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.7} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />

                    <group position={[0, -1, 0]}>
                        <RabbitAvatar landmarks={landmarks} />
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
        </div>
    );
}
