import { useState, useCallback, useRef } from "react";
import { useMountEffect } from "./hooks/useMountEffect";
import { OpenArcade3DView } from "./components/OpenArcade3DView";
import BootSequence from "./components/BootSequence";
import SerialConfigClient from "./services/SerialConfigClient";
import MockConfigClient from "./services/MockConfigClient";
import type { BootSelection, ConnectionState, IConfigClient } from "./types";
import "./App.css";

function App() {
    const [bootPhase, setBootPhase] = useState<ConnectionState>("boot"); // boot -> connecting -> connected
    const [configClient, setConfigClient] = useState<IConfigClient | null>(null);
    const [bootError, setBootError] = useState<string | null>(null);
    const clientRef = useRef<IConfigClient | null>(null);

    const handleBootComplete = useCallback(async (selection: BootSelection) => {
        setBootPhase("connecting");
        setBootError(null);

        if (selection.type === "demo") {
            const client = new MockConfigClient();
            await client.connect();
            clientRef.current = client;
            setConfigClient(client);
            setBootPhase("connected");
            return;
        }

        if (selection.type === "serial") {
            const client = new SerialConfigClient();

            try {
                await client.connect();
                clientRef.current = client;
                setConfigClient(client);
                setBootPhase("connected");
            } catch (err) {
                const errorMessage = err?.message || "";
                const isPortInUse =
                    err?.name === "PortInUseError" ||
                    errorMessage.includes("already open") ||
                    errorMessage.includes("in use") ||
                    errorMessage.includes("Access denied") ||
                    errorMessage.includes("Failed to open serial port") ||
                    err?.name === "InvalidStateError";

                if (isPortInUse) {
                    setBootError("Device already in use. Close other OpenArcade tabs and try again.");
                } else if (err?.name === "UserCancelledError" || errorMessage.includes("No device selected")) {
                    setBootPhase("boot");
                    return;
                } else {
                    setBootError(err?.message || "Failed to connect to device");
                }

                setBootPhase("boot");
            }
        }
    }, []);

    const handleDisconnect = useCallback(async () => {
        if (clientRef.current) {
            try {
                await clientRef.current.disconnect();
            } catch (err) {
                console.warn("Error during disconnect:", err);
            }
            clientRef.current = null;
        }
        setConfigClient(null);
        setBootPhase("boot");
        setBootError(null);
    }, []);

    useMountEffect(() => {
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect().catch(console.warn);
            }
        };
    });

    useMountEffect(() => {
        const handleBeforeUnload = () => {
            if (clientRef.current) {
                clientRef.current.disconnect().catch(() => { });
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    });

    if (bootPhase === "boot" || bootPhase === "connecting") {
        return (
            <BootSequence
                onBootComplete={handleBootComplete}
                error={bootPhase === "connecting" ? bootError : null}
            />
        );
    }

    return (
        <OpenArcade3DView
            configClient={configClient}
            onDisconnect={handleDisconnect}
            liteMode={false}
        />
    );
}

export default App;
