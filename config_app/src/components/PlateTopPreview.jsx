import { useEffect, useMemo, useState } from "react";
import plateCatalog from "@shared/plate_catalog.json";

const PLATES_PREFIX = "/plates/";
const FALLBACK = "/plates/oa_block.png";
const BY_ID = Object.fromEntries(plateCatalog.plates.map((p) => [p.id, p]));

function previewUrlFromCatalog(plateId) {
    const raw = BY_ID[plateId]?.top_plate_preview;
    if (typeof raw === "string" && raw.startsWith(PLATES_PREFIX)) {
        return raw;
    }
    return FALLBACK;
}

/** PNG top-plate preview (paths under /plates/ only); falls back on missing or failed load. */
export default function PlateTopPreview({ plateId, className = "", alt = "" }) {
    const src = useMemo(() => previewUrlFromCatalog(plateId), [plateId]);
    const [useFallback, setUseFallback] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setUseFallback(false);
    }, [plateId]);

    return (
        <img
            src={useFallback ? FALLBACK : src}
            alt={alt}
            className={`transition-opacity duration-500 ease-out ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
            onLoad={() => setLoaded(true)}
            onError={() => setUseFallback(true)}
        />
    );
}
