import { useMemo, useState } from "react";
import { FALLBACK_PLATE_PREVIEW, getPlatePreview } from "../lib/plateCatalog.js";

function PreviewImage({ src, className, alt }) {
    const [useFallback, setUseFallback] = useState(false);
    const [loaded, setLoaded] = useState(false);

    return (
        <img
            src={useFallback ? FALLBACK_PLATE_PREVIEW : src}
            alt={alt}
            className={`transition-opacity duration-500 ease-out ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
            onLoad={() => setLoaded(true)}
            onError={() => setUseFallback(true)}
        />
    );
}

/** PNG top-plate preview (paths under /plates/ only); falls back on missing or failed load. */
export default function PlateTopPreview({ plateId, className = "", alt = "" }) {
    const src = useMemo(() => getPlatePreview(plateId), [plateId]);
    return <PreviewImage key={src} src={src} alt={alt} className={className} />;
}
