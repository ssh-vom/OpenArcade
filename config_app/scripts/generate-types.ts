import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import inputSchema from '../../shared/input_schema.json';
import plateCatalog from '../../shared/plate_catalog.json';

const OUTPUT_DIR = resolve(process.cwd(), 'src/generated');

function renderUnion(values: string[], indent = '  '): string {
  if (values.length === 0) {
    return "never";
  }

  return values.map((value) => `${indent}| '${value}'`).join('\n');
}

function generateInputSchemaTypes(): string {
  const schema = inputSchema as any;
  const gamepadInputs = Object.keys(schema.gamepad?.inputs ?? {});
  const keyboardInputs = Object.keys(schema.keyboard?.inputs ?? {});
  const analogInputs = Object.keys(schema.analog?.inputs ?? {});

  return `// Auto-generated from shared/input_schema.json
// Do not edit manually. Run \`npm run generate-types\`.

export type GamepadInput =
${renderUnion(gamepadInputs)};

export type KeyboardInput =
${renderUnion(keyboardInputs)};

export type AnalogInput =
${renderUnion(analogInputs)};

export type InputType = 'keyboard' | 'gamepad' | 'analog';

export interface InputConfig {
  label: string;
  category?: string;
  keycode?: string;
  isAnalog?: boolean;
  type?: 'bidirectional' | 'unidirectional';
}

export interface InputSchema {
  version: number;
  default_layout: Record<string, string>;
  default_mapping: Record<string, string>;
  keyboard: { inputs: Record<string, InputConfig> };
  gamepad: { inputs: Record<string, InputConfig> };
  analog: { inputs: Record<string, InputConfig> };
}

export const INPUT_SCHEMA: InputSchema = ${JSON.stringify(schema, null, 2)} as const;
`;
}

function generatePlateCatalogTypes(): string {
  const catalog = plateCatalog as any;
  const plateIds = (catalog.plates ?? []).map((plate: any) => plate.id);
  const defaultPlateId = plateIds[0] ?? 'button-module-v1';

  return `// Auto-generated from shared/plate_catalog.json
// Do not edit manually. Run \`npm run generate-types\`.

export type PlateId =
${renderUnion(plateIds)};

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

export const PLATE_CATALOG: PlateCatalog = ${JSON.stringify(catalog, null, 2)} as const;
export const PLATES: Plate[] = PLATE_CATALOG.plates;
export const DEFAULT_PLATE_ID: PlateId = '${defaultPlateId}';
`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(resolve(OUTPUT_DIR, 'input-schema.ts'), generateInputSchemaTypes());
  writeFileSync(resolve(OUTPUT_DIR, 'plate-catalog.ts'), generatePlateCatalogTypes());
  writeFileSync(
    resolve(OUTPUT_DIR, 'README.md'),
    `# Generated Types\n\nFiles in this directory are auto-generated from JSON schemas in \`shared/\`.\n\nDo not edit these files manually.\n\nRegenerate with:\n\n\`\`\`bash\nnpm run generate-types\n\`\`\`\n`,
  );

  console.log('Generated TypeScript schema files in src/generated');
}

main();
