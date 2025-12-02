import { useGLTF } from "@react-three/drei";

export function ChildModule({ path }) {
    const gltf = useGLTF(path);

    return (
        <primitive
            object={gltf.scene}
            position={[-1, 0, 0]}
            scale={10}
        />
    );

}

