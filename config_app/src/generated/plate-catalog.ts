// Auto-generated from shared/plate_catalog.json
// Do not edit manually. Run `npm run generate-types`.

export type PlateId =
  | '8button-right-v1'
  | '8button-left-v1'
  | 'tp1-a-180-joystick'
  | 'tp1-a-0-button';

export interface Plate {
  id: PlateId;
  name: string;
  description?: string;
  plate_model: string;
  controller_model: string;
  accent_color?: string;
  top_plate_preview?: string;
  legacy_ids?: string[];
}

export interface PlateCatalog {
  version: number;
  plates: Plate[];
}

export const PLATE_CATALOG: PlateCatalog = {
  "version": 3,
  "plates": [
    {
      "id": "8button-right-v1",
      "legacy_ids": [
        "button-module-v1"
      ],
      "name": "TP1 B Button",
      "description": "Button plate using the TP1_B_0_BUTTON assets",
      "top_plate_preview": "/plates/TP1_B_0_BUTTON.png",
      "plate_model": "/TP1_B_0_BUTTON.glb",
      "controller_model": "/TP1_B_0_BUTTON.glb",
      "accent_color": "#6D28D9"
    },
    {
      "id": "8button-left-v1",
      "name": "TP1 A Joystick",
      "description": "Joystick plate using the TP1_A_0_JOYSTICK assets",
      "top_plate_preview": "/plates/TP1_A_0_JOYSTICK.png",
      "plate_model": "/TP1_A_0_JOYSTICK.glb",
      "controller_model": "/TP1_A_0_JOYSTICK.glb",
      "accent_color": "#2563EB"
    },
    {
      "id": "tp1-a-180-joystick",
      "name": "TP1 A Joystick (180°)",
      "description": "Joystick plate rotated 180 degrees using the TP1_A_180_JOYSTICK assets",
      "top_plate_preview": "/plates/TP1_A_180_JOYSTICK.png",
      "plate_model": "/TP1_A_180_JOYSTICK.glb",
      "controller_model": "/TP1_A_180_JOYSTICK.glb",
      "accent_color": "#2563EB"
    },
    {
      "id": "tp1-a-0-button",
      "name": "TP1 A Button",
      "description": "Button plate using the TP1_A_0_BUTTON assets",
      "top_plate_preview": "/plates/TP1_A_0_BUTTON.png",
      "plate_model": "/TP1_A_0_BUTTON.glb",
      "controller_model": "/TP1_A_0_BUTTON.glb",
      "accent_color": "#0F766E"
    }
  ]
} as const;
export const PLATES: Plate[] = PLATE_CATALOG.plates;
export const DEFAULT_PLATE_ID: PlateId = '8button-right-v1';
