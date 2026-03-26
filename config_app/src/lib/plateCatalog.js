import plateCatalog from "@shared/plate_catalog.json";

export const PLATES = plateCatalog.plates;
export const FALLBACK_PLATE_PREVIEW = "/plates/oa_block.png";
export const DEFAULT_PLATE_ID = PLATES[0]?.id || "button-module-v1";

const entries = [];

PLATES.forEach((plate) => {
    entries.push([plate.id, plate]);
    (plate.legacy_ids || []).forEach((legacyId) => {
        entries.push([legacyId, plate]);
    });
});

const BY_ID = Object.fromEntries(entries);

function previewFromModelPath(modelPath) {
    if (typeof modelPath !== "string" || !modelPath.endsWith(".glb")) {
        return null;
    }

    const fileName = modelPath.split("/").pop();
    if (!fileName) {
        return null;
    }

    return `/plates/${fileName.replace(/\.glb$/i, ".png")}`;
}

export function getPlate(plateId) {
    return BY_ID[plateId] || BY_ID[DEFAULT_PLATE_ID] || null;
}

export function getPlateId(plateId) {
    return getPlate(plateId)?.id || DEFAULT_PLATE_ID;
}

export function getPlateName(plateId) {
    return getPlate(plateId)?.name || getPlateId(plateId);
}

export function getPlateControllerModel(plateId) {
    return getPlate(plateId)?.controller_model || "/OpenArcadeAssy_v2.glb";
}

export function getPlatePreview(plateId) {
    const plate = getPlate(plateId);
    if (!plate) {
        return FALLBACK_PLATE_PREVIEW;
    }

    if (typeof plate.top_plate_preview === "string" && plate.top_plate_preview.startsWith("/plates/")) {
        return plate.top_plate_preview;
    }

    return previewFromModelPath(plate.plate_model) || FALLBACK_PLATE_PREVIEW;
}
