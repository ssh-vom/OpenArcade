import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ChildModule } from "./ChildModule.jsx";

export function OpenArcade3DView() {

    return (
        <Canvas
            shadows
            camera={{ position: [0, 2, 5], fov: 45 }}
            style={{ width: "100vw", height: "100vh", background: "white" }}
        >

            {/* --- Lights --- */}

            <ambientLight intensity={1.5} />

            {/* Key Light */}
            <directionalLight
                position={[4, 10, 6]}
                intensity={2}
                castShadow
            />

            {/* Fill Light */}
            <directionalLight
                position={[-6, 8, 4]}
                intensity={1}
            />

            {/* Rim Light */}
            <directionalLight
                position={[0, 5, -6]}
                intensity={1}
            />
            <ChildModule path="/OAColouredButtons.glb" />
            <OrbitControls />
        </Canvas>

    )
};

