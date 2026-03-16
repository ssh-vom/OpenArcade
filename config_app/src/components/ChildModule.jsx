import { useGLTF, Html } from "@react-three/drei";
import { useRef, memo, useEffect, useState, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ANALOG_INPUTS, GAMEPAD_INPUTS, HID_INPUT_TYPES, KEYBOARD_INPUTS, getInputLabel } from "../services/HIDManager.js";

const GAMEPAD_INPUT_KEYS = new Set(Object.keys(GAMEPAD_INPUTS));
const KEYBOARD_INPUT_KEYS = new Set(Object.keys(KEYBOARD_INPUTS));
const ANALOG_INPUT_KEYS = new Set(Object.keys(ANALOG_INPUTS));

const resolveMappingType = (mapping, inputValue) => {
    if (mapping?.type) {
        return typeof mapping.type === "string" ? mapping.type.toLowerCase() : mapping.type;
    }

    if (mapping?.analogConfig) {
        return HID_INPUT_TYPES.ANALOG;
    }

    if (inputValue) {
        if (ANALOG_INPUT_KEYS.has(inputValue)) {
            return HID_INPUT_TYPES.ANALOG;
        }
        if (GAMEPAD_INPUT_KEYS.has(inputValue)) {
            return HID_INPUT_TYPES.GAMEPAD;
        }
        if (
            KEYBOARD_INPUT_KEYS.has(inputValue) ||
            inputValue.startsWith("key_") ||
            inputValue.startsWith("HID_KEY_")
        ) {
            return HID_INPUT_TYPES.KEYBOARD;
        }
    }

    return HID_INPUT_TYPES.KEYBOARD;
};

const normalizeMapping = (mapping) => {
    if (!mapping) {
        return null;
    }

    if (typeof mapping === "string") {
        return {
            type: HID_INPUT_TYPES.KEYBOARD,
            label: mapping,
            action: mapping,
        };
    }

    const rawInputValue = mapping.input || mapping.label || mapping.action || "";
    const inputValue = typeof rawInputValue === "string" ? rawInputValue : "";
    const type = resolveMappingType(mapping, inputValue);
    const label =
        mapping.label ||
        (mapping.input ? getInputLabel(type, mapping.input) : null) ||
        (typeof mapping.action === "string" ? mapping.action : null) ||
        inputValue ||
        "";

    return {
        ...mapping,
        type,
        label,
    };
};

const ChildModule = memo(function ChildModule({
    path,
    onButtonClick,
    onModuleClick,
    isEditable = true,
    position: propPosition = [-1, 0, 0],
    viewMode = '3d',
    isActive = true,
    mappings = {},
    mappingFilter = "all"
}) {
    const gltf = useGLTF(path);
    const moduleScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
    const groupRef = useRef();
    const glowRef = useRef();
    const frameCountRef = useRef(0);
    const lastAnimationUpdate = useRef(0);
    const [hoveredButton, setHoveredButton] = useState(null);
    const [buttonLabelPositions, setButtonLabelPositions] = useState({});
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
        const isJoystickHitbox = mesh.userData.isJoystickHitbox;

        const updateMaterial = (material) => {
            if (!material) {
                return;
            }

            const original = buttonMaterialState.current.get(material.uuid);
            if (!original) {
                return;
            }

            if (isJoystickHitbox) {
                // Joystick hitboxes: reveal on hover via opacity
                if (enabled) {
                    material.opacity = 0.7;
                    material.color.set("#0071E3");
                } else {
                    material.opacity = 0;
                }
            } else if (material.emissive) {
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
                    if (node.name && (node.name.startsWith("button_") || node.name.startsWith("small_") || node.name.startsWith("js_"))) {
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

    // Detect joystick module from GLB path
    const isJoystickModule = path.toLowerCase().includes('joystick');

    function prepareJoystickHitboxMaterial(mesh) {
        // Make mesh visible but fully transparent for raycasting
        mesh.visible = true;
        mesh.userData.isJoystickHitbox = true;

        const makeHitbox = (material) => {
            if (!material) return material;
            const hitboxMat = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide,
                color: new THREE.Color("#0071E3"),
            });
            // Store in material state so applyHighlight can reference it
            buttonMaterialState.current.set(hitboxMat.uuid, {
                uuid: hitboxMat.uuid,
                emissive: null,
                emissiveIntensity: 0,
                opacity: 0,
            });
            return hitboxMat;
        };

        if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(makeHitbox);
        } else {
            mesh.material = makeHitbox(mesh.material);
        }
    }

    function ensureAncestorsVisible(node) {
        let current = node.parent;
        while (current) {
            if (!current.visible) {
                current.visible = true;
            }
            current = current.parent;
        }
    }

    useEffect(() => {
        if (moduleScene) {
            buttonMeshes.current.clear();
            buttonNameByMesh.current.clear();
            buttonMaterialState.current.clear();
            const labelPositions = {};

            moduleScene.updateWorldMatrix(true, true);
            if (groupRef.current) {
                groupRef.current.updateWorldMatrix(true, true);
            }

            moduleScene.traverse((rootChild) => {
                // --- Standard button detection (button_* and small_*) ---
                if (rootChild.name.startsWith('button_') || rootChild.name.startsWith('small_')) {
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

                    const box = new THREE.Box3().setFromObject(rootChild);
                    const center = new THREE.Vector3();
                    if (!box.isEmpty()) {
                        box.getCenter(center);
                    } else {
                        rootChild.getWorldPosition(center);
                    }

                    if (groupRef.current) {
                        groupRef.current.worldToLocal(center);
                    }

                    center.y += 0.035;
                    labelPositions[buttonGroupName] = [center.x, center.y, center.z];
                }

                // --- Joystick direction hitbox detection ---
                if (isJoystickModule && rootChild.name.startsWith('js_')) {
                    const directionName = rootChild.name; // e.g., js_u, js_d, js_l, js_r
                    ensureAncestorsVisible(rootChild);

                    const findJoystickMeshes = (node) => {
                        if (node.isMesh) {
                            node.userData.buttonGroup = directionName;
                            prepareJoystickHitboxMaterial(node);
                            buttonMeshes.current.add(node);
                            buttonNameByMesh.current.set(node.uuid, directionName);
                            console.log(`Found joystick hitbox mesh: ${node.name} under ${directionName}`);
                        }
                        if (node.children) {
                            node.children.forEach(findJoystickMeshes);
                        }
                    };

                    findJoystickMeshes(rootChild);

                    // Compute label position from bounding box center
                    // Temporarily make visible to compute bounds
                    const prevVisible = rootChild.visible;
                    rootChild.visible = true;
                    const box = new THREE.Box3().setFromObject(rootChild);
                    rootChild.visible = prevVisible;

                    const center = new THREE.Vector3();
                    if (!box.isEmpty()) {
                        box.getCenter(center);
                    } else {
                        rootChild.getWorldPosition(center);
                    }

                    if (groupRef.current) {
                        groupRef.current.worldToLocal(center);
                    }

                    center.y += 0.06;
                    labelPositions[directionName] = [center.x, center.y, center.z];
                }
            });
            setButtonLabelPositions(labelPositions);
            console.log('Total button meshes found:', buttonMeshes.current.size);
        }
    }, [moduleScene]);

    useEffect(() => {
        const highlightColor = new THREE.Color("#0071E3");

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
            case HID_INPUT_TYPES.GAMEPAD: return '\u{1F3AE}';
            case HID_INPUT_TYPES.KEYBOARD: return '\u{2328}';
            case HID_INPUT_TYPES.ANALOG: return '\u{1F579}';
            default: return '';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#5856D6';
            case HID_INPUT_TYPES.KEYBOARD: return '#007AFF';
            case HID_INPUT_TYPES.ANALOG: return '#FF9500';
            default: return '#8E8E93';
        }
    };

    const getTypeBorderColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return 'rgba(88, 86, 214, 0.4)';
            case HID_INPUT_TYPES.KEYBOARD: return 'rgba(0, 122, 255, 0.4)';
            case HID_INPUT_TYPES.ANALOG: return 'rgba(255, 149, 0, 0.4)';
            default: return 'rgba(142, 142, 147, 0.3)';
        }
    };

    const normalizedFilter = typeof mappingFilter === "string" ? mappingFilter.toLowerCase() : mappingFilter;
    const hoveredMapping = hoveredButton ? normalizeMapping(mappings[hoveredButton]) : null;
    const showHoveredMapping =
        hoveredMapping && (normalizedFilter === "all" || hoveredMapping.type === normalizedFilter);

    return (
        <group
            ref={groupRef}
            position={propPosition}
            scale={isEditable ? 4.5 : 3.5}
            onClick={handleModuleClick}
        >
            {/* GLB Scene */}
            {moduleScene && (
                <primitive object={moduleScene} />
            )}

            {/* Mapping badges for 2D mode */}
            {viewMode === '2d' && Object.entries(mappings).map(([buttonName, mapping]) => {
                const normalizedMapping = normalizeMapping(mapping);
                if (!normalizedMapping) return null;
                if (normalizedFilter !== "all" && normalizedMapping.type !== normalizedFilter) return null;
                const position = buttonLabelPositions[buttonName];
                if (!position) return null;
                const label = normalizedMapping.label;
                if (!label) return null;
                const typeColor = getTypeColor(normalizedMapping.type);
                const borderColor = getTypeBorderColor(normalizedMapping.type);
                const isHovered = hoveredButton === buttonName;

                return (
                    <Html
                        key={`${buttonName}-mapping`}
                        position={position}
                        center
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(8px)',
                            color: '#1d1d1f',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontFamily: "'Inter', -apple-system, sans-serif",
                            fontWeight: '500',
                            letterSpacing: '0.01em',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isHovered
                                ? `0 0 0 2px ${borderColor}, 0 4px 12px rgba(0, 0, 0, 0.12)`
                                : '0 1px 4px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)',
                            borderLeft: `3px solid ${typeColor}`,
                            transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'none',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}>
                            <span style={{
                                fontSize: '11px',
                                lineHeight: '1',
                                opacity: 0.6,
                            }}>
                                {getTypeIcon(normalizedMapping.type)}
                            </span>
                            <span style={{
                                borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
                                paddingLeft: '6px',
                                fontWeight: '500',
                            }}>
                                {label}
                            </span>
                        </div>
                    </Html>
                );
            })}

            {/* Hover tooltip for 2D mode - positioned at hovered button */}
            {viewMode === '2d' && hoveredButton && (() => {
                const hoverPos = buttonLabelPositions[hoveredButton];
                if (!hoverPos) return null;
                const offsetPos = [hoverPos[0], hoverPos[1] + 0.025, hoverPos[2]];

                return (
                    <Html
                        position={offsetPos}
                        center
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                        }}>
                            {showHoveredMapping && !mappings[hoveredButton] && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(8px)',
                                    color: '#1d1d1f',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontFamily: "'Inter', -apple-system, sans-serif",
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    borderLeft: `3px solid ${getTypeColor(hoveredMapping?.type)}`,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                }}>
                                    {hoveredMapping?.label}
                                </div>
                            )}
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.7)',
                                color: '#ffffff',
                                fontSize: '8px',
                                fontFamily: "'Inter', -apple-system, sans-serif",
                                fontWeight: '600',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                            }}>
                                {mappings[hoveredButton] ? 'click to edit' : 'click to map'}
                            </div>
                        </div>
                    </Html>
                );
            })()}
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
                color="#0071E3"
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
        prevProps.mappingFilter === nextProps.mappingFilter &&
        JSON.stringify(prevProps.position) === JSON.stringify(nextProps.position) &&
        JSON.stringify(prevProps.mappings) === JSON.stringify(nextProps.mappings)
    );
});

export { ChildModule, MemoizedChildModule };
