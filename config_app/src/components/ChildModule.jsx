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
    const buttonMaterialState = useRef(new Map());

    function prepareHighlightMaterial(mesh) {
        const storeMaterial = (material) => {
            if (!material || buttonMaterialState.current.has(material.uuid)) {
                return;
            }

            const original = {
                uuid: material.uuid,
                emissive: material.emissive ? material.emissive.clone() : null,
                emissiveIntensity: material.emissiveIntensity ?? 0,
            };

            buttonMaterialState.current.set(material.uuid, original);
        };

        const cloneMaterial = (material) => {
            if (!material) {
                return material;
            }
            const cloned = material.clone();
            storeMaterial(cloned);
            return cloned;
        };

        if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((mat) => cloneMaterial(mat));
        } else if (mesh.material) {
            mesh.material = cloneMaterial(mesh.material);
        }
    }

    function applyHighlight(mesh, enabled, color) {
        const updateMaterial = (material) => {
            if (!material) {
                return;
            }

            const original = buttonMaterialState.current.get(material.uuid);
            if (!original) {
                return;
            }

            if (material.emissive) {
                if (enabled) {
                    material.emissive.copy(color);
                    material.emissiveIntensity = 0.45;
                } else {
                    material.emissive.copy(original.emissive || new THREE.Color(0x000000));
                    material.emissiveIntensity = original.emissiveIntensity;
                }
            }
        };

        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(updateMaterial);
        } else {
            updateMaterial(mesh.material);
        }
    }

    // Get button names and meshes for hit detection
    const buttonMeshes = useRef(new Set());
    const buttonNameByMesh = useRef(new Map());

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
            let buttonName = buttonNameByMesh.current.get(intersectedMesh.uuid);
            if (!buttonName) {
                let node = intersectedMesh;
                while (node) {
                    if (node.name && node.name.startsWith("button_")) {
                        buttonName = node.name;
                        break;
                    }
                    node = node.parent;
                }
            }
            console.log('Intersected button:', buttonName || intersectedMesh.name);
            return { name: buttonName || intersectedMesh.name, mesh: intersectedMesh };
        }
        return null;
    }, [camera]);

    const handleMouseClick = useCallback((event) => {
        if (viewMode === '3d') {
            return;
        }
        getMousePosition(event);
        const hit = getIntersectedButton();

        if (hit) {
            event.stopPropagation();
            if (onButtonClick) {
                onButtonClick(hit.name, hit.mesh);
            }
        } else if (viewMode === '3d' && !isEditable && onModuleClick) {
            onModuleClick();
        }
    }, [viewMode, isEditable, getMousePosition, getIntersectedButton, onButtonClick, onModuleClick]);

    const handleMouseMove = useCallback((event) => {
        if (viewMode === '3d') {
            if (hoveredButton) {
                setHoveredButton(null);
            }
            return;
        }
        getMousePosition(event);
        const hit = getIntersectedButton();
        setHoveredButton(hit ? hit.name : null);
    }, [getMousePosition, getIntersectedButton, hoveredButton, viewMode]);

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
            buttonMeshes.current.clear();
            buttonNameByMesh.current.clear();
            gltf.scene.traverse((rootChild) => {
                if (rootChild.name.startsWith('button_')) {
                    const buttonGroupName = rootChild.name;
                    // Helper to recursively find and register all meshes within this button group
                    const findMeshes = (node) => {
                        if (node.isMesh) {
                            node.userData.buttonGroup = buttonGroupName;
                            buttonMeshes.current.add(node);
                            buttonNameByMesh.current.set(node.uuid, buttonGroupName);
                            prepareHighlightMaterial(node);
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

    useEffect(() => {
        const highlightColor = new THREE.Color("#5fd0c4");

        buttonMeshes.current.forEach((mesh) => {
            const groupName = mesh.userData.buttonGroup;
            const isTarget = viewMode === "2d" && hoveredButton && groupName === hoveredButton;
            applyHighlight(mesh, isTarget, highlightColor);
        });
    }, [hoveredButton, viewMode]);

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
            case HID_INPUT_TYPES.GAMEPAD: return 'GP';
            case HID_INPUT_TYPES.KEYBOARD: return 'KB';
            case HID_INPUT_TYPES.ANALOG: return 'AX';
            default: return 'NA';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#5b7cfa';
            case HID_INPUT_TYPES.KEYBOARD: return '#5fd0c4';
            case HID_INPUT_TYPES.ANALOG: return '#f0c05c';
            default: return '#8e9aa8';
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
                            color="#5fd0c4"
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
                            color="#5fd0c4"
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
                            color="#5fd0c4"
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
                        <span style={{
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            color: getTypeColor(mappings[hoveredButton].type),
                        }}>
                            {getTypeIcon(mappings[hoveredButton].type)}
                        </span>
                        <span>{mappings[hoveredButton].label || mappings[hoveredButton].action}</span>
                    </div>
                </Html>
            )}

            {/* Cursor hint when hovered */}
            {viewMode === '2d' && hoveredButton && (
                <Html
                    position={[0, 0.2, 0]}
                    center
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    <div style={{
                        background: '#5fd0c4',
                        color: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(95, 208, 196, 0.35)'
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
                color="#5fd0c4"
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
