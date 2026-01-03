import { useRef, useEffect, memo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const CameraController = memo(function CameraController({
    targetRef,
    cameraPositionRef,
    animationStart,
    duration = 0.5
}) {
    const { camera } = useThree();
    const startTimeRef = useRef(0);
    const startPositionRef = useRef(new THREE.Vector3());
    const startTargetRef = useRef(new THREE.Vector3());
    const orbitControlsRef = useRef(null);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (animationStart > 0) {
            setIsAnimating(true);
            startPositionRef.current.copy(camera.position);
            if (orbitControlsRef.current) {
                startTargetRef.current.copy(orbitControlsRef.current.target);
            }
            startTimeRef.current = performance.now();
        }
    }, [animationStart]);

    useFrame(() => {
        if (!isAnimating) return;

        const elapsed = performance.now() - startTimeRef.current;
        const progress = Math.min(elapsed / (duration * 1000), 1);

        if (progress >= 1) {
            setIsAnimating(false);
            if (orbitControlsRef.current) {
                orbitControlsRef.current.target.copy(targetRef.current);
            }
            return;
        }

        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(
            startPositionRef.current,
            cameraPositionRef.current,
            eased
        );

        if (orbitControlsRef.current) {
            orbitControlsRef.current.target.lerpVectors(
                startTargetRef.current,
                targetRef.current,
                eased
            );
            orbitControlsRef.current.update();
        }
    });

    return <OrbitControls 
        ref={orbitControlsRef}
        makeDefault
        enabled={!isAnimating}
    />;
});

CameraController.displayName = 'CameraController';

export { CameraController };