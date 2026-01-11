import { useGLTF, Html } from "@react-three/drei";
import { useRef, memo, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HID_INPUT_TYPES } from "../services/HIDManager.js";

const ChildModule = memo(function ChildModule({
    path,
    onButtonClick,
    onModuleClick,
    isEditable = true,
    position: propPosition = [-1, 0, 0],
    viewMode = '3d',
    isActive = true,
    mappings = {}
}) {
    const gltf = useGLTF(path);
    const groupRef = useRef();
    const glowRef = useRef();
    const frameCountRef = useRef(0);
    const lastAnimationUpdate = useRef(0);
    const [hoveredButton, setHoveredButton] = useState(null);
    const { camera, gl } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());

    // Get button names and meshes for hit detection
    const buttonNames = useRef(new Set());
    const buttonMeshes = useRef(new Map());

    // Convert mouse position to normalized device coordinates
    const getMousePosition = useCallback((event) => {
        const rect = gl.domElement.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }, [gl]);

    // Perform raycasting to find intersected button
    const getIntersectedButton = useCallback(() => {
        raycaster.current.setFromCamera(mouse.current, camera);
        const buttonObjects = Array.from(buttonMeshes.current.values());
        const intersects = raycaster.current.intersectObjects(buttonObjects, false);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            console.log('Intersected button:', intersectedMesh.name);
            return intersectedMesh.name;
        }
        return null;
    }, [camera]);

    const handleMouseClick = useCallback((event) => {
        getMousePosition(event);
        const buttonName = getIntersectedButton();

        if (buttonName) {
            event.stopPropagation();
            const mesh = buttonMeshes.current.get(buttonName);
            if (onButtonClick) {
                onButtonClick(buttonName, mesh);
            }
        } else if (viewMode === '3d' && !isEditable && onModuleClick) {
            onModuleClick();
        }
    }, [viewMode, isEditable, getMousePosition, getIntersectedButton, onButtonClick, onModuleClick]);

    const handleMouseMove = useCallback((event) => {
        getMousePosition(event);
        const buttonName = getIntersectedButton();
        setHoveredButton(buttonName);
    }, [getMousePosition, getIntersectedButton]);

    const handleMouseLeave = useCallback(() => {
        setHoveredButton(null);
    }, []);

    const handleModuleClick = useCallback((e) => {
        e.stopPropagation();
        if (!isEditable && onModuleClick) {
            onModuleClick();
        }
    }, [isEditable, onModuleClick]);

    useEffect(() => {
        if (gltf && gltf.scene) {
            buttonNames.current.clear();
            buttonMeshes.current.clear();
            gltf.scene.traverse((rootChild) => {
                if (rootChild.name.startsWith('button_')) {
                    const buttonGroupName = rootChild.name;
                    // Helper to recursively find and register all meshes within this button group
                    const findMeshes = (node) => {
                        if (node.isMesh) {
                            buttonNames.current.add(node.name);
                            // Store the mesh, but use the buttonGroupName to identify its context if needed
                            buttonMeshes.current.set(node.name, node);
                            console.log(`Found button mesh: ${node.name} under ${buttonGroupName}`, node);
                        }
                        if (node.children) {
                            node.children.forEach(findMeshes);
                        }
                    };

                    findMeshes(rootChild);
                }
            });
            console.log('Total button meshes found:', buttonMeshes.current.size);
        }
    }, [gltf]);

    // Attach mouse event listeners for raycasting
    useEffect(() => {
        const canvas = gl.domElement;
        canvas.addEventListener('click', handleMouseClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvas.removeEventListener('click', handleMouseClick);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [gl, handleMouseClick, handleMouseMove, handleMouseLeave]);

    // Animation loop
    useFrame((state) => {
        if (!isActive) return;

        frameCountRef.current++;

        if (frameCountRef.current % 30 !== 0) return;

        const now = performance.now();
        if (now - lastAnimationUpdate.current < 500) return;
        lastAnimationUpdate.current = now;

        if (groupRef.current && viewMode === '3d' && isEditable) {
            const time = state.clock.elapsedTime;
            groupRef.current.position.y = Math.sin(time * 0.2) * 0.005 + 0.05;

            if (glowRef.current) {
                glowRef.current.material.opacity = 0.12 + Math.sin(time * 0.8) * 0.05;
                glowRef.current.scale.setScalar(1 + Math.sin(time * 0.6) * 0.03);
            }
        }
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '🎮';
            case HID_INPUT_TYPES.KEYBOARD: return '⌨️';
            case HID_INPUT_TYPES.ANALOG: return '🕹️';
            default: return '❓';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#3b82f6';
            case HID_INPUT_TYPES.KEYBOARD: return '#10b981';
            case HID_INPUT_TYPES.ANALOG: return '#f59e0b';
            default: return '#6b7280';
        }
    };

    return (
        <group
            ref={groupRef}
            position={propPosition}
            scale={isEditable ? 4.5 : 3.5}
            onClick={handleModuleClick}
        >
            {/* Selection indicator ring */}
            {isEditable && viewMode === '3d' && (
                <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} ref={glowRef}>
                        <ringGeometry args={[0.28, 0.42, 48]} />
                        <meshBasicMaterial
                            color="#3b82f6"
                            transparent
                            opacity={0.15}
                            side={THREE.DoubleSide}
                            blending={THREE.AdditiveBlending}
                            depthWrite={true}
                            renderOrder={100}
                        />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
                        <ringGeometry args={[0.24, 0.26, 48]} />
                        <meshBasicMaterial
                            color="#3b82f6"
                            transparent
                            opacity={0.6}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            renderOrder={100}
                        />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
                        <ringGeometry args={[0.20, 0.22, 48]} />
                        <meshBasicMaterial
                            color="#3b82f6"
                            transparent
                            opacity={0.9}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            renderOrder={100}
                        />
                    </mesh>
                </>
            )}

            {/* GLB Scene */}
            {gltf.scene && (
                <primitive object={gltf.scene} />
            )}

            {/* Hover overlays for 2D mode */}
            {viewMode === '2d' && hoveredButton && mappings[hoveredButton] && (
                <Html
                    position={[0, 0.15, 0]}
                    center
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.85)',
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        border: `1px solid ${getTypeColor(mappings[hoveredButton].type)}`,
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span>{getTypeIcon(mappings[hoveredButton].type)}</span>
                        <span>{mappings[hoveredButton].label || mappings[hoveredButton].action}</span>
                    </div>
                </Html>
            )}

            {/* Hover indicator ring - positioned dynamically based on button */}
            {viewMode === '2d' && hoveredButton && (
                <IndicatorRing
                    buttonName={hoveredButton}
                    gltf={gltf}
                />
            )}

            {/* Cursor hint when hovered */}
            {viewMode === '2d' && hoveredButton && (
                <Html
                    position={[0, 0.2, 0]}
                    center
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    <div style={{
                        background: '#3b82f6',
                        color: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                    }}>
                        Click to Configure
                    </div>
                </Html>
            )}
        </group>
    );
});

function IndicatorRing({ buttonName, gltf }) {
    const [position, setPosition] = useState([0, 0, 0]);

    useEffect(() => {
        if (gltf && gltf.scene) {
            gltf.scene.traverse((child) => {
                if (child.name === buttonName) {
                    setPosition([child.position.x, child.position.y + 0.05, child.position.z]);
                }
            });
        }
    }, [buttonName, gltf]);

    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.04, 0.055, 32]} />
            <meshBasicMaterial
                color="#3b82f6"
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

const MemoizedChildModule = memo(ChildModule, (prevProps, nextProps) => {
    return (
        prevProps.path === nextProps.path &&
        prevProps.isEditable === nextProps.isEditable &&
        prevProps.viewMode === nextProps.viewMode &&
        prevProps.isActive === nextProps.isActive &&
        JSON.stringify(prevProps.position) === JSON.stringify(nextProps.position) &&
        JSON.stringify(prevProps.mappings) === JSON.stringify(nextProps.mappings)
    );
});

export { ChildModule, MemoizedChildModule };
