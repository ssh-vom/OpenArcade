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

const CLIENTS: Record<ClientType, (opts: ClientFactoryOptions) => IConfigClient> = {
  serial: () => new SerialConfigClient(),
  http: (opts) => new HttpConfigClient({ basePath: opts.httpBasePath }),
  mock: () => new MockConfigClient(),
};

export function createConfigClient(options: ClientFactoryOptions): IConfigClient {
  return CLIENTS[options.type](options);
}
