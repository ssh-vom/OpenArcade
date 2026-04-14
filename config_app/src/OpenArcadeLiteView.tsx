import { memo } from "react";
import ControllerHUD from "./components/ControllerHUD";
import D2ConfigPanel from "./components/D2ConfigPanel";
import HIDButtonMappingModal from "./components/HIDButtonMappingModal";
import ProfilesPanel from "./components/ProfilesPanel";
import { HID_INPUT_TYPES } from "./services/HIDManager";
import { DEFAULT_PLATE_ID, getPlatePreview } from "./lib/plateCatalog";
import { useOpenArcade, type ModuleState } from "./hooks";
import { MappingsIcon, ProfilesIcon, LiveInputIcon } from "./components/icons";
import type { IConfigClient, MappingConfig } from "@/types";

function LiteMappingSurface({
    module,
    currentMappings,
    mappingFilter,
    pressedButtons,
    armedButton,
    isMappingMode,
    onSelectButton,
}: {
    module: ModuleState;
    currentMappings: Record<string, MappingConfig>;
    mappingFilter: string;
    pressedButtons: string[];
    armedButton: string | null;
    isMappingMode: boolean;
    onSelectButton: (buttonName: string) => void;
}) {
    const layout = module?.deviceLayout || {};
    const buttonEntries = Object.keys(layout)
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
        .map((buttonName) => {
            const mapping = currentMappings?.[buttonName] || null;
            return [buttonName, mapping] as [string, typeof mapping];
        })
        .filter(([, mapping]) => {
            if (mappingFilter === "all") return true;
            return mapping?.type === mappingFilter;
        });

    return (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-5 gap-4 overflow-hidden">
            <div
                className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] px-5 py-4 flex items-center gap-4"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
            >
                <img
                    src={getPlatePreview(module?.plateId || DEFAULT_PLATE_ID)}
                    alt="Top plate preview"
                    className="w-24 h-24 object-contain rounded-lg bg-[#D9D9D9] border border-[#B8B8B8]"
                />
                <div className="min-w-0">
                    <h2
                        className="text-lg text-[#333333] font-semibold truncate"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {module?.name || "OpenArcade"}
                    </h2>
                    <div
                        className="text-xs text-[#707070] mt-1"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        {module?.deviceId || "No device"}
                    </div>
                    <div
                        className="text-xs mt-2"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            color: module?.connected === false ? "#EF4444" : "#10B981",
                        }}
                    >
                        {module?.connected === false ? "Offline" : "Online"}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-4 overflow-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {buttonEntries.map(([buttonName, mapping]) => {
                        const isPressed = pressedButtons.includes(buttonName);
                        const isArmed = armedButton === buttonName;

                        return (
                            <button
                                key={buttonName}
                                type="button"
                                onClick={() => onSelectButton(buttonName)}
                                className="rounded-xl text-left px-3 py-3 transition-all duration-150 border"
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    background: isArmed
                                        ? "rgba(74, 144, 164, 0.10)"
                                        : isPressed
                                            ? "rgba(16, 185, 129, 0.10)"
                                            : "#D9D9D9",
                                    borderColor: isArmed
                                        ? "rgba(74, 144, 164, 0.45)"
                                        : isPressed
                                            ? "rgba(16, 185, 129, 0.45)"
                                            : "#B8B8B8",
                                    boxShadow: isArmed || isPressed
                                        ? "0 0 0 2px rgba(81, 128, 193, 0.12)"
                                        : "none",
                                }}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span
                                        className="text-[11px] uppercase tracking-wide text-[#707070]"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {buttonName}
                                    </span>
                                    {isMappingMode && isArmed && (
                                        <span
                                            className="text-[9px] px-2 py-0.5 rounded-full"
                                            style={{
                                                background: "rgba(74, 144, 164, 0.15)",
                                                color: "#4A90A4",
                                                fontFamily: "'IBM Plex Mono', monospace",
                                            }}
                                        >
                                            ARMED
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-[#333333] font-medium truncate">
                                    {mapping?.label || "Unmapped"}
                                </div>
                                <div className="text-[11px] text-[#707070] mt-1 truncate">
                                    {mapping?.action || "Tap to map"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function LiveInputLitePanel({
    currentModule,
    pressedControlIds,
    pressedButtons,
}: {
    currentModule: ModuleState;
    pressedControlIds: string[];
    pressedButtons: string[];
}) {
    return (
        <div className="flex-1 min-w-0 min-h-0 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-5">
                    <h3
                        className="text-lg text-[#333333] font-semibold"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Live Input
                    </h3>
                    <p
                        className="text-sm text-[#707070] mt-1"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        {currentModule?.name || "No module selected"}
                    </p>
                </div>

                {[
                    {
                        title: "Pressed UI Buttons",
                        emptyLabel: "No active buttons",
                        items: pressedButtons,
                        chipBg: "rgba(16, 185, 129, 0.15)",
                        chipColor: "#10B981",
                    },
                    {
                        title: "Pressed Physical Control IDs",
                        emptyLabel: "No active controls",
                        items: pressedControlIds,
                        chipBg: "rgba(81, 128, 193, 0.15)",
                        chipColor: "#5180C1",
                    },
                ].map((section) => (
                    <div key={section.title} className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-5">
                        <div
                            className="text-xs uppercase tracking-wide text-[#707070] mb-2"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            {section.title}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {section.items.length === 0 ? (
                                <span className="text-sm text-[#707070]">{section.emptyLabel}</span>
                            ) : (
                                section.items.map((item) => (
                                    <span
                                        key={item}
                                        className="px-2.5 py-1 rounded-full text-xs"
                                        style={{
                                            background: section.chipBg,
                                            color: section.chipColor,
                                            fontFamily: "'IBM Plex Mono', monospace",
                                        }}
                                    >
                                        {item}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface OpenArcadeLiteViewProps {
    configClient: IConfigClient;
}

const OpenArcadeLiteView = memo(function OpenArcadeLiteView({ configClient }: OpenArcadeLiteViewProps) {
    const {
        selectedButton,
        setSelectedButton,
        activeSection,
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
        safeCurrentModuleIndex,
        currentModule,
        currentMappings,
        handleRefreshDevices,
        handleRenameDevice,
        triggerProfileRefresh,
        handleSectionChange,
        toggleMappingMode,
        handleButtonClick,
        handleModuleChange,
        saveMapping,
        clearMapping,
        clearAllMappings,
        saveToDevice,
        toggleConnectedFilter,
        refreshDevices,
    } = useOpenArcade({ configClient });

    const navItems = [
        { id: "mappings", label: "Mappings", Icon: MappingsIcon },
        { id: "profiles", label: "Profiles", Icon: ProfilesIcon },
        { id: "live", label: "Live Input", Icon: LiveInputIcon },
    ];

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#D9D9D9] animate-fade-in">
            <ControllerHUD
                moduleCount={modules.length}
                currentModule={safeCurrentModuleIndex}
                modules={modules.map((module) => ({
                    ...module,
                    mappedButtons: Object.keys(module.mappingBanks?.[editingMode] || {}).length,
                }))}
                onModuleChange={handleModuleChange}
                isConnected={modules.some((module) => module.connected !== false)}
                viewMode="2d"
                mappingFilter={mappingFilter}
                onMappingFilterChange={setMappingFilter}
                onToggleView={() => { }}
                showOnlyConnected={showOnlyConnected}
                onToggleConnectedFilter={toggleConnectedFilter}
                onRenameDevice={handleRenameDevice}
                onRefreshDevices={handleRefreshDevices}
                isRefreshing={isRefreshing}
                showViewToggle={false}
            />

            <div className="flex flex-1 min-h-0">
                <div
                    className="w-[72px] bg-[#CCCCCC] flex flex-col items-center pt-5 gap-2 shrink-0"
                    style={{
                        borderRight: "1px solid rgba(0, 0, 0, 0.1)",
                        boxShadow: "1px 0 3px rgba(0, 0, 0, 0.04)",
                    }}
                >
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSectionChange(item.id)}
                            className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer border-none
                                ${activeSection === item.id
                                    ? "bg-[#5180C1]/15"
                                    : "bg-transparent hover:bg-[#B8B8B8]"
                                }`}
                            title={item.label}
                        >
                            <item.Icon active={activeSection === item.id} />
                            {activeSection === item.id && (
                                <div
                                    className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#5180C1] rounded-r-full"
                                    style={{ boxShadow: "2px 0 8px rgba(81, 128, 193, 0.35)" }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {activeSection === "mappings" ? (
                    <>
                        <LiteMappingSurface
                            module={currentModule}
                            currentMappings={currentMappings}
                            mappingFilter={mappingFilter}
                            pressedButtons={pressedButtons}
                            armedButton={armedButton}
                            isMappingMode={isMappingMode}
                            onSelectButton={handleButtonClick}
                        />
                        <D2ConfigPanel
                            mappings={currentMappings}
                            moduleName={currentModule.name}
                            onSelectButton={handleButtonClick}
                            onClearAll={clearAllMappings}
                            moduleId={currentModule.id}
                            onSaveToDevice={saveToDevice}
                            isConnected={currentModule.connected !== false}
                            isMappingMode={isMappingMode}
                            armedButton={armedButton}
                            pressedButtons={pressedButtons}
                            onToggleMappingMode={toggleMappingMode}
                            mappingStatus={mappingStatus}
                            editingMode={editingMode}
                            onEditingModeChange={setEditingMode}
                            selectedButton={selectedButton?.name || null}
                        />
                    </>
                ) : activeSection === "profiles" ? (
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                        <ProfilesPanel
                            deviceId={currentModule?.deviceId || null}
                            configClient={configClient}
                            activeProfile={activeProfile}
                            refreshKey={profilesRefreshKey}
                            onProfileChanged={() => {
                                triggerProfileRefresh();
                                refreshDevices();
                            }}
                        />
                    </div>
                ) : (
                    <LiveInputLitePanel
                        currentModule={currentModule}
                        pressedControlIds={pressedControlIds}
                        pressedButtons={pressedButtons}
                    />
                )}
            </div>

            {selectedButton && (
                <HIDButtonMappingModal
                    button={selectedButton}
                    preferredInputType={editingMode === "keyboard" ? HID_INPUT_TYPES.KEYBOARD : HID_INPUT_TYPES.GAMEPAD}
                    allowedInputTypes={editingMode === "keyboard"
                        ? [HID_INPUT_TYPES.KEYBOARD]
                        : [HID_INPUT_TYPES.GAMEPAD]}
                    onSave={saveMapping}
                    onCancel={() => setSelectedButton(null)}
                    onClear={clearMapping}
                />
            )}
        </div>
    );
});

OpenArcadeLiteView.displayName = "OpenArcadeLiteView";

export default OpenArcadeLiteView;
