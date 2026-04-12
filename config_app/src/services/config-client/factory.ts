import type { IConfigClient } from '@/types';
import { SerialConfigClient } from './serial-client';
import { HttpConfigClient } from './http-client';
import { MockConfigClient } from './mock-client';

export type ClientType = 'serial' | 'http' | 'mock';

export interface ClientFactoryOptions {
  type: ClientType;
  httpBasePath?: string;
  mockSeed?: number;
}

export function createConfigClient(options: ClientFactoryOptions): IConfigClient {
  switch (options.type) {
    case 'serial':
      return new SerialConfigClient();
    case 'http':
      return new HttpConfigClient({ basePath: options.httpBasePath });
    case 'mock':
      return new MockConfigClient();
    default: {
      const exhaustive: never = options.type;
      throw new Error(`Unknown client type: ${exhaustive}`);
    }
  }
}
