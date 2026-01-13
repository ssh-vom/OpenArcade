import oaLogo from "../assets/oa-logo.svg";

export default function ControllerHUD({
    controllerName,
    moduleCount,
    currentModule,
    modules,
    onModuleChange,
    isConnected,
    viewMode,
    onToggleView,
}) {
    return (
        <div style={{
            width: "100%",
            height: "72px",
            background: "linear-gradient(90deg, rgba(18, 24, 32, 0.98) 0%, rgba(10, 14, 19, 0.94) 100%)",
            borderBottom: "1px solid var(--oa-panel-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            zIndex: 10,
            flexShrink: 0,
            backdropFilter: "blur(10px)",
            boxShadow: "var(--oa-shadow-soft)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    background: "linear-gradient(135deg, rgba(215, 177, 90, 0.2), rgba(240, 204, 122, 0.2))",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 10px 24px rgba(215, 177, 90, 0.25)",
                }}>
                    <img
                        src={oaLogo}
                        alt="OpenArcade"
                        style={{
                        width: "32px",
                        height: "32px",
                            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))",
                        }}
                    />
                </div>
                <div>
                    <div style={{
                        color: "var(--oa-text)",
                        fontWeight: "600",
                        fontSize: "16px",
                        letterSpacing: "-0.01em",
                    }}>
                        OpenArcade
                    </div>
                    <div style={{
                        color: "var(--oa-muted)",
                        fontSize: "12px",
                    }}>
                        {controllerName} • {moduleCount} module{moduleCount === 1 ? "" : "s"}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "var(--oa-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                    }}>
                        Active Module
                    </span>
                    <select
                        value={String(currentModule)}
                        onChange={(e) => onModuleChange(Number(e.target.value))}
                        style={{
                            minWidth: "240px",
                            padding: "8px 10px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            color: "var(--oa-text)",
                            fontSize: "12px",
                            outline: "none",
                            appearance: "none",
                        }}
                    >
                        {modules.map((module, index) => {
                            const status = module.connected === false ? "offline" : "online";
                            const deviceLabel = module.deviceId ? ` · ${module.deviceId}` : "";
                            const label = `${module.name}${deviceLabel} · ${status}`;
                            return (
                                <option key={module.id} value={index}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "11px",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        background: isConnected ? "rgba(215, 177, 90, 0.12)" : "rgba(196, 88, 68, 0.12)",
                        borderRadius: "6px",
                        border: `1px solid ${isConnected ? "rgba(215, 177, 90, 0.35)" : "rgba(196, 88, 68, 0.35)"}`,
                        color: isConnected ? "var(--oa-accent)" : "var(--oa-danger)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                    }}>
                        <div style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "currentColor",
                        }} />
                        {isConnected ? "Online" : "Offline"}
                    </div>
                    <button
                        onClick={onToggleView}
                        style={{
                            padding: "8px 12px",
                            background: viewMode === "3d"
                                ? "rgba(215, 177, 90, 0.16)"
                                : "rgba(240, 204, 122, 0.16)",
                            color: viewMode === "3d" ? "var(--oa-accent)" : "var(--oa-warning)",
                            border: viewMode === "3d"
                                ? "1px solid rgba(215, 177, 90, 0.4)"
                                : "1px solid rgba(240, 204, 122, 0.4)",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "600",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {viewMode === "3d" ? "2D View" : "3D View"}
                    </button>
                </div>
            </div>
        </div>
    );
}
