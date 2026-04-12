import { EDITING_MODES } from '@/constants';
import type { EditingMode } from '@/constants';
import { PLATES } from '@generated/plate-catalog';
import type { PlateId } from '@generated/plate-catalog';

export function isValidEditingMode(mode: string): mode is EditingMode {
  return Object.values(EDITING_MODES).includes(mode as EditingMode);
}

export function isValidPlateId(id: string): id is PlateId {
  return PLATES.some((plate) => plate.id === id || plate.legacy_ids?.includes(id));
}
