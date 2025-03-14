// src/lib/store/action.ts

import type { AppConfig } from '../config';
import type { HandOptions, Meld } from '../input';
import type { Rule } from '../rule';
import type { Table } from '../table';
import type { Tile } from '../tile';
import type { Result } from '../result';
import type { AppState } from './state';

interface A<T extends string, P> {
  type: T;
  payload: P;
}

/* A<T, P>, where:
   - T is the action type (string)
   - P is the payload
*/


export type Action =
  // settings
  | A<'set-current-rule', Rule>

  // new-game may have an optional seed
  | A<'new-game', { seed?: string } | null>
  | A<'custom-new-game', { hand: Tile[] }>
  | A<'new-round', { seed?: string } | null>
  | A<'round-over', { result: Result }>
  | A<'game-over', null>

  // Non-Watashi discard workflow
  | A<'store-discard', { result: Result }>
  | A<'pass-discard', { result: Result }>

  // Chi
  | A<'call-chi', null>
  | A<'select-chi-tile', number>

  // Pon
  | A<'call-pon', null>
  | A<'select-pon-tile', number>

  // Kan
  | A<'call-kan-discard', null>
  | A<'call-kan-drawn', null>
  | A<'select-kan-tile', number>

  // Basic draw/discard
  | A<'draw-tile', null>
  | A<'discard-drawn-tile', null>
  | A<'remove-hand-tile', number>

  // Riichi / Ron / Tsumo
  | A<'call-riichi', { result: Result }>
  | A<'select-riichi-tile', number>
  | A<'set-agari-flag', { result: Result }>
  | A<'reset-agari-flag', boolean>
  | A<'call-ron', { result: Result }>
  | A<'call-tsumo', { result: Result }>
  | A<'check-furiten', { result: Result }>

  | A<'log-shanten', { result: Result }>
  | A<'clear-error-message', null>
  | A<'escape-selection', null>;