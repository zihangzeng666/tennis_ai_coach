export interface ProReference {
    name: string;
    description: string;
    idealAngles: {
        rightElbow?: [number, number]; // min, max
        leftElbow?: [number, number];
        rightKnee?: [number, number];
        leftKnee?: [number, number];
        rightShoulder?: [number, number];
        leftShoulder?: [number, number];
    };
}

export const PRO_REFERENCES: ProReference[] = [
    {
        name: "Forehand Drive",
        description: "Ideal forehand contact point requires a semi-bent elbow and good knee flexion.",
        idealAngles: {
            rightElbow: [140, 170], // Extended but not locked
            rightKnee: [130, 160],  // Athletic stance
        }
    },
    {
        name: "Backhand Drive",
        description: "For a two-handed backhand, keep both arms relatively straight at contact.",
        idealAngles: {
            leftElbow: [150, 180],
            rightElbow: [150, 180],
        }
    },
    {
        name: "Serve (Trophy Position)",
        description: "High elbow and deep knee bend are crucial for power.",
        idealAngles: {
            rightElbow: [80, 100], // 90 degree angle
            leftKnee: [110, 140],  // Deep bend
        }
    }
];
