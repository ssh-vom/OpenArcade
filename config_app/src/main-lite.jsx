import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import HttpConfigClient from "./services/HttpConfigClient.js";
import OpenArcadeLiteView from "./OpenArcadeLiteView.jsx";


function LiteBootstrap() {
    const httpBasePath = import.meta.env.VITE_CONFIG_HTTP_BASE_PATH || "/api";

    const [phase, setPhase] = useState("connecting");
    const [error, setError] = useState(null);
    const [client, setClient] = useState(null);
    const clientRef = useRef(null);

    const connect = async () => {
        setPhase("connecting");
        setError(null);

        if (clientRef.current) {
            try {
                await clientRef.current.disconnect();
            } catch {
                // best effort
            }
        }

        const nextClient = new HttpConfigClient({ basePath: httpBasePath });
        try {
            await nextClient.connect();
            clientRef.current = nextClient;
            setClient(nextClient);
            setPhase("connected");
        } catch (connectError) {
            await nextClient.disconnect().catch(() => { });
            setError(connectError?.message || "Failed to connect to local config portal");
            setPhase("error");
        }
    };

    useEffect(() => {
        connect().catch((connectError) => {
            setError(connectError?.message || "Failed to connect to local config portal");
            setPhase("error");
        });

        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect().catch(() => { });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (phase !== "connected" || !client) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-[#D9D9D9]">
                <div className="text-center max-w-md px-6">
                    <h1
                        className="text-2xl font-semibold text-[#333333] mb-3"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        OpenArcade Local Config
                    </h1>
                    <p
                        className="text-sm text-[#555555] mb-6"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        {phase === "connecting"
                            ? "Connecting to the local Pi config portal..."
                            : "Could not connect to the local Pi config portal."}
                    </p>
                    {error && (
                        <div
                            className="mb-5 px-4 py-3 rounded-xl text-sm"
                            style={{
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                color: "#EF4444",
                            }}
                        >
                            {error}
                        </div>
                    )}
                    {phase !== "connecting" && (
                        <button
                            type="button"
                            onClick={() => connect()}
                            className="px-5 py-2.5 rounded-lg bg-[#5180C1] text-white text-sm font-medium hover:bg-[#4070B0] transition-colors"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Retry Connection
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return <OpenArcadeLiteView configClient={client} />;
}


createRoot(document.getElementById("root")).render(
    <StrictMode>
        <LiteBootstrap />
    </StrictMode>,
);
