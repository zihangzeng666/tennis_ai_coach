import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type CharacterType = 'rabbit' | 'bear';

interface CharacterConfig {
    type: CharacterType;
    colors: {
        primary: string;
        secondary: string; // Inner ear, muzzle
        eyes: string;
        nose: string;
    };
    ears: 'long' | 'round';
    tail: 'round' | 'stub';
}

export const CHARACTERS: Record<CharacterType, CharacterConfig> = {
    rabbit: {
        type: 'rabbit',
        colors: {
            primary: '#ffffff',
            secondary: '#ffc0cb',
            eyes: '#000000',
            nose: '#ffc0cb',
        },
        ears: 'long',
        tail: 'round',
    },
    bear: {
        type: 'bear',
        colors: {
            primary: '#8B4513', // SaddleBrown
            secondary: '#D2B48C', // Tan
            eyes: '#000000',
            nose: '#3e2723',
        },
        ears: 'round',
        tail: 'stub',
    },
};

interface CharacterModelProps {
    landmarks: any[];
    character: CharacterType;
}

// Chibi Proportions
const HEAD_SCALE = 1.8;
const BODY_SCALE = 0.9;
const LIMB_THICKNESS = 0.12;
const JOINT_SIZE = 0.14;

// Helper to get vector from landmark with exaggerated Z for depth
const getVec = (landmarks: any[], index: number) => {
    if (!landmarks || !landmarks[index]) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(
        (landmarks[index].x - 0.5) * -2.2, // Wider stance
        -(landmarks[index].y - 0.5) * 2.0,
        -landmarks[index].z * 3.0 // Exaggerate depth to prevent clipping
    );
};

const Limb = ({ start, end, color, thickness = LIMB_THICKNESS }: { start: THREE.Vector3, end: THREE.Vector3, color: string, thickness?: number }) => {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (ref.current) {
            const distance = start.distanceTo(end);
            ref.current.position.copy(start).lerp(end, 0.5);
            ref.current.lookAt(end);
            ref.current.rotateX(Math.PI / 2);
            ref.current.scale.set(1, distance, 1);
        }
    });

    return (
        <mesh ref={ref}>
            <capsuleGeometry args={[thickness, 1, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
    );
};

const Joint = ({ position, radius = JOINT_SIZE, color }: { position: THREE.Vector3, radius?: number, color: string }) => {
    return (
        <mesh position={position}>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
    );
};

const Head = ({ position, config, lookAt }: { position: THREE.Vector3, config: CharacterConfig, lookAt?: THREE.Vector3 }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (groupRef.current && lookAt) {
            // Smoothly look at target
            const targetQuaternion = new THREE.Quaternion();
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.lookAt(position, lookAt, new THREE.Vector3(0, 1, 0));
            targetQuaternion.setFromRotationMatrix(rotationMatrix);
            groupRef.current.quaternion.slerp(targetQuaternion, 0.2);
        }
    });

    return (
        <group ref={groupRef} position={position} scale={HEAD_SCALE}>
            {/* Main Head */}
            <mesh>
                <sphereGeometry args={[0.18, 32, 32]} />
                <meshStandardMaterial color={config.colors.primary} roughness={0.7} />
            </mesh>

            {/* Muzzle (for Bear) */}
            {config.type === 'bear' && (
                <mesh position={[0, -0.04, 0.14]} scale={[1, 0.8, 0.6]}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshStandardMaterial color={config.colors.secondary} />
                </mesh>
            )}

            {/* Ears */}
            <group position={[0, 0.12, 0]}>
                {config.ears === 'long' ? (
                    // Rabbit Ears
                    <>
                        <mesh position={[-0.08, 0.2, 0]} rotation={[0, 0, -0.2]}>
                            <capsuleGeometry args={[0.04, 0.35, 4, 8]} />
                            <meshStandardMaterial color={config.colors.primary} />
                        </mesh>
                        <mesh position={[-0.08, 0.2, 0.025]} rotation={[0, 0, -0.2]}>
                            <capsuleGeometry args={[0.02, 0.28, 4, 8]} />
                            <meshStandardMaterial color={config.colors.secondary} />
                        </mesh>
                        <mesh position={[0.08, 0.2, 0]} rotation={[0, 0, 0.2]}>
                            <capsuleGeometry args={[0.04, 0.35, 4, 8]} />
                            <meshStandardMaterial color={config.colors.primary} />
                        </mesh>
                        <mesh position={[0.08, 0.2, 0.025]} rotation={[0, 0, 0.2]}>
                            <capsuleGeometry args={[0.02, 0.28, 4, 8]} />
                            <meshStandardMaterial color={config.colors.secondary} />
                        </mesh>
                    </>
                ) : (
                    // Bear Ears
                    <>
                        <mesh position={[-0.12, 0.05, 0]}>
                            <sphereGeometry args={[0.06, 16, 16]} />
                            <meshStandardMaterial color={config.colors.primary} />
                        </mesh>
                        <mesh position={[-0.12, 0.05, 0.04]}>
                            <sphereGeometry args={[0.03, 16, 16]} />
                            <meshStandardMaterial color={config.colors.secondary} />
                        </mesh>
                        <mesh position={[0.12, 0.05, 0]}>
                            <sphereGeometry args={[0.06, 16, 16]} />
                            <meshStandardMaterial color={config.colors.primary} />
                        </mesh>
                        <mesh position={[0.12, 0.05, 0.04]}>
                            <sphereGeometry args={[0.03, 16, 16]} />
                            <meshStandardMaterial color={config.colors.secondary} />
                        </mesh>
                    </>
                )}
            </group>

            {/* Eyes */}
            <mesh position={[-0.06, 0.02, 0.15]}>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshStandardMaterial color={config.colors.eyes} />
            </mesh>
            <mesh position={[0.06, 0.02, 0.15]}>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshStandardMaterial color={config.colors.eyes} />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.02, config.type === 'bear' ? 0.19 : 0.16]}>
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshStandardMaterial color={config.colors.nose} />
            </mesh>
        </group>
    );
};

export default function CharacterModel({ landmarks, character }: CharacterModelProps) {
    if (!landmarks || landmarks.length === 0) return null;

    const config = CHARACTERS[character];

    // Map landmarks
    const nose = getVec(landmarks, 0);
    const leftShoulder = getVec(landmarks, 11);
    const rightShoulder = getVec(landmarks, 12);
    const leftElbow = getVec(landmarks, 13);
    const rightElbow = getVec(landmarks, 14);
    const leftWrist = getVec(landmarks, 15);
    const rightWrist = getVec(landmarks, 16);
    const leftHip = getVec(landmarks, 23);
    const rightHip = getVec(landmarks, 24);
    const leftKnee = getVec(landmarks, 25);
    const rightKnee = getVec(landmarks, 26);
    const leftAnkle = getVec(landmarks, 27);
    const rightAnkle = getVec(landmarks, 28);

    // Head Landmarks for orientation
    const leftEar = getVec(landmarks, 7);
    const rightEar = getVec(landmarks, 8);

    const hipCenter = new THREE.Vector3().addVectors(leftHip, rightHip).multiplyScalar(0.5);
    const shoulderCenter = new THREE.Vector3().addVectors(leftShoulder, rightShoulder).multiplyScalar(0.5);

    // Calculate Head Orientation
    // Vector from mid-ears to nose points forward
    const midEar = new THREE.Vector3().addVectors(leftEar, rightEar).multiplyScalar(0.5);
    const headForward = new THREE.Vector3().subVectors(nose, midEar).normalize();
    const headLookAt = nose.clone().add(headForward);

    // Calculate Body Orientation for Tail
    // Cross product of spine (up) and shoulders (right) gives forward
    const spine = new THREE.Vector3().subVectors(shoulderCenter, hipCenter).normalize();
    const shoulders = new THREE.Vector3().subVectors(rightShoulder, leftShoulder).normalize();
    const bodyForward = new THREE.Vector3().crossVectors(shoulders, spine).normalize();

    // Tail position: behind hips
    // We use bodyForward to determine "backwards"
    const tailPos = hipCenter.clone().sub(bodyForward.multiplyScalar(0.15)).add(new THREE.Vector3(0, -0.05, 0));

    // Adjust head position slightly up for cuteness
    const headPos = nose.clone().add(new THREE.Vector3(0, 0.1, 0));

    return (
        <group>
            <Head position={headPos} config={config} lookAt={headLookAt} />

            {/* Torso */}
            <Limb start={shoulderCenter} end={hipCenter} color={config.colors.primary} thickness={0.25} />

            {/* Arms */}
            <Joint position={leftShoulder} color={config.colors.primary} />
            <Limb start={leftShoulder} end={leftElbow} color={config.colors.primary} />
            <Joint position={leftElbow} color={config.colors.primary} />
            <Limb start={leftElbow} end={leftWrist} color={config.colors.primary} />
            <Joint position={leftWrist} radius={0.08} color={config.colors.primary} />

            <Joint position={rightShoulder} color={config.colors.primary} />
            <Limb start={rightShoulder} end={rightElbow} color={config.colors.primary} />
            <Joint position={rightElbow} color={config.colors.primary} />
            <Limb start={rightElbow} end={rightWrist} color={config.colors.primary} />
            <Joint position={rightWrist} radius={0.08} color={config.colors.primary} />

            {/* Legs */}
            <Joint position={leftHip} radius={0.16} color={config.colors.primary} />
            <Limb start={leftHip} end={leftKnee} color={config.colors.primary} thickness={0.14} />
            <Joint position={leftKnee} color={config.colors.primary} />
            <Limb start={leftKnee} end={leftAnkle} color={config.colors.primary} thickness={0.12} />
            <Joint position={leftAnkle} radius={0.1} color={config.colors.primary} />

            <Joint position={rightHip} radius={0.16} color={config.colors.primary} />
            <Limb start={rightHip} end={rightKnee} color={config.colors.primary} thickness={0.14} />
            <Joint position={rightKnee} color={config.colors.primary} />
            <Limb start={rightKnee} end={rightAnkle} color={config.colors.primary} thickness={0.12} />
            <Joint position={rightAnkle} radius={0.1} color={config.colors.primary} />

            {/* Tail */}
            <mesh position={tailPos}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={config.colors.primary} />
            </mesh>
        </group>
    );
}
