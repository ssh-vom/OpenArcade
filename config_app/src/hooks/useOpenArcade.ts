import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LAYOUT, HID_INPUT_TYPES, getInputForKeycode, getInputLabel, getKeycodeForInput } from "@/services/HIDManager";
import { DEFAULT_PLATE_ID, getPlateControllerModel } from "@/lib/plateCatalog";
import MockConfigClient from "@/services/MockConfigClient";
import { shallowEqualArrays } from "@/utils";
import type { IConfigClient, MappingConfig } from "@/types";

// Module type for hook internal state
export interface ModuleState {
  id: string;
  name: string;
  deviceId: string;
  path: string;
  mappingBanks: {
    keyboard: Record<string, MappingConfig>;
    gamepad_pc: Record<string, MappingConfig>;
    gamepad_switch_hori: Record<string, MappingConfig>;
  };
  position: number[];
  deviceLayout: Record<string, string>;
  connected: boolean;
  plateId: string;
}

// Active profile type
export interface ActiveProfile {
  id?: string;
  name?: string;
  plate_id?: string;
  active_mode?: string;
  modes?: Record<string, unknown>;
  ui?: { layout?: Record<string, string> };
}

const LIVE_STATE_POLL_INTERVAL_MS = 120;

interface UseOpenArcadeOptions {
  configClient: IConfigClient | null;
  defaultModules?: Array<{
    id: string;
    name: string;
    deviceId: string;
    mappingBanks?: Record<string, MappingConfig>;
    deviceLayout?: Record<string, string>;
    connected?: boolean;
    plateId?: string;
    path?: string;
    position?: number[];
  }>;
  positions?: number[][];
  liteMode?: boolean;
  initialViewMode?: '2d' | '3d';
}

export function useOpenArcade({ 
  configClient, 
  defaultModules: customDefaultModules, 
  positions, 
  liteMode = false,
  initialViewMode = '2d'
}: UseOpenArcadeOptions) {
  // State
  const [selectedButton, setSelectedButton] = useState<{
    name: string;
    mesh?: unknown;
    type?: string;
    input?: string;
    label?: string;
    action?: string;
  } | null>(null);
  const [activeSection, setActiveSection] = useState("mappings");
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>(initialViewMode);
  const [mappingFilter, setMappingFilter] = useState("all");
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [armedButton, setArmedButton] = useState<string | null>(null);
  const [mappingStatus, setMappingStatus] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [pressedControlIds, setPressedControlIds] = useState<string[]>([]);
  const [pressedButtons, setPressedButtons] = useState<string[]>([]);
  const [profilesRefreshKey, setProfilesRefreshKey] = useState(0);
  const [showOnlyConnected, setShowOnlyConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const defaultPositions = useMemo(() => [[-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0], [3, 0, 0]], []);
  const activePositions = positions || defaultPositions;
  
  const defaultModules = useMemo(() => customDefaultModules || [
    { 
      id: "OA-001", 
      name: "Module A", 
      deviceId: "OA-001", 
      path: "/TP1_B_0_BUTTON.glb", 
      mappings: {}, 
      position: [-1.5, 0, 0] 
    },
    { 
      id: "OA-002", 
      name: "Module B", 
      deviceId: "OA-002", 
      path: "/TP1_A_0_JOYSTICK.glb", 
      mappings: {}, 
      position: [0, 0, 0] 
    },
  ], [customDefaultModules]);
  
  const [modules, setModules] = useState<ModuleState[]>(defaultModules as ModuleState[]);
  const [activeProfile, setActiveProfile] = useState<{
    id?: string;
    name?: string;
    plate_id?: string;
    active_mode?: string;
    modes?: Record<string, unknown>;
    ui?: { layout?: Record<string, string> };
  } | null>(null);
  const [editingMode, setEditingMode] = useState("keyboard");
  const [hasLoaded, setHasLoaded] = useState(false);

  // Refs
  const currentModuleDeviceIdRef = useRef(defaultModules[0]?.deviceId || null);
  const previousPressedControlIdsRef = useRef(new Set<string>());
  const livePollInFlightRef = useRef(false);
  const sourceBindingInFlightRef = useRef(false);
  const isVisibleRef = useRef(true);
  const mockClientRef = useRef<IConfigClient | null>(null);

  // Initialize mock client once
  if (!mockClientRef.current) {
    mockClientRef.current = new MockConfigClient();
  }
  const activeClient = configClient || mockClientRef.current;

  // Derived values
  const safeCurrentModuleIndex = currentModuleIndex < modules.length ? currentModuleIndex : 0;
  const currentModule = modules[safeCurrentModuleIndex] || defaultModules[0];
  const visibleModules = showOnlyConnected
    ? modules.filter((m) => m.connected !== false)
    : modules;
  const currentMappings = useMemo(
    () => currentModule?.mappingBanks?.[editingMode] || {},
    [currentModule?.mappingBanks, editingMode],
  );

  currentModuleDeviceIdRef.current = currentModule?.deviceId || null;

  // Callbacks
  const normalizeEditingMode = useCallback((mode: string) => {
    if (mode === "keyboard" || mode === "gamepad_pc" || mode === "gamepad_switch_hori") {
      return mode;
    }
    if (mode === "gamepad") {
      return "gamepad_pc";
    }
    return "keyboard";
  }, []);

  const preferredInputTypeForMode = useCallback((mode: string) => (
    mode === "keyboard" ? HID_INPUT_TYPES.KEYBOARD : HID_INPUT_TYPES.GAMEPAD
  ), []);

  const getControlIdForButton = useCallback((deviceLayout: Record<string, string> | undefined, buttonName: string) => {
    if (deviceLayout && Object.prototype.hasOwnProperty.call(deviceLayout, buttonName)) {
      return deviceLayout[buttonName] ?? null;
    }
    return DEFAULT_LAYOUT[buttonName] ?? null;
  }, []);

  const getButtonNameForControlId = useCallback((deviceLayout: Record<string, string> | undefined, controlId: string | null) => {
    if (controlId == null) {
      return null;
    }

    const normalizedControlId = String(controlId);
    const layout = deviceLayout || DEFAULT_LAYOUT;
    const match = Object.entries(layout).find(([, assignedControlId]) => (
      assignedControlId != null && String(assignedControlId) === normalizedControlId
    ));
    return match?.[0] || null;
  }, []);

  const applyDeviceConfigs = useCallback((devices: Record<string, unknown>) => {
    const deviceEntries = Object.entries(devices || {});
    if (deviceEntries.length === 0) {
      setModules(defaultModules);
      setCurrentModuleIndex(0);
      setActiveProfile(null);
      setEditingMode("keyboard");
      return;
    }

    const selectedDeviceId = currentModuleDeviceIdRef.current;
    const sortedEntries = [...deviceEntries].sort(([, leftConfig], [, rightConfig]) => {
      const left = leftConfig as { connected?: boolean };
      const right = rightConfig as { connected?: boolean };
      const leftConnected = left?.connected !== false;
      const rightConnected = right?.connected !== false;
      if (leftConnected === rightConnected) {
        return 0;
      }
      return leftConnected ? -1 : 1;
    });

    interface DeviceConfig {
      name?: string;
      connected?: boolean;
      profiles?: Record<string, { 
        ui?: { layout?: Record<string, string> }; 
        modes?: Record<string, { mapping?: Record<string, unknown> }>;
        plate_id?: string;
        active_mode?: string;
      }>;
      active_profile?: string;
      ui?: { layout?: Record<string, string> };
    }

    const nextModules = sortedEntries.map(([deviceId, deviceConfig], index) => {
      const config = deviceConfig as DeviceConfig;
      const profiles = config?.profiles || {};
      const activeProfileId = config?.active_profile;
      const deviceActiveProfile = activeProfileId ? profiles[activeProfileId] : null;

      const profileLayout = deviceActiveProfile?.ui?.layout;
      const legacyLayout = config?.ui?.layout;
      const resolvedLayout = profileLayout && typeof profileLayout === "object"
        ? profileLayout
        : (legacyLayout && typeof legacyLayout === "object" ? legacyLayout : null);
      const layout = {
        ...DEFAULT_LAYOUT,
        ...(resolvedLayout || {}),
      };

      const profileModes = deviceActiveProfile?.modes || {};
      const keyboardMappingConfig = profileModes?.keyboard?.mapping || {};
      const legacyGamepadMappingConfig = profileModes?.gamepad?.mapping || {};
      const gamepadPcMappingConfig = Object.keys(profileModes?.gamepad_pc?.mapping || {}).length > 0
        ? (profileModes?.gamepad_pc?.mapping || {})
        : legacyGamepadMappingConfig;
      const gamepadSwitchMappingConfig = Object.keys(profileModes?.gamepad_switch_hori?.mapping || {}).length > 0
        ? (profileModes?.gamepad_switch_hori?.mapping || {})
        : legacyGamepadMappingConfig;

      const reverseLayout = Object.entries(layout).reduce((acc, [btnName, ctrlId]) => {
        if (ctrlId == null || ctrlId === "") {
          return acc;
        }
        acc[String(ctrlId)] = btnName;
        return acc;
      }, {} as Record<string, string>);

      const mappingBanks: Record<string, Record<string, MappingConfig>> = {
        keyboard: {},
        gamepad_pc: {},
        gamepad_switch_hori: {},
      };

      const applyMappingConfig = (
        targetMappings: Record<string, MappingConfig>, 
        mappingConfig: Record<string, unknown>, 
        type: string
      ) => {
        Object.entries(mappingConfig).forEach(([ctrlId, mapping]) => {
          const buttonName = reverseLayout[String(ctrlId)];
          if (!buttonName) return;

          if (type === HID_INPUT_TYPES.KEYBOARD) {
            const mappingObj = mapping as { keycode?: string; gamepad_input?: string };
            const keycodeName = typeof mapping === "string" ? mapping : mappingObj?.keycode;
            const inputValue = getInputForKeycode(keycodeName);
            if (!inputValue) return;

            targetMappings[buttonName] = {
              type: HID_INPUT_TYPES.KEYBOARD,
              input: inputValue,
              label: getInputLabel(HID_INPUT_TYPES.KEYBOARD, inputValue),
              action: keycodeName || "",
            };
            return;
          }

          const gamepadInput = typeof mapping === "object" ? mappingObj?.gamepad_input : null;
          if (!gamepadInput) return;

          targetMappings[buttonName] = {
            type: HID_INPUT_TYPES.GAMEPAD,
            input: gamepadInput,
            label: getInputLabel(HID_INPUT_TYPES.GAMEPAD, gamepadInput),
            action: getInputLabel(HID_INPUT_TYPES.GAMEPAD, gamepadInput),
          };
        });
      };

      applyMappingConfig(mappingBanks.keyboard, keyboardMappingConfig, HID_INPUT_TYPES.KEYBOARD);
      applyMappingConfig(mappingBanks.gamepad_pc, gamepadPcMappingConfig, HID_INPUT_TYPES.GAMEPAD);
      applyMappingConfig(mappingBanks.gamepad_switch_hori, gamepadSwitchMappingConfig, HID_INPUT_TYPES.GAMEPAD);

      const plateId = deviceActiveProfile?.plate_id || DEFAULT_PLATE_ID;

      return {
        id: deviceId,
        name: config?.name || deviceId,
        deviceId,
        mappingBanks,
        deviceLayout: layout,
        connected: config?.connected !== false,
        plateId,
        path: getPlateControllerModel(plateId),
        position: activePositions[index % activePositions.length],
      };
    });

    setModules(nextModules);
    const nextIndex = nextModules.findIndex((module) => module.deviceId === selectedDeviceId);
    setCurrentModuleIndex(nextIndex >= 0 ? nextIndex : 0);

    const selectedEntry = sortedEntries.find(([id]) => id === selectedDeviceId) || sortedEntries[0];
    if (selectedEntry) {
      const [, selectedConfig] = selectedEntry;
      const cfg = selectedConfig as { profiles?: Record<string, unknown>; active_profile?: string; active_mode?: string };
      const profMap = cfg?.profiles || {};
      const apId = cfg?.active_profile;
      const nextActiveProfile = apId && profMap[apId] ? profMap[apId] as typeof activeProfile : null;
      setActiveProfile(nextActiveProfile);
      setEditingMode(normalizeEditingMode(nextActiveProfile?.active_mode || cfg?.active_mode));
    } else {
      setActiveProfile(null);
      setEditingMode("keyboard");
    }
  }, [activePositions, defaultModules, normalizeEditingMode]);

  const refreshDevices = useCallback(async () => {
    if (!configClient) return;
    try {
      const devices = await configClient.listDevices();
      applyDeviceConfigs(devices);
      setHasLoaded(true);
    } catch (error) {
      console.warn("Failed to load devices:", error);
      setHasLoaded(true);
    }
  }, [configClient, applyDeviceConfigs]);

  const handleRefreshDevices = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshDevices();
    } catch (error) {
      console.warn("Failed to refresh devices:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshDevices]);

  const handleRenameDevice = useCallback(async (deviceId: string, name: string) => {
    if (!deviceId || !name?.trim() || !configClient) return;
    try {
      await configClient.renameDevice(deviceId, name.trim());
      await refreshDevices();
    } catch (error) {
      console.warn("Failed to rename device:", error);
    }
  }, [configClient, refreshDevices]);

  const triggerProfileRefresh = useCallback(() => setProfilesRefreshKey((k) => k + 1), []);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
    if (section !== "mappings" || viewMode !== "2d") {
      setIsMappingMode(false);
      setArmedButton(null);
      setMappingStatus(null);
    }
  }, [viewMode]);

  const toggleViewMode = useCallback(() => {
    if (liteMode) return;

    const newViewMode = viewMode === '3d' ? '2d' : '3d';
    setViewMode(newViewMode);
    if (activeSection !== "mappings" || newViewMode !== "2d") {
      setIsMappingMode(false);
      setArmedButton(null);
      setMappingStatus(null);
    }
  }, [viewMode, activeSection, liteMode]);

  const navigatePrev = useCallback(() => {
    setCurrentModuleIndex(prev => {
      const candidates = showOnlyConnected
        ? modules.map((_, i) => i).filter(i => modules[i]?.connected !== false)
        : modules.map((_, i) => i);
      const prevIdx = candidates.filter(i => i < prev).at(-1) ?? prev;
      if (prevIdx !== prev) {
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
      }
      return prevIdx;
    });
  }, [modules, showOnlyConnected]);

  const navigateNext = useCallback(() => {
    setCurrentModuleIndex(prev => {
      const nextIdx = showOnlyConnected
        ? (modules.map((_, i) => i).filter(i => modules[i]?.connected !== false && i > prev)[0] ?? prev)
        : (prev < modules.length - 1 ? prev + 1 : prev);
      if (nextIdx !== prev) {
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
      }
      return nextIdx;
    });
  }, [modules, showOnlyConnected]);

  const toggleMappingMode = useCallback(() => {
    setIsMappingMode((previousValue) => {
      const nextValue = !previousValue;
      setSelectedButton(null);
      setArmedButton(null);
      setMappingStatus(nextValue
        ? { type: "info", message: "Select a UI button, then press its physical source." }
        : null);
      previousPressedControlIdsRef.current = new Set(pressedControlIds.map((controlId) => String(controlId)));
      return nextValue;
    });
  }, [pressedControlIds]);

  const handleButtonClick = useCallback((buttonName: string, mesh?: unknown) => {
    if (viewMode === '2d' && isMappingMode) {
      setSelectedButton(null);
      setArmedButton(buttonName);
      setMappingStatus({
        type: "info",
        message: `Waiting for a physical input to bind to ${buttonName}.`,
      });
      previousPressedControlIdsRef.current.clear();
      pressedControlIds.forEach(id => previousPressedControlIdsRef.current.add(String(id)));
      return;
    }

    const buttonConfig = currentMappings[buttonName];
    if (buttonConfig && typeof buttonConfig === "object") {
      setSelectedButton({ name: buttonName, mesh, ...buttonConfig });
    } else {
      setSelectedButton({ name: buttonName, mesh, action: buttonConfig || "" });
    }
  }, [currentMappings, isMappingMode, pressedControlIds, viewMode]);

  const handleModuleChange = useCallback((index: number) => {
    setCurrentModuleIndex(index);
    setSelectedButton(null);
    setArmedButton(null);
    setMappingStatus(null);

    if (hasLoaded) {
      activeClient.listDevices()
        .then(applyDeviceConfigs)
        .catch((error) => console.warn("Failed to refresh devices:", error));
    }
  }, [hasLoaded, activeClient, applyDeviceConfigs]);

  const saveMapping = useCallback((buttonName: string, config: MappingConfig | null) => {
    setModules((previousModules) => previousModules.map((module, index) => {
      if (index !== safeCurrentModuleIndex) {
        return module;
      }

      const nextBanks = {
        keyboard: { ...(module.mappingBanks?.keyboard || {}) },
        gamepad_pc: { ...(module.mappingBanks?.gamepad_pc || {}) },
        gamepad_switch_hori: { ...(module.mappingBanks?.gamepad_switch_hori || {}) },
      };
      const targetBank = { ...(nextBanks[editingMode as keyof typeof nextBanks] || {}) };

      if (config && (config.type || config.input || config.action)) {
        targetBank[buttonName] = config;
      } else {
        delete targetBank[buttonName];
      }

      nextBanks[editingMode as keyof typeof nextBanks] = targetBank;
      return { ...module, mappingBanks: nextBanks };
    }));

    setSelectedButton(null);

    if (!currentModule?.deviceId) {
      return;
    }

    const controlId = getControlIdForButton(currentModule.deviceLayout, buttonName);
    if (!controlId || !config) {
      return;
    }

    let mode = editingMode;
    let mappingValue: { keycode?: string; gamepad_input?: string };

    if (config.type === HID_INPUT_TYPES.KEYBOARD) {
      mode = "keyboard";
      const keycodeName = getKeycodeForInput(config.input);
      if (!keycodeName) {
        return;
      }
      mappingValue = { keycode: keycodeName };
    } else if (config.type === HID_INPUT_TYPES.GAMEPAD) {
      mappingValue = { gamepad_input: config.input };
    } else {
      return;
    }

    activeClient
      .setMapping(currentModule.deviceId, mode, controlId, mappingValue)
      .catch((error: Error) => {
        console.warn("Failed to update mapping:", error);
      });
  }, [safeCurrentModuleIndex, editingMode, currentModule, getControlIdForButton, activeClient]);

  const clearMapping = useCallback((buttonName: string) => {
    saveMapping(buttonName, null);
  }, [saveMapping]);

  const clearAllMappings = useCallback(() => {
    setModules((previousModules) => previousModules.map((module, index) => {
      if (index !== safeCurrentModuleIndex) {
        return module;
      }

      const nextBanks = {
        keyboard: { ...(module.mappingBanks?.keyboard || {}) },
        gamepad_pc: { ...(module.mappingBanks?.gamepad_pc || {}) },
        gamepad_switch_hori: { ...(module.mappingBanks?.gamepad_switch_hori || {}) },
      };
      nextBanks[editingMode as keyof typeof nextBanks] = {};
      return { ...module, mappingBanks: nextBanks };
    }));
    setSelectedButton(null);
  }, [safeCurrentModuleIndex, editingMode]);

  const saveToDevice = useCallback(async (moduleId: string) => {
    const module = modules.find((item) => item.id === moduleId);
    if (!module) {
      return;
    }

    const layout = module.deviceLayout || DEFAULT_LAYOUT;
    const mappingBanks = module.mappingBanks || {};

    const saveBank = async (mode: string, bankMappings: Record<string, MappingConfig>) => {
      for (const [buttonName, mapping] of Object.entries(bankMappings || {})) {
        const controlId = getControlIdForButton(layout, buttonName);
        if (!controlId) {
          continue;
        }

        if (mapping?.type === HID_INPUT_TYPES.KEYBOARD) {
          const keycodeName = getKeycodeForInput(mapping.input);
          if (keycodeName) {
            await activeClient.setMapping(module.deviceId!, "keyboard", controlId, { keycode: keycodeName });
          }
        } else if (mapping?.type === HID_INPUT_TYPES.GAMEPAD) {
          await activeClient.setMapping(module.deviceId!, mode, controlId, { gamepad_input: mapping.input });
        }
      }
    };

    try {
      await saveBank("keyboard", mappingBanks.keyboard || {});
      await saveBank("gamepad_pc", mappingBanks.gamepad_pc || {});
      await saveBank("gamepad_switch_hori", mappingBanks.gamepad_switch_hori || {});
    } catch (error) {
      console.warn("Failed to save configuration:", error);
    }
  }, [modules, getControlIdForButton, activeClient]);

  const toggleConnectedFilter = useCallback(() => {
    setShowOnlyConnected((value) => {
      const newValue = !value;
      if (newValue) {
        const currentVisible = modules[safeCurrentModuleIndex]?.connected !== false;
        if (!currentVisible) {
          const firstVisible = modules.findIndex((m) => m.connected !== false);
          if (firstVisible >= 0 && firstVisible !== safeCurrentModuleIndex) {
            setCurrentModuleIndex(firstVisible);
          }
        }
      }
      return newValue;
    });
  }, [modules, safeCurrentModuleIndex]);

  // Effects
  useEffect(() => {
    let cancelled = false;

    const loadDevices = async () => {
      try {
        if (!cancelled) {
          await refreshDevices();
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load devices:", error);
        }
      }
    };

    loadDevices();
    return () => {
      cancelled = true;
    };
  }, [refreshDevices]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const currentDeviceId = currentModule?.deviceId;
    const currentLayout = currentModule?.deviceLayout || DEFAULT_LAYOUT;

    const sectionNeedsLivePolling = activeSection === "mappings" || activeSection === "live";
    if (!sectionNeedsLivePolling || !currentDeviceId || typeof activeClient?.getLiveState !== "function") {
      return;
    }

    let cancelled = false;

    const syncLiveState = async () => {
      if (livePollInFlightRef.current || !isVisibleRef.current) {
        return;
      }

      livePollInFlightRef.current = true;
      try {
        const liveState = await activeClient.getLiveState(currentDeviceId);
        if (cancelled) {
          return;
        }

        const nextPressedControlIds = (liveState?.pressed_control_ids || []).map((controlId: string | number) => String(controlId));
        const nextPressedButtons = nextPressedControlIds
          .map((controlId) => getButtonNameForControlId(currentLayout, controlId))
          .filter(Boolean) as string[];

        if (!shallowEqualArrays(pressedControlIds, nextPressedControlIds)) {
          setPressedControlIds(nextPressedControlIds);
          setPressedButtons(nextPressedButtons);
        }

        const previousPressed = previousPressedControlIdsRef.current;
        const newlyPressedControlIds = nextPressedControlIds.filter((controlId) => !previousPressed.has(controlId));
        previousPressedControlIdsRef.current = new Set(nextPressedControlIds);

        if (activeSection !== "mappings" || !isMappingMode || !armedButton || sourceBindingInFlightRef.current) {
          return;
        }

        if (newlyPressedControlIds.length > 1) {
          setMappingStatus({ type: "error", message: "Press one physical button at a time." });
          return;
        }

        if (newlyPressedControlIds.length !== 1) {
          return;
        }

        const capturedControlId = newlyPressedControlIds[0];
        const targetButtonName = armedButton;

        sourceBindingInFlightRef.current = true;
        try {
          await activeClient.setUiBinding(currentDeviceId, targetButtonName, capturedControlId, "override");
          await refreshDevices();
          if (!cancelled) {
            setArmedButton(null);
            setMappingStatus({
              type: "success",
              message: `${targetButtonName} now follows physical control ${capturedControlId}.`,
            });
          }
        } catch {
          if (!cancelled) {
            setMappingStatus({
              type: "error",
              message: "Could not save that source binding. Try again.",
            });
          }
        } finally {
          sourceBindingInFlightRef.current = false;
        }
      } catch {
        if (!cancelled) {
          setPressedControlIds([]);
          setPressedButtons([]);
        }
      } finally {
        livePollInFlightRef.current = false;
      }
    };

    syncLiveState();
    const intervalId = window.setInterval(syncLiveState, LIVE_STATE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      livePollInFlightRef.current = false;
      previousPressedControlIdsRef.current = new Set();
    };
  }, [
    activeClient,
    activeSection,
    currentModule,
    pressedControlIds,
    getButtonNameForControlId,
    isMappingMode,
    armedButton,
    refreshDevices,
  ]);

  // Arrow key navigation (2D view only)
  useEffect(() => {
    if (viewMode !== '2d' || activeSection !== 'mappings') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedButton) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeSection, selectedButton, navigatePrev, navigateNext]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      setPressedControlIds([]);
      setPressedButtons([]);
      previousPressedControlIdsRef.current.clear();
      livePollInFlightRef.current = false;
      sourceBindingInFlightRef.current = false;
    };
  }, [configClient]);

  // Preload effect - runs when modules change
  useEffect(() => {
    // Module paths are preloaded via useGLTF.preload in the component
  }, [modules]);

  return {
    // State
    selectedButton,
    setSelectedButton,
    activeSection,
    currentModuleIndex,
    setCurrentModuleIndex,
    viewMode,
    setViewMode,
    mappingFilter,
    setMappingFilter,
    isMappingMode,
    armedButton,
    mappingStatus,
    pressedControlIds,
    pressedButtons,
    profilesRefreshKey,
    showOnlyConnected,
    isRefreshing,
    modules,
    activeProfile,
    editingMode,
    setEditingMode,
    hasLoaded,
    
    // Derived
    safeCurrentModuleIndex,
    currentModule,
    currentMappings,
    visibleModules,
    activeClient,
    
    // Refs (exposed for advanced use)
    currentModuleDeviceIdRef,
    
    // Callbacks
    normalizeEditingMode,
    preferredInputTypeForMode,
    getControlIdForButton,
    getButtonNameForControlId,
    refreshDevices,
    handleRefreshDevices,
    handleRenameDevice,
    triggerProfileRefresh,
    handleSectionChange,
    toggleViewMode,
    toggleMappingMode,
    handleButtonClick,
    handleModuleChange,
    navigatePrev,
    navigateNext,
    saveMapping,
    clearMapping,
    clearAllMappings,
    saveToDevice,
    toggleConnectedFilter,
    applyDeviceConfigs,
  };
}
