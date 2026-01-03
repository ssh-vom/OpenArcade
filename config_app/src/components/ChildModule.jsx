import { useGLTF } from "@react-three/drei";
import { useRef, memo, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ChildModule = memo(function ChildModule({ path, onButtonClick, onModuleClick, isEditable = true, position: propPosition = [-1, 0, 0], viewMode = '3d' }) {
    const gltf = useGLTF(path);
    const groupRef = useRef();
    const glowRef = useRef();



    const buttons = useMemo(() => {
        const data = [];
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                if (name.includes('button') || name.includes('btn')) {
                    const originalColor = child.material?.color?.clone() || new THREE.Color(0xffffff);
                    data.push({
                        name: child.name,
                        geometry: child.geometry,
                        material: child.material.clone(),
                        position: child.position.clone(),
                        rotation: child.rotation.clone(),
                        scale: child.scale.clone(),
                        originalColor
                    });
                    child.visible = false;
                }
            }
        });
        return data;
    }, [gltf]);

    const frameCountRef = useRef(0);

    useFrame((state) => {
        frameCountRef.current++;
        if (frameCountRef.current % 2 !== 0) return; // Throttle to every other frame

        if (groupRef.current) {
            if (viewMode === '3d') {
                const targetScale = isEditable ? 10.5 : 7.5;
                const currentScale = groupRef.current.scale.x;
                const smoothedScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.08);
                groupRef.current.scale.setScalar(smoothedScale);

                groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03 + (isEditable ? 0.12 : 0);

                if (glowRef.current && isEditable) {
                    glowRef.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
                }
            } else if (viewMode === '2d') {
                // Rotate for "video" effect
                groupRef.current.rotation.y += 0.01;
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
            scale={0}
        onClick={handleModuleClick}
        >
            {/* Selection indicator ring - positioned at base of model */}
            {isEditable && (
                <>
                    {/* Outer pulsing glow ring */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]} ref={glowRef}>
                        <ringGeometry args={[0.55, 0.85, 64]} />
                        <meshBasicMaterial 
                            color="#3b82f6"
                            transparent
                            opacity={0.2}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    {/* Inner sharp ring */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
                        <ringGeometry args={[0.5, 0.52, 64]} />
                        <meshBasicMaterial 
                            color="#3b82f6"
                            transparent
                            opacity={0.9}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    {/* Upward triangle pointer */}
                    <mesh position={[0, -0.2, 0]}>
                        <coneGeometry args={[0.06, 0.25, 3]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
                    </mesh>
                </>
            )}
            
            {gltf.scene && <primitive object={gltf.scene} />}
            {isEditable && buttons.map((button, index) => (
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

export { ChildModule };

