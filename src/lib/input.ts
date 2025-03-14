// src/lib/input.ts
import type { NumberTile, Tile } from './tile';

export interface Pon {
  type: 'pon';
  tiles: Tile[];  // exactly 3 tiles
  discardIndex?: number; // Index of the tile in tiles[] to rotate
}

export interface Chii {
  type: 'chii';
  tiles: NumberTile[];  // exactly 3 tiles
}

export interface Kan {
  type: 'kan';
  tiles: Tile[];  // exactly 4 tiles
  discardIndex?: number; // Index of the tile in tiles[] to rotate
  closed: boolean;
  shouminkan?: boolean;
}

export type Meld = Pon | Chii | Kan;

export interface Input {
  dora: Tile[];
  hand: Tile[];
  drawnTile: Tile | null;
  melds: Meld[];
}

export type InputFocus =
  | { type: 'hand' }
  | { type: 'dora' }
  | { type: 'drawnTile' }
  | { type: 'meld'; i: number };

export interface HandOptions {
  riichi: 'none' | 'riichi' | 'double-riichi';
  ron: boolean;
  tsumo: boolean;
  ippatsu: boolean;
  rinshan: boolean;
  chankan: boolean;
  haitei: boolean;
  tenho: boolean;
}
