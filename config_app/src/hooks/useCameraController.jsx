import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

export function useCameraController({
    currentModuleIndex,
    modules,
    enabled = true
}) {
    const targetRef = useRef(new THREE.Vector3(0, 0, 0));
    const cameraPositionRef = useRef(new THREE.Vector3(0, 2, 5));
    const [animationStart, setAnimationStart] = useState(0);

    useEffect(() => {
        if (enabled && currentModuleIndex >= 0 && modules[currentModuleIndex]) {
            const targetModule = modules[currentModuleIndex];
            const targetPosition = new THREE.Vector3(...targetModule.position);
            
            targetRef.current.copy(targetPosition);
            cameraPositionRef.current.set(
                targetPosition.x,
                targetPosition.y + 2,
                targetPosition.z + 5
            );
            setAnimationStart(prev => prev + 1);
        }
    }, [currentModuleIndex, modules, enabled]);

    return {
        targetRef,
        cameraPositionRef,
        animationStart
    };
}