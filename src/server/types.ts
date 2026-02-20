import { SSEClient } from './types';
import { CorporateWorld } from '../scenes/corporate-clash/types';

export type SSEClient = (data: string, id: number) => void;

export interface PlayerState {
  id: string;
  name: string;
  world: CorporateWorld;
  client: SSEClient | null;
  attackCooldown: number;
}
