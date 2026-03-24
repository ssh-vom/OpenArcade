import { useMemo, useState } from "react";
import plateCatalog from "@shared/plate_catalog.json";

const FALLBACK = "/oa_block.png";
const BY_ID = Object.fromEntries(plateCatalog.plates.map((p) => [p.id, p]));

/** PNG top-plate preview; falls back if plate id or image URL is missing. */
export default function PlateTopPreview({ plateId, className = "", alt = "" }) {
    const src = useMemo(() => BY_ID[plateId]?.top_plate_preview || FALLBACK, [plateId]);
    const [useFallback, setUseFallback] = useState(false);

    return (
        <img
            src={useFallback ? FALLBACK : src}
            alt={alt}
            className={className}
            onError={() => setUseFallback(true)}
        />
    );
}
