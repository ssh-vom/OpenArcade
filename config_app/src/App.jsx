import { useState } from "react";
import { OpenArcade3DView } from "./components/OpenArcade3DView"
import DeviceConnectionScreen from "./components/DeviceConnectionScreen"
import './App.css'

function App() {
    const [connected, setConnected] = useState(false);

    if (!connected) {
        return <DeviceConnectionScreen onConnect={() => setConnected(true)} />;
    }

    return <OpenArcade3DView />;
}

export default App
