import { useState, useEffect, useCallback, useRef } from "react";
import { OpenArcade3DView } from "./components/OpenArcade3DView"
import DeviceConnectionScreen from "./components/DeviceConnectionScreen"
import SerialConfigClient from "./services/SerialConfigClient";
import './App.css'

function App() {
    const [connected, setConnected] = useState(false);
    const [configClient, setConfigClient] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const clientRef = useRef(null);

    const handleConnect = useCallback(async () => {
        setConnectionError(null);
        const client = new SerialConfigClient();

        try {
            await client.connect();
            clientRef.current = client;
            setConfigClient(client);
            setConnected(true);
        } catch (err) {
            // Detect if port is already in use (another tab has it open)
            const errorMessage = err?.message || "";
            const isPortInUse = errorMessage.includes("already open") ||
                errorMessage.includes("in use") ||
                errorMessage.includes("Access denied") ||
                err?.name === "InvalidStateError";

            if (isPortInUse) {
                throw new Error("Serial port already in use. Please close any other configurator tabs and try again.");
            }

            throw err;
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
        setConnected(false);
    }, []);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect().catch(console.warn);
            }
        };
    }, []);

    // Handle page unload (refresh, close tab, navigate away)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (clientRef.current) {
                // Note: We can't await here, but we can attempt synchronous cleanup
                // Modern browsers may not fully execute async beforeunload handlers
                clientRef.current.disconnect().catch(() => { });
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        // Also handle page visibility changes (user switches tabs)
        const handleVisibilityChange = () => {
            if (document.hidden && clientRef.current) {
                // Optional: pause polling or reduce activity when tab is hidden
                // but keep connection alive
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    if (!connected) {
        return (
            <DeviceConnectionScreen
                onConnect={handleConnect}
                connectionError={connectionError}
                setConnectionError={setConnectionError}
            />
        );
    }

    return <OpenArcade3DView configClient={configClient} onDisconnect={handleDisconnect} />;
}

export default App
