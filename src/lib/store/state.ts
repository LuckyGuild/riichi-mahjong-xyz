// src/lib/store/state.ts

import type { AppConfig } from '../config';
import type { HandOptions, InputFocus, Input } from '../input';
import type { Tile } from '../tile';
import type { Rule } from '../rule';
import type { Table } from '../table';

/** The seat array is: ["watashi", "shimocha", "toimen", "kamicha"] */
export type Seat = 'watashi' | 'shimocha' | 'toimen' | 'kamicha';

/**
 * The game always has currentTurn as a seat (who is about to act).
 * The reaction-phase is controlled by a separate boolean `reactionPhase` 
 * instead of mixing 'reactionPhase' into currentTurn.
 */
export type CurrentTurn = Seat;

/** 
 * If a discard can be claimed by Watashi, we set `reactionPhase = true`.
 * Then, the user either calls Chi/Pon/Kan or passes.
 */

interface DiscardCheck {
  tile: Tile;                // The tile that was discarded
  fromPlayer: Seat;          // Which seat discarded it
}

interface ChiSelection {
  discardTile: Tile | null;
  discardKey: keyof AppState;
  possibleSequences: number[][];
  pickedTiles: Tile[];
  pickedTileIndices: number[];
}

interface PonSelection {
  discardTile: Tile | null;
  discardKey: keyof AppState;
  pickedTiles: Tile[];
  pickedTileIndices: number[];
}

interface KanSelection {
  discardTile: Tile | null;         // might be null for ankan
  discardKey?: keyof AppState;
  pickedTiles: Tile[];
  pickedTileIndices: number[];
  highlightDrawn: boolean;
}

export interface AgariCandidate {
  tile: Tile;
  by: 'ron' | 'tsumo';
  hasRealYaku: boolean;
}

/** The entire application state. */
export interface AppState {
  currentScreen: 'main' | 'scoring-table' | 'settings';
  currentScoringTableTab: 'score' | 'diff';
  currentSettingsTab: 'rule' | 'appearance' | 'about';
  appConfig: AppConfig;
  savedRules: { [name: string]: Rule };
  currentRule: Rule;
  table: Table;
  input: Input; // This contains hand, melds, dora, etc.
  inputFocus: InputFocus;
  handOptions: HandOptions;
  seed?: string;
  liveWallCut: number;
  dice1: number;
  dice2: number;
  wall: Tile[];
  wanpaiDora: Tile[];
  wanpaiUradora: Tile[];
  wanpaiKan: Tile[];
  wanpaiHaitei: Tile[];
  doraIndicator: Tile[];
  kamichaHand: Tile[];
  toimenHand: Tile[];
  shimochaHand: Tile[];
  watashiDiscards: Tile[];
  kamichaDiscards: Tile[];
  toimenDiscards: Tile[];
  shimochaDiscards: Tile[];

  currentTurn: CurrentTurn;

  /**
   * Indicates that a discard tile is pending reaction from Watashi:
   * e.g., user can call Chi/Pon/Kan or pass. 
   */
  reactionPhase: boolean;

  discardCheck?: DiscardCheck;
  chiSelection?: ChiSelection;
  chiErrorMessage?: string;
  ponSelection?: PonSelection;
  ponErrorMessage?: string;
  kanSelection?: KanSelection;
  kanErrorMessage?: string;

  approveRiichiDiscards: Tile[];
  riichiSelection?: boolean;
  riichiErrorMessage?: string;

  furiten: boolean;
  tempFuriten: boolean;
  riichiFuriten: boolean;
  ronErrorMessage?: string;
  tsumoErrorMessage?: string;

  tenhouPhase: boolean;
  ippatsuPhase: boolean;
  riichiDiscardIndex: number | null;
  rinshanKaihouPhase: boolean;
  haiteiPhase: boolean;
  houteiPhase: boolean;
  mustDiscard: boolean;
  roundOver: boolean;
  gameOver: boolean;

  shantenHistory: number[];
  avgShanten: number | null;
}

export const initialState: AppState = {
  currentScreen: 'main',
  currentScoringTableTab: 'score',
  currentSettingsTab: 'rule',
  appConfig: { theme: 'auto', tileColor: 'light', showBazoro: true },
  savedRules: {
    // ... your preset saved rules
  },
  currentRule: {
    // ... your default rule
    red: { m: 1, p: 1, s: 1 },
    honbaBonus: 100,
    roundedMangan: true,
    doubleWindFu: 2,
    accumlatedYakuman: false,
    multipleYakuman: true,
    kokushi13DoubleYakuman: false,
    suankoTankiDoubleYakuman: false,
    daisushiDoubleYakuman: false,
    pureChurenDoubleYakuman: false
  },
  table: {
    round: 'east',
    seat: 'east',
    roundCount: 1,
    honba: false,
    riichiLastGame: false,
    continue: 0,
    deposit: 0
  },
  input: {
    dora: [],
    drawnTile: null,
    hand: [],
    melds: [],
  },
  inputFocus: { type: 'hand' },
  handOptions: {
    riichi: 'none',
    ron: false,
    tsumo: false,
    ippatsu: false,
    rinshan: false,
    chankan: false,
    haitei: false,
    tenho: false
  },
  seed: undefined,
  liveWallCut: 17,
  dice1: 0,
  dice2: 0,
  wall: [],
  wanpaiDora: [],
  wanpaiUradora: [],
  wanpaiKan: [],
  wanpaiHaitei: [],
  doraIndicator: [],
  kamichaHand: [],
  toimenHand: [],
  shimochaHand: [],
  watashiDiscards: [],
  kamichaDiscards: [],
  toimenDiscards: [],
  shimochaDiscards: [],

  currentTurn: 'watashi',   // e.g. we start with Watashi
  reactionPhase: false,     // This starts off false

  discardCheck: undefined,
  chiSelection: undefined,
  chiErrorMessage: undefined,
  ponSelection: undefined,
  ponErrorMessage: undefined,
  kanSelection: undefined,
  kanErrorMessage: undefined,

  riichiSelection: false,
  approveRiichiDiscards: [],
  riichiErrorMessage: undefined,

  furiten: false,
  tempFuriten: false,
  riichiFuriten: false,
  ronErrorMessage: undefined,
  tsumoErrorMessage: undefined,

  tenhouPhase: false,
  ippatsuPhase: false,
  riichiDiscardIndex: null,
  rinshanKaihouPhase: false,
  haiteiPhase: false,
  houteiPhase: false,
  mustDiscard: false,
  roundOver: false,
  gameOver: false,

  shantenHistory: [],
  avgShanten: null,
};

export const defaultState = (): AppState => {
  const json = localStorage.getItem('store');
  if (json === null) return initialState;
  const { store } = JSON.parse(json);
  return store as AppState;
};
