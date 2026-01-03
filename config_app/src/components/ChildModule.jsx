import { useGLTF } from "@react-three/drei";
import { useRef, memo, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ChildModule = memo(function ChildModule({ path, onButtonClick, onModuleClick, isEditable = true, position: propPosition = [-1, 0, 0], viewMode = '3d', isActive = true }) {
    const gltf = useGLTF(path);
    const groupRef = useRef();
    const glowRef = useRef();



    const buttons = useMemo(() => {
        const data = [];
        const materialCache = new Map();
        
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                if (name.includes('button') || name.includes('btn')) {
                    // Cache materials to avoid cloning with null check
                    if (!child.material) return;
                    let material = materialCache.get(child.material.uuid);
                    if (!material) {
                        material = child.material.clone();
                        materialCache.set(child.material.uuid, material);
                    }
                    
                    data.push({
                        name: child.name,
                        geometry: child.geometry,
                        material,
                        position: child.position.clone(),
                        rotation: child.rotation.clone(),
                        scale: child.scale.clone(),
                        originalColor: material.color.clone()
                    });
                    child.visible = false;
                }
            }
        });
        return data;
    }, [gltf]);

const frameCountRef = useRef(0);
    const lastAnimationUpdate = useRef(0);

    useFrame((state) => {
        // Skip frames completely for inactive modules or non-editable mode
        if (!isActive || !isEditable) return;
        
        frameCountRef.current++;
        
        // EXTREME throttling - only animate every 30th frame (2 FPS at 60Hz)
        if (frameCountRef.current % 30 !== 0) return;
        
        const now = performance.now();
        // Limit animation updates to 2Hz max (every 500ms)
        if (now - lastAnimationUpdate.current < 500) return;
        lastAnimationUpdate.current = now;

        if (groupRef.current && viewMode === '3d') {
            const time = state.clock.elapsedTime;
            groupRef.current.position.y = Math.sin(time * 0.2) * 0.005 + 0.05;
            
            if (glowRef.current) {
                glowRef.current.material.opacity = 0.15 + Math.sin(time * 0.5) * 0.02;
            }
        }
    });

    const handleModuleClick = (e) => {
        e.stopPropagation();
        if (!isEditable && onModuleClick) {
            onModuleClick();
        }
    };

    const handleClick = (e, button) => {
        e.stopPropagation();
        if (isEditable && onButtonClick) {
            onButtonClick(button.name, button);
        }
    };

    const handleHover = (button, isHovered) => {
        if (isEditable && button.material?.color) {
            button.material.color.copy(
                isHovered 
                    ? new THREE.Color(0x4ade80)
                    : button.originalColor
            );
        }
    };

    return (
        <group 
            ref={groupRef} 
            position={propPosition} 
            scale={isEditable ? 4.5 : 3.5}
        onClick={handleModuleClick}
        >
            {/* Selection indicator ring - positioned at base of model */}
            {isEditable && (
                <>
                    {/* Outer pulsing glow ring */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} ref={glowRef}>
                        <ringGeometry args={[0.25, 0.4, 32]} />
                        <meshBasicMaterial 
                            color="#3b82f6"
                            transparent
                            opacity={0.2}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    {/* Inner sharp ring */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
                        <ringGeometry args={[0.22, 0.24, 32]} />
                        <meshBasicMaterial 
                            color="#3b82f6"
                            transparent
                            opacity={0.9}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </>
            )}
            
            {gltf.scene && <primitive object={gltf.scene} />}
            {isEditable && isActive && buttons.map((button, index) => (
                <mesh
                    key={index}
                    geometry={button.geometry}
                    material={button.material}
                    position={button.position}
                    rotation={button.rotation}
                    scale={button.scale}
                    onClick={(e) => handleClick(e, button)}
                    onPointerOver={() => handleHover(button, true)}
                    onPointerOut={() => handleHover(button, false)}
                />
            ))}
        </group>
    );
});

ChildModule.displayName = 'ChildModule';

// Add custom comparison for memo
const MemoizedChildModule = memo(ChildModule, (prevProps, nextProps) => {
    return (
        prevProps.path === nextProps.path &&
        prevProps.isEditable === nextProps.isEditable &&
        prevProps.viewMode === nextProps.viewMode &&
        prevProps.isActive === nextProps.isActive &&
        JSON.stringify(prevProps.position) === JSON.stringify(nextProps.position)
    );
});

export { ChildModule, MemoizedChildModule };

