import { useMemo } from 'react';
import {
  getInputLabel,
  getTypeIcon,
  getTypeLabel,
  getTypeStyleConfig,
  type HidInputType,
} from '@/services/HIDManager';
import { formatButtonName } from '@/utils';
import type { MappingConfig } from '@/types';

interface MappingStatus {
  type: 'error' | 'success' | 'info';
  message: string;
}

interface D2ConfigPanelProps {
  mappings: Record<string, MappingConfig>;
  moduleName: string;
  onSelectButton: (buttonName: string, event: React.MouseEvent | null) => void;
  onClearAll: () => void;
  moduleId: string;
  onSaveToDevice: (moduleId: string) => void;
  isConnected?: boolean;
  isMappingMode?: boolean;
  armedButton?: string | null;
  pressedButtons?: string[];
  onToggleMappingMode?: () => void;
  mappingStatus?: MappingStatus | null;
  editingMode?: string;
  onEditingModeChange?: (mode: string) => void;
  selectedButton?: string | null;
}

function getMappedInputLabel(config: MappingConfig | null): string {
  if (!config) return 'Unmapped';
  if (config.label) return config.label;
  if (config.type && config.input) {
    return getInputLabel(config.type as HidInputType, config.input);
  }
  if (config.input) return config.input;
  return 'Mapped';
}

export default function D2ConfigPanel({
  mappings,
  moduleName,
  onSelectButton,
  onClearAll,
  moduleId,
  onSaveToDevice,
  isConnected = true,
  isMappingMode = false,
  armedButton = null,
  pressedButtons = [],
  onToggleMappingMode,
  mappingStatus = null,
  editingMode = 'keyboard',
  onEditingModeChange,
  selectedButton = null,
}: D2ConfigPanelProps) {
  // Memoize the Set creation to avoid rebuilding on every render
  const pressedButtonSet = useMemo(
    () => new Set(pressedButtons),
    [pressedButtons]
  );

  const mappingCount = Object.keys(mappings).length;
    
  // Get config for currently selected button
  const selectedConfig = selectedButton ? mappings[selectedButton] : null;
  const isSelectedPressed = selectedButton
    ? pressedButtonSet.has(selectedButton)
    : false;
  const isSelectedArmed = selectedButton === armedButton;

  const formattedButtonName = formatButtonName(selectedButton);
  const selectedTypeStyle = selectedConfig
    ? getTypeStyleConfig(selectedConfig.type)
    : null;
  const selectCurrentButton = () => {
    if (selectedButton) onSelectButton(selectedButton, null);
  };

  // Compute raw mapping detail once for reuse
  const rawMappingDetail = useMemo(() => {
    if (!selectedConfig) return null;
    if (
      selectedConfig.input &&
      selectedConfig.label &&
      selectedConfig.input !== selectedConfig.label
    ) {
      return selectedConfig.input;
    }
    if (
      typeof selectedConfig.action === 'string' &&
      selectedConfig.action !== selectedConfig.label &&
      selectedConfig.action !== selectedConfig.input
    ) {
      return selectedConfig.action;
    }
    return null;
  }, [selectedConfig]);


    return (
        <div 
            className="w-[320px] h-full bg-[#D9D9D9] flex flex-col shrink-0 animate-slide-in-right"
            style={{
                borderLeft: '1px solid #A0A0A0',
            }}
        >
            {/* Header Section */}
            <div className="p-6 pb-5">
                {/* Label + Title */}
                <div className="mb-5">
                    <div 
                        className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-1.5"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Configuration
                    </div>
                    <h3 
                        className="m-0 text-xl font-semibold text-[#333333] tracking-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {moduleName}
                    </h3>
                </div>

                {/* Device Status */}
                <div 
                    className="px-4 py-3.5 rounded-xl flex items-center gap-3"
                    style={{
                        background: isConnected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                        border: isConnected ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                    }}
                >
                    <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                        style={isConnected ? { 
                            animation: 'pulse-dot 2s infinite',
                            boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                        } : {}}
                    />
                    <span 
                        className="text-sm font-medium"
                        style={{ 
                            fontFamily: "'DM Sans', sans-serif",
                            color: isConnected ? '#10B981' : '#EF4444'
                        }}
                    >
                        {isConnected ? "Device Connected" : "Device Offline"}
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-[#B8B8B8]" />

            {/* Mapping Mode Section */}
            <div className="p-6">
                <div className="mb-5">
                    <div 
                        className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-2"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Editing Bank
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: "keyboard", label: "KB" },
                            { value: "gamepad_pc", label: "PC" },
                            { value: "gamepad_switch_hori", label: "SW" },
                        ].map((option) => {
                            const active = editingMode === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onEditingModeChange?.(option.value)}
                                    className="py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 cursor-pointer"
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        background: active ? 'rgba(81, 128, 193, 0.14)' : '#CCCCCC',
                                        borderColor: active ? '#5180C1' : '#A0A0A0',
                                        color: active ? '#5180C1' : '#555555',
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <button
                    onClick={onToggleMappingMode}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide border-2 transition-all duration-200 cursor-pointer ${
                        isMappingMode
                            ? 'bg-[#5180C1] text-white border-[#5180C1]'
                            : 'bg-[#CCCCCC] text-[#333333] border-[#A0A0A0] hover:border-[#5180C1] hover:text-[#5180C1]'
                    }`}
                    style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        boxShadow: isMappingMode ? '0 4px 16px rgba(81, 128, 193, 0.3)' : 'none'
                    }}
                >
                    {isMappingMode ? 'Exit Mapping Mode' : 'Enter Mapping Mode'}
                </button>

                {/* Instructions card */}
                {isMappingMode && (
                    <div 
                        className="mt-5 rounded-xl px-5 py-4 text-sm leading-relaxed"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            background: '#CCCCCC',
                            border: '1px solid #B8B8B8',
                            color: '#333333'
                        }}
                    >
                        {armedButton ? (
                            <>
                                Waiting for physical input for{' '}
                                <span 
                                    className="font-semibold px-2 py-1 rounded-md inline-block mt-1"
                                    style={{ 
                                        background: 'rgba(81, 128, 193, 0.15)',
                                        color: '#5180C1',
                                        fontFamily: "'IBM Plex Mono', monospace"
                                    }}
                                >
                                    {armedButton}
                                </span>
                            </>
                        ) : (
                            "Select a UI button, then press the physical button you want to bind."
                        )}
                    </div>
                )}

                {/* Status message */}
                {mappingStatus && (
                    <div 
                        className="mt-4 rounded-xl px-5 py-3.5 text-sm font-medium"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            background: mappingStatus.type === 'error'
                                ? 'rgba(239, 68, 68, 0.08)'
                                : mappingStatus.type === 'success'
                                    ? 'rgba(16, 185, 129, 0.08)'
                                    : 'rgba(74, 144, 164, 0.08)',
                            border: `1px solid ${
                                mappingStatus.type === 'error'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : mappingStatus.type === 'success'
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(74, 144, 164, 0.2)'
                            }`,
                            color: mappingStatus.type === 'error'
                                ? '#EF4444'
                                : mappingStatus.type === 'success'
                                    ? '#10B981'
                                    : '#4A90A4'
                        }}
                    >
                        {mappingStatus.message}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-[#B8B8B8]" />

            {/* Selected Button Inspector */}
            <div className="flex-1 p-6 overflow-y-auto panel-scroll">
                {!selectedButton ? (
                    <div 
                        className="h-full flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl"
                        style={{
                            background: '#CCCCCC',
                            border: '2px dashed #A0A0A0'
                        }}
                    >
                        <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                            style={{ background: 'rgba(81, 128, 193, 0.12)' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5180C1" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4M12 8h.01"/>
                            </svg>
                        </div>
                        <div 
                            className="text-sm font-semibold text-[#333333] mb-1"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            No Button Selected
                        </div>
                        <div 
                            className="text-xs text-[#707070] leading-relaxed"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Click a button in the 2D view<br />to view or edit its mapping
                        </div>
                    </div>
                ) : !selectedConfig ? (
                    <div className="space-y-4">
                        {/* Selected button header - unmapped */}
                        <div 
                            className="p-4 rounded-xl"
                            style={{
                                background: 'rgba(239, 68, 68, 0.06)',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div 
                                    className="text-lg font-semibold text-[#333333]"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    {formattedButtonName}
                                </div>
                                {isSelectedPressed && (
                                    <div 
                                        className="text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider"
                                        style={{
                                            fontFamily: "'IBM Plex Mono', monospace",
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            color: '#10B981'
                                        }}
                                    >
                                        PRESSED
                                    </div>
                                )}
                                {isSelectedArmed && (
                                    <div 
                                        className="text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider"
                                        style={{
                                            fontFamily: "'IBM Plex Mono', monospace",
                                            background: 'rgba(74, 144, 164, 0.15)',
                                            color: '#4A90A4'
                                        }}
                                    >
                                        ARMED
                                    </div>
                                )}
                            </div>
                            <div 
                                className="text-[10px] text-[#707070] mb-4"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                                {selectedButton}
                            </div>
                            
                            <div 
                                className="text-sm text-[#707070] text-center py-6"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                No mapping configured
                            </div>
                            
                            <button
                                onClick={selectCurrentButton}
                                className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
                                style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    background: '#5180C1',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                Configure Mapping
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Selected button header - mapped */}
                        <div 
                            className="p-4 rounded-xl"
                            style={{
                                background: isSelectedArmed 
                                    ? 'rgba(74, 144, 164, 0.08)'
                                    : isSelectedPressed
                                        ? 'rgba(16, 185, 129, 0.08)'
                                        : 'rgba(81, 128, 193, 0.06)',
                                border: isSelectedArmed
                                    ? '2px solid rgba(74, 144, 164, 0.3)'
                                    : isSelectedPressed
                                        ? '2px solid rgba(16, 185, 129, 0.3)'
                                        : '1px solid rgba(81, 128, 193, 0.2)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <div 
                                    className="text-lg font-semibold text-[#333333]"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    {formattedButtonName}
                                </div>
                                {isSelectedPressed && (
                                    <div 
                                        className="text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider"
                                        style={{
                                            fontFamily: "'IBM Plex Mono', monospace",
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            color: '#10B981'
                                        }}
                                    >
                                        PRESSED
                                    </div>
                                )}
                                {isSelectedArmed && (
                                    <div 
                                        className="text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider"
                                        style={{
                                            fontFamily: "'IBM Plex Mono', monospace",
                                            background: 'rgba(74, 144, 164, 0.15)',
                                            color: '#4A90A4'
                                        }}
                                    >
                                        ARMED
                                    </div>
                                )}
                            </div>
                            <div 
                                className="text-[10px] text-[#707070]"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                                {selectedButton}
                            </div>
                        </div>

                        {/* Mapping details card */}
                        <div 
                            className="p-4 rounded-xl"
                            style={{
                                background: '#CCCCCC',
                                border: '1px solid #A0A0A0'
                            }}
                        >
                            <div 
                                className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-3"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                                Current Mapping
                            </div>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <span
                                    className="inline-flex items-center justify-center w-10 h-8 rounded-lg text-xs font-bold tracking-wider"
                                    style={{ 
                                        background: selectedTypeStyle?.bg,
                                        border: `1px solid ${selectedTypeStyle?.border}`,
                                        color: selectedTypeStyle?.text,
                                        fontFamily: "'IBM Plex Mono', monospace"
                                    }}
                                >
                                    {getTypeIcon(selectedConfig.type)}
                                </span>
                                <div>
                                    <div 
                                        className="text-sm font-semibold text-[#333333]"
                                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                                    >
                                        {getMappedInputLabel(selectedConfig)}
                                    </div>
                                    <div 
                                        className="text-[10px] text-[#707070]"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {getTypeLabel(selectedConfig.type)} input
                                    </div>
                                </div>
                            </div>

                            {rawMappingDetail && (
                                <div 
                                    className="text-[10px] text-[#555555] px-3 py-2 rounded-lg mb-4"
                                    style={{ 
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        background: 'rgba(160, 160, 160, 0.15)'
                                    }}
                                >
                                    Raw: {rawMappingDetail}
                                </div>
                            )}

                            <button
                                onClick={selectCurrentButton}
                                className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150"
                                style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    background: 'rgba(81, 128, 193, 0.14)',
                                    color: '#5180C1',
                                    border: '1px solid #5180C1'
                                }}
                            >
                                Edit Mapping
                            </button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: mappingCount, color: '#5180C1', label: 'Total Mapped' },
                                { value: pressedButtons.length, color: '#4A90A4', label: 'Active Now' },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="p-3 rounded-xl text-center"
                                    style={{
                                        background: '#CCCCCC',
                                        border: '1px solid #A0A0A0'
                                    }}
                                >
                                    <div
                                        className="text-lg font-bold"
                                        style={{ fontFamily: "'Space Grotesk', sans-serif", color: stat.color }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div
                                        className="text-[10px] text-[#707070]"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div 
                className="p-6 pt-5"
                style={{ 
                    borderTop: '1px solid #A0A0A0',
                    background: '#CCCCCC'
                }}
            >
                <div className="flex gap-3">
                    {mappingCount > 0 && (
                        <button
                            onClick={onClearAll}
                            className="flex-1 py-3.5 bg-[#D9D9D9] border-2 border-[#FECACA] rounded-xl text-[#EF4444] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[#FEF2F2] hover:border-[#EF4444]"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={() => onSaveToDevice(moduleId)}
                        className="flex-[2] py-3.5 bg-[#5180C1] hover:bg-[#4070B0] border-none rounded-xl text-white text-sm font-semibold cursor-pointer transition-all duration-150"
                        style={{ 
                            fontFamily: "'Space Grotesk', sans-serif",
                            boxShadow: '0 4px 12px rgba(81, 128, 193, 0.25)'
                        }}
                    >
                        Save to Device
                    </button>
                </div>
            </div>
        </div>
    );
}
