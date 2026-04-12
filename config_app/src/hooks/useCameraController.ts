import { useRef, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import type { Module } from "@/types";

interface UseCameraControllerOptions {
    currentModuleIndex: number;
    modules: Array<Pick<Module, "position">>;
    enabled?: boolean;
}

export function useCameraController({
    currentModuleIndex,
    modules,
    enabled = true,
}: UseCameraControllerOptions) {
    const targetRef = useRef(new THREE.Vector3(0, 0, 0));
    const cameraPositionRef = useRef(new THREE.Vector3(0, 2, 5));
    const [animationStart, setAnimationStart] = useState(0);

    useLayoutEffect(() => {
        if (enabled && currentModuleIndex >= 0 && modules[currentModuleIndex]) {
            const targetModule = modules[currentModuleIndex];
            const targetPosition = new THREE.Vector3(...targetModule.position);
            
            targetRef.current.copy(targetPosition);
            cameraPositionRef.current.set(
                targetPosition.x,
                targetPosition.y + 1.5,
                targetPosition.z + 3
            );
            
            // Always trigger animation with timestamp for uniqueness
            // eslint-disable-next-line react-hooks/set-state-in-effect -- useLayoutEffect is correct for synchronous animation trigger
            setAnimationStart(Date.now());
        }
    }, [currentModuleIndex, modules, enabled]);

    return {
        targetRef,
        cameraPositionRef,
        animationStart
    };
}