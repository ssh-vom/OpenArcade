import {
  PLATES,
  DEFAULT_PLATE_ID,
  PLATE_CATALOG,
  type Plate,
  type PlateId,
} from '@generated/plate-catalog';

export { PLATES, DEFAULT_PLATE_ID, PLATE_CATALOG };

export const FALLBACK_PLATE_PREVIEW = '/logos/oa_block.png';

const entries: Array<[string, Plate]> = [];

PLATES.forEach((plate) => {
  entries.push([plate.id, plate]);
  (plate.legacy_ids || []).forEach((legacyId) => {
    entries.push([legacyId, plate]);
  });
});

const BY_ID = Object.fromEntries(entries) as Record<string, Plate>;

function previewFromModelPath(modelPath: string | undefined): string | null {
  if (typeof modelPath !== 'string' || !modelPath.endsWith('.glb')) {
    return null;
  }

  const fileName = modelPath.split('/').pop();
  if (!fileName) {
    return null;
  }

  return `/plates/${fileName.replace(/\.glb$/i, '.png')}`;
}

export function getPlate(plateId?: string | null): Plate | null {
  if (!plateId) {
    return BY_ID[DEFAULT_PLATE_ID] || null;
  }

  return BY_ID[plateId] || BY_ID[DEFAULT_PLATE_ID] || null;
}

export function getPlateId(plateId?: string | null): PlateId {
  return (getPlate(plateId)?.id || DEFAULT_PLATE_ID) as PlateId;
}

export function getPlateName(plateId?: string | null): string {
  return getPlate(plateId)?.name || getPlateId(plateId);
}

export function getPlateControllerModel(plateId?: string | null): string {
  return getPlate(plateId)?.controller_model || PLATES[0]?.controller_model || '/TP1_B_0_BUTTON.glb';
}

export function getPlatePreview(plateId?: string | null): string {
  const plate = getPlate(plateId);
  if (!plate) {
    return FALLBACK_PLATE_PREVIEW;
  }

  if (
    typeof plate.top_plate_preview === 'string' &&
    plate.top_plate_preview.startsWith('/plates/')
  ) {
    return plate.top_plate_preview;
  }

  return previewFromModelPath(plate.plate_model) || FALLBACK_PLATE_PREVIEW;
}
