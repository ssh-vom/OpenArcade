import { useGLTF, Html } from "@react-three/drei";
import { useRef, memo, useLayoutEffect, useState, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ANALOG_INPUTS, GAMEPAD_INPUTS, HID_INPUT_TYPES, KEYBOARD_INPUTS, getInputLabel } from "../services/HIDManager";
import { useMountEffect } from "../hooks/useMountEffect";

// Shallow equality helpers for performant comparisons
const shallowEqualArrays = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

const shallowEqualObjects = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => a[key] === b[key]);
};

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
    mappingFilter = "all",
    pressedButtons = [],
    pressedButtonsRef = null, // For immediate visual feedback (60fps, no React lag)
    armedButton = null,
    isMappingMode = false,
}) {
    const gltf = useGLTF(path, true);
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

    // Track previous pressed buttons for efficient updates
    const prevPressedRef = useRef([]);

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

    const pressedButtonSet = useMemo(() => new Set(pressedButtons), [pressedButtons]);

    function applyHighlight(mesh, options = null) {
        const isJoystickHitbox = mesh.userData.isJoystickHitbox;
        const enabled = Boolean(options?.color);
        const color = options?.color;
        const intensity = options?.intensity ?? 0.45;
        const opacity = options?.opacity ?? 0.7;

        const updateMaterial = (material) => {
            if (!material) {
                return;
            }

            const original = buttonMaterialState.current.get(material.uuid);
            if (!original) {
                return;
            }

            if (isJoystickHitbox) {
                // Joystick hitboxes: reveal via opacity
                if (enabled) {
                    material.opacity = opacity;
                    material.color.set(color);
                } else {
                    material.opacity = 0;
                }
            } else if (material.emissive) {
                if (enabled) {
                    material.emissive.copy(color);
                    material.emissiveIntensity = intensity;
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
                color: new THREE.Color("#5180C1"),
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

    // Scene setup - runs once when moduleScene changes
    useLayoutEffect(() => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- isJoystickModule is derived from path
    }, [moduleScene, path]);

    // Apply visual highlights in useFrame instead of useEffect - runs at 60fps
    // This eliminates the need for syncing state to refs
    useFrame(() => {
        const hoverColor = new THREE.Color("#5180C1");
        const armedColor = new THREE.Color("#6B9BD1");
        const pressedColor = new THREE.Color("#6B9BD1");

        // Use the ref if provided (immediate mode), otherwise use state
        const currentPressed = pressedButtonsRef?.current || pressedButtonSet;

        buttonMeshes.current.forEach((mesh) => {
            const groupName = mesh.userData.buttonGroup;
            const isPressed = currentPressed.has ? currentPressed.has(groupName) : currentPressed.includes(groupName);
            const isArmed = viewMode === "2d" && armedButton && groupName === armedButton;
            const isHovered = viewMode === "2d" && hoveredButton && groupName === hoveredButton;

            if (isPressed) {
                applyHighlight(mesh, { color: pressedColor, intensity: 0.55, opacity: 0.7 });
                return;
            }

            if (isArmed) {
                applyHighlight(mesh, { color: armedColor, intensity: 0.42, opacity: 0.52 });
                return;
            }

            if (isHovered) {
                applyHighlight(mesh, { color: hoverColor, intensity: 0.45, opacity: 0.7 });
                return;
            }

            applyHighlight(mesh);
        });
    });

    // Attach mouse event listeners for raycasting - legitimate external sync
    useMountEffect(() => {
        const canvas = gl.domElement;
        canvas.addEventListener('click', handleMouseClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvas.removeEventListener('click', handleMouseClick);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    });

    // Animation loop - runs at 60fps
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

    // New color scheme: Blue (Gamepad), Teal (Keyboard), Light Blue (Analog)
    const getTypeIcon = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return 'GP';
            case HID_INPUT_TYPES.KEYBOARD: return 'KB';
            case HID_INPUT_TYPES.ANALOG: return 'AX';
            default: return '—';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#5180C1';   // Blue accent
            case HID_INPUT_TYPES.KEYBOARD: return '#4A90A4'; // Teal
            case HID_INPUT_TYPES.ANALOG: return '#6B9BD1';   // Light blue
            default: return '#707070';
        }
    };

    const getTypeBorderColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return 'rgba(81, 128, 193, 0.35)';
            case HID_INPUT_TYPES.KEYBOARD: return 'rgba(74, 144, 164, 0.35)';
            case HID_INPUT_TYPES.ANALOG: return 'rgba(107, 155, 209, 0.35)';
            default: return 'rgba(112, 112, 112, 0.3)';
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
                const isPressed = pressedButtonSet.has(buttonName);
                const isArmed = armedButton === buttonName;

                return (
                    <Html
                        key={`${buttonName}-mapping`}
                        position={position}
                        center
                        zIndexRange={[50, 0]}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                        <div style={{
                            background: isPressed
                                ? 'rgba(236, 253, 245, 0.98)'
                                : isArmed
                                    ? 'rgba(236, 254, 255, 0.98)'
                                    : 'rgba(204, 204, 204, 0.96)',
                            backdropFilter: 'blur(12px)',
                            color: '#333333',
                            padding: '5px 12px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontFamily: "'DM Sans', -apple-system, sans-serif",
                            fontWeight: '500',
                            letterSpacing: '0.01em',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: isPressed
                                ? '0 0 0 2px rgba(16, 185, 129, 0.3), 0 8px 24px rgba(16, 185, 129, 0.2)'
                                : isArmed
                                    ? '0 0 0 2px rgba(74, 144, 164, 0.25), 0 8px 24px rgba(74, 144, 164, 0.15)'
                                    : isHovered
                                 ? `0 0 0 2px ${borderColor}, 0 6px 16px rgba(0, 0, 0, 0.1)`
                                 : '0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                            transform: isPressed
                                ? 'translateY(-4px) scale(1.08)'
                                : isArmed || isHovered
                                    ? 'translateY(-2px) scale(1.04)'
                                    : 'none',
                            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease',
                        }}>
                            <span style={{
                                fontSize: '9px',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontWeight: '600',
                                letterSpacing: '0.05em',
                                color: typeColor,
                                background: `${typeColor}15`,
                                padding: '2px 5px',
                                borderRadius: '4px',
                            }}>
                                {getTypeIcon(normalizedMapping.type)}
                            </span>
                            <span style={{
                                fontWeight: '500',
                                color: '#333333',
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
                        zIndexRange={[50, 0]}
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
                                    background: 'rgba(204, 204, 204, 0.95)',
                                    backdropFilter: 'blur(8px)',
                                    color: '#333333',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontFamily: "'DM Sans', system-ui, sans-serif",
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                }}>
                                    {hoveredMapping?.label}
                                </div>
                            )}
                            <div style={{
                                background: 'rgba(81, 128, 193, 0.9)',
                                color: '#ffffff',
                                fontSize: '8px',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontWeight: '500',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                boxShadow: '0 1px 4px rgba(81, 128, 193, 0.25)',
                            }}>
                                {isMappingMode
                                    ? armedButton === hoveredButton
                                        ? 'press physical button'
                                        : 'click to arm'
                                    : mappings[hoveredButton]
                                        ? 'click to edit'
                                        : 'click to map'}
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
    const hasComputedRef = useRef(false);

    // Compute position during render instead of in effect
    if (gltf && gltf.scene && !hasComputedRef.current) {
        let foundPosition = null;
        gltf.scene.traverse((child) => {
            if (child.name === buttonName && !foundPosition) {
                foundPosition = [child.position.x, child.position.y + 0.05, child.position.z];
            }
        });
        if (foundPosition) {
            setPosition(foundPosition);
            hasComputedRef.current = true;
        }
    }

    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.04, 0.055, 32]} />
            <meshBasicMaterial
                color="#5180C1"
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
        prevProps.armedButton === nextProps.armedButton &&
        prevProps.isMappingMode === nextProps.isMappingMode &&
        prevProps.mappingFilter === nextProps.mappingFilter &&
        shallowEqualArrays(prevProps.position, nextProps.position) &&
        shallowEqualObjects(prevProps.mappings, nextProps.mappings) &&
        shallowEqualArrays(prevProps.pressedButtons, nextProps.pressedButtons)
    );
});

export { ChildModule, MemoizedChildModule };
