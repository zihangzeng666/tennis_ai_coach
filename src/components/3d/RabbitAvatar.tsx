import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface RabbitAvatarProps {
    landmarks: any[];
}

const JOINT_RADIUS = 0.08;
const BONE_RADIUS = 0.05;
const RABBIT_COLOR = '#ffffff';
const EAR_COLOR = '#ffc0cb'; // Pink

// Helper to get vector from landmark
const getVec = (landmarks: any[], index: number) => {
    if (!landmarks || !landmarks[index]) return new THREE.Vector3(0, 0, 0);
    // MediaPipe: x (0..1), y (0..1), z (roughly meters, but relative)
    // Three.js: y is up. MP y is down.
    // We map MP x (0..1) -> (-1..1)
    // MP y (0..1) -> (1..-1)
    return new THREE.Vector3(
        (landmarks[index].x - 0.5) * -2, // Flip X to mirror
        -(landmarks[index].y - 0.5) * 2,
        -landmarks[index].z // Z might need scaling
    );
};

const Limb = ({ start, end, color = RABBIT_COLOR, radius = BONE_RADIUS }: { start: THREE.Vector3, end: THREE.Vector3, color?: string, radius?: number }) => {
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
            <cylinderGeometry args={[radius, radius, 1, 8]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};

const Joint = ({ position, radius = JOINT_RADIUS, color = RABBIT_COLOR }: { position: THREE.Vector3, radius?: number, color?: string }) => {
    return (
        <mesh position={position}>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};

const RabbitHead = ({ position, rotation }: { position: THREE.Vector3, rotation?: THREE.Euler }) => {
    return (
        <group position={position}>
            {/* Face */}
            <mesh>
                <sphereGeometry args={[0.15, 32, 32]} />
                <meshStandardMaterial color={RABBIT_COLOR} />
            </mesh>

            {/* Ears */}
            <group position={[0, 0.1, 0]}>
                {/* Left Ear */}
                <mesh position={[-0.08, 0.2, 0]} rotation={[0, 0, -0.2]}>
                    <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
                    <meshStandardMaterial color={RABBIT_COLOR} />
                </mesh>
                <mesh position={[-0.08, 0.2, 0.03]} rotation={[0, 0, -0.2]}>
                    <capsuleGeometry args={[0.02, 0.25, 4, 8]} />
                    <meshStandardMaterial color={EAR_COLOR} />
                </mesh>

                {/* Right Ear */}
                <mesh position={[0.08, 0.2, 0]} rotation={[0, 0, 0.2]}>
                    <capsuleGeometry args={[0.04, 0.3, 4, 8]} />
                    <meshStandardMaterial color={RABBIT_COLOR} />
                </mesh>
                <mesh position={[0.08, 0.2, 0.03]} rotation={[0, 0, 0.2]}>
                    <capsuleGeometry args={[0.02, 0.25, 4, 8]} />
                    <meshStandardMaterial color={EAR_COLOR} />
                </mesh>
            </group>

            {/* Eyes */}
            <mesh position={[-0.05, 0.02, 0.12]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color="black" />
            </mesh>
            <mesh position={[0.05, 0.02, 0.12]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color="black" />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.02, 0.14]}>
                <sphereGeometry args={[0.01, 8, 8]} />
                <meshStandardMaterial color={EAR_COLOR} />
            </mesh>
        </group>
    );
};

export default function RabbitAvatar({ landmarks }: RabbitAvatarProps) {
    if (!landmarks || landmarks.length === 0) return null;

    // Map landmarks to vectors
    // 0: nose
    // 11: left shoulder, 12: right shoulder
    // 13: left elbow, 14: right elbow
    // 15: left wrist, 16: right wrist
    // 23: left hip, 24: right hip
    // 25: left knee, 26: right knee
    // 27: left ankle, 28: right ankle

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

    // Calculate center of hips for torso
    const hipCenter = new THREE.Vector3().addVectors(leftHip, rightHip).multiplyScalar(0.5);
    const shoulderCenter = new THREE.Vector3().addVectors(leftShoulder, rightShoulder).multiplyScalar(0.5);

    return (
        <group>
            {/* Head */}
            <RabbitHead position={nose} />

            {/* Torso (Spine) */}
            <Limb start={shoulderCenter} end={hipCenter} radius={0.12} />

            {/* Shoulders */}
            <Limb start={leftShoulder} end={rightShoulder} radius={0.08} />

            {/* Hips */}
            <Limb start={leftHip} end={rightHip} radius={0.1} />

            {/* Arms */}
            <Joint position={leftShoulder} />
            <Limb start={leftShoulder} end={leftElbow} />
            <Joint position={leftElbow} />
            <Limb start={leftElbow} end={leftWrist} />
            <Joint position={leftWrist} radius={0.06} /> {/* Hand */}

            <Joint position={rightShoulder} />
            <Limb start={rightShoulder} end={rightElbow} />
            <Joint position={rightElbow} />
            <Limb start={rightElbow} end={rightWrist} />
            <Joint position={rightWrist} radius={0.06} /> {/* Hand */}

            {/* Legs */}
            <Joint position={leftHip} radius={0.1} />
            <Limb start={leftHip} end={leftKnee} radius={0.07} />
            <Joint position={leftKnee} />
            <Limb start={leftKnee} end={leftAnkle} radius={0.06} />
            <Joint position={leftAnkle} radius={0.07} /> {/* Foot */}

            <Joint position={rightHip} radius={0.1} />
            <Limb start={rightHip} end={rightKnee} radius={0.07} />
            <Joint position={rightKnee} />
            <Limb start={rightKnee} end={rightAnkle} radius={0.06} />
            <Joint position={rightAnkle} radius={0.07} /> {/* Foot */}

            {/* Tail */}
            <mesh position={[hipCenter.x, hipCenter.y - 0.1, hipCenter.z - 0.15]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color={RABBIT_COLOR} />
            </mesh>
        </group>
    );
}
