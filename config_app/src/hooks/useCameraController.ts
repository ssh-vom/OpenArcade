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
    const [animationTick, setAnimationTick] = useState(0);
    const lastIndexRef = useRef(-1);

    useLayoutEffect(() => {
        if (!enabled || currentModuleIndex < 0 || !modules[currentModuleIndex]) {
            return;
        }
        
        // Skip if same index - prevents unnecessary animations
        if (currentModuleIndex === lastIndexRef.current) {
            return;
        }
        lastIndexRef.current = currentModuleIndex;
        
        const targetModule = modules[currentModuleIndex];
        const targetPosition = new THREE.Vector3(...targetModule.position);
        
        targetRef.current.copy(targetPosition);
        cameraPositionRef.current.set(
            targetPosition.x,
            targetPosition.y + 1.5,
            targetPosition.z + 3
        );
        
        // Increment tick to trigger animation - lighter than Date.now()
        setAnimationTick(t => t + 1);
    }, [currentModuleIndex, modules, enabled]);

    return {
        targetRef,
        cameraPositionRef,
        animationStart: animationTick, // Still a number, but small and sequential
    };
}