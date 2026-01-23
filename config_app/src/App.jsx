import { useState } from "react";
import { OpenArcade3DView } from "./components/OpenArcade3DView"
import DeviceConnectionScreen from "./components/DeviceConnectionScreen"
import SerialConfigClient from "./services/SerialConfigClient";
import './App.css'

function App() {
    const [connected, setConnected] = useState(false);
    const [configClient, setConfigClient] = useState(null);

    const handleConnect = async () => {
        const client = new SerialConfigClient();
        await client.connect();
        setConfigClient(client);
        setConnected(true);
    };

    if (!connected) {
        return <DeviceConnectionScreen onConnect={handleConnect} />;
    }

    return <OpenArcade3DView configClient={configClient} />;
}

export default App
