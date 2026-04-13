import { useRef, useLayoutEffect, memo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface CameraControllerProps {
    targetRef: React.MutableRefObject<THREE.Vector3>;
    cameraPositionRef: React.MutableRefObject<THREE.Vector3>;
    animationStart: number; // Tick counter - increments trigger new animations
    duration?: number;
}

const CameraController = memo(function CameraController({
    targetRef,
    cameraPositionRef,
    animationStart,
    duration = 0.5
}: CameraControllerProps) {
    const { camera } = useThree();
    const startTimeRef = useRef(0);
    const startPositionRef = useRef(new THREE.Vector3());
    const startTargetRef = useRef(new THREE.Vector3());
    const orbitControlsRef = useRef<typeof OrbitControls>(null);
    const isAnimatingRef = useRef(false);
    const lastAnimationStart = useRef(0);
    // Use state for enabled prop so OrbitControls updates when animation ends
    const [controlsEnabled, setControlsEnabled] = useState(true);

    useLayoutEffect(() => {
        // Trigger on tick change (any non-zero value means animate)
        if (animationStart > 0 && animationStart !== lastAnimationStart.current) {
            lastAnimationStart.current = animationStart;
            
            isAnimatingRef.current = true;
            setControlsEnabled(false);
            startPositionRef.current.copy(camera.position);
            if (orbitControlsRef.current) {
                startTargetRef.current.copy(orbitControlsRef.current.target);
            }
            startTimeRef.current = performance.now();
        }
    }, [animationStart, camera]);

    useFrame(() => {
        if (!isAnimatingRef.current) return;

        const elapsed = performance.now() - startTimeRef.current;
        const progress = Math.min(elapsed / (duration * 1000), 1);

        if (progress >= 1) {
            isAnimatingRef.current = false;
            // Re-enable controls when animation completes - triggers re-render
            setControlsEnabled(true);
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
        enabled={controlsEnabled}
    />;
});

CameraController.displayName = 'CameraController';

export { CameraController };