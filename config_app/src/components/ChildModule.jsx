import { useGLTF } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function ChildModule({ path, onButtonClick }) {
    const gltf = useGLTF(path);
    const groupRef = useRef();
    const [buttons, setButtons] = useState([]);
    const [modelReady, setModelReady] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (modelReady && !loaded) {
            setLoaded(true);
        }
    }, [modelReady, loaded]);

    useEffect(() => {
        const buttonData = [];
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                if (name.includes('button') || name.includes('btn')) {
                    const originalColor = child.material?.color?.clone() || new THREE.Color(0xffffff);
                    buttonData.push({
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
        setButtons(buttonData);
        setModelReady(true);
    }, [gltf]);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
            if (!loaded && modelReady) {
                const progress = Math.min((state.clock.elapsedTime - 0.3) / 0.8, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                groupRef.current.scale.setScalar(10 * eased);
                if (progress >= 1) setLoaded(true);
            }
        }
    });

    const handleClick = (e, button) => {
        e.stopPropagation();
        if (onButtonClick) {
            onButtonClick(button.name, button);
        }
    };

    const handleHover = (button, isHovered) => {
        if (button.material?.color) {
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
            position={[-1, 0, 0]} 
            scale={loaded ? 10 : 0}
        >
            {modelReady && <primitive object={gltf.scene} />}
            {buttons.map((button, index) => (
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
}

