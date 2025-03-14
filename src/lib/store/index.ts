// src/lib/store/index.ts
// reducer 
import { compareTiles, isAvailableTiles } from '../tile';
import { initializeRound, assignHandsAndCurrentTurn } from '../setup';
import type { Rule } from '../rule';
import type { NumberTile, Tile } from '../tile';
import type { Chii, Pon, Kan } from '../input';
import type { Action } from './action';
import type { Seat, AgariCandidate, AppState } from './state';
import type { Reducer } from 'react';
import type { Wind } from '../table';
import seedrandom from 'seedrandom';
import type { Result as ResultType } from '../result';


const seatOrder: Seat[] = ['watashi', 'shimocha', 'toimen', 'kamicha'];

function getNextSeat(current: Seat): Seat {
  const i = seatOrder.indexOf(current);
  return seatOrder[(i + 1) % seatOrder.length];
}

function canWatashiChi(state: AppState, discardTile: Tile): boolean {
  // Must be suits only
  if (!['m', 'p', 's'].includes(discardTile.type)) return false;
  if (discardTile.n < 1 || discardTile.n > 9) return false;

  // Potential sequences
  const possibleSeqs = [
    [1, 2, 3], [2, 3, 4], [3, 4, 5],
    [4, 5, 6], [5, 6, 7], [6, 7, 8],
    [7, 8, 9],
  ].filter(seq => seq.includes(discardTile.n));

  // Check Watashi's hand
  const hand = state.input.hand;

  // If any sequence is feasible => return true
  for (const seq of possibleSeqs) {
    const otherNums = seq.filter(n => n !== discardTile.n);
    // see if the user has the 2 matching tiles
    const canFormThisSeq = otherNums.every(num =>
      hand.some(h => h.type === discardTile.type && h.n === num)
    );
    if (canFormThisSeq) return true;
  }

  return false;
}

function canWatashiPon(state: AppState, discardTile: Tile): boolean {
  // 1) Check if Watashi’s hand has >= 2 copies of discardTile
  const neededType = discardTile.type;
  const neededNum = discardTile.n;

  // Just filter the hand for matching type & number
  const matchingTiles = state.input.hand.filter(
    t => t.type === neededType && t.n === neededNum
  );

  // 2) If we have 2 or more copies, Pon is possible -> return true, else false
  return matchingTiles.length >= 2;
}

function canWatashiOpenKan(state: AppState, discardTile: Tile): boolean {
  // 1) We need exactly 3 copies of discardTile in our hand
  //    so that discardTile + those 3 = 4 copies total → open Kan.
  const neededType = discardTile.type;
  const neededNum = discardTile.n;

  // Filter Watashi’s hand to find all that match type & number
  const matchingTiles = state.input.hand.filter(
    t => t.type === neededType && t.n === neededNum
  );

  // 2) If we have at least 3 matches => open Kan is possible
  return matchingTiles.length >= 3;
}

function removePickedTiles(hand: Tile[], picks: Tile[]): Tile[] {
  const result = [...hand];

  for (const p of picks) {
    const idx = result.findIndex(h => {
      // 1) Compare type & n
      if (h.type !== p.type) return false;
      if (h.n !== p.n) return false;

      // 2) If *both* are suit tiles (m/p/s) and n===5,
      //    compare `.red`
      if (h.type !== 'z' && h.n === 5 && p.type !== 'z' && p.n === 5) {
        return (h.red === true) === (p.red === true);
      }

      // 3) Otherwise, we consider them equal if type & n matched
      return true;
    });

    if (idx >= 0) {
      result.splice(idx, 1);
    }
  }
  return result;
}

function canRon(
  state: AppState,
  discardTile: Tile,
  result: ResultType
): { canRon: boolean } {
  // 1) Furiten check
  if (state.furiten || state.tempFuriten || state.riichiFuriten) {
    return { canRon: false };
  }

  // 2) Must be a valid “hora” result
  if (!result || result.type !== 'hora-shanten' || result.info.type !== 'hora') {
    return { canRon: false };
  }

  const agariTiles = result.info.hora.map((line) => line.horaTile);
  //console.log('winning tiles in canRon:', agariTiles)
  // Check if discardTile matches any of the winning tiles
  const isWinningTile = agariTiles.some((agariTile) =>
    compareTiles(agariTile, discardTile) === 0
  );
  if (!isWinningTile) {
    return { canRon: false };
  }

  // 4) Check for real yaku (excluding dora / red-dora)
  let hasRealYaku = false;
  for (const line of result.info.hora) {
    if (compareTiles(line.horaTile, discardTile) === 0) {
      const realYakuCount = line.yaku.filter(
        (y: any) =>
          y.type === 'yakuman' ||
          (y.type === 'yaku' && !['dora', 'red-dora'].includes(y.name))
      ).length;
      if (realYakuCount > 0) {
        hasRealYaku = true;
        break;
      }
    }
  }

  // If no real yaku was found, we can’t Ron
  if (!hasRealYaku) {
    return { canRon: false };
  }

  // 5) Passed all checks => can Ron
  return { canRon: true };
}

function canTsumo(
  state: AppState,
  drawnTile: Tile | null,
  result: ResultType
): { canTsumo: boolean } {
  // 1) Must have a valid “hora” result
  if (!result || result.type !== 'hora-shanten' || result.info.type !== 'hora') {
    return { canTsumo: false };
  }

  // 2) Must have a valid drawn tile
  if (!drawnTile) {
    return { canTsumo: false };
  }

  // 3) Check if the drawnTile is actually one of the winning tiles
  const isWinningTile = result.info.hora.some(
    (line: any) => compareTiles(line.horaTile, drawnTile) === 0 && line.by === 'tsumo'
  );


  if (!isWinningTile) {
    return { canTsumo: false };
  }

  return { canTsumo: true };
}

// Initial handOptions for reuse
const initialHandOptions = {
  riichi: 'none',
  ron: false,
  tsumo: false,
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
};

// Reducer Implementation
const reducerImpl: Reducer<AppState, Action> = (state, { type, payload }) => {
  switch (type) {
    case 'set-current-rule': {
      /*  console.log("Updating rule:", {
         currentRule: state.currentRule,
         payload: payload,
       }); */

      const prev =
        state.currentRule.red.m !== payload.red.m ||
        state.currentRule.red.p !== payload.red.p ||
        state.currentRule.red.s !== payload.red.s;
      return { ...state, currentRule: payload };
    }

    case 'new-game': {
      console.log('=== New Game Logs ===');
      const { red } = state.currentRule;

      const seed = payload && payload.seed ? payload.seed : undefined;

      const {
        seed: finalSeed,
        dice1,
        dice2,
        liveWallCut,
        wall,
        wanpaiKan,
        wanpaiDora,
        wanpaiUradora,
        doraIndicator,
        eastHand,
        southHand,
        westHand,
        northHand
      } = initializeRound(red, seed);

      // Create RNG again from finalSeed to pick seat deterministically
      const seatOrder: Wind[] = ['east', 'south', 'west', 'north'];
      const rng = seedrandom(finalSeed);
      const randomIndex = Math.floor(rng() * 4);
      const randomSeat = seatOrder[randomIndex]; //one of ['east', 'south', 'west', 'north'

      const hands: [Tile[], Tile[], Tile[], Tile[]] = [eastHand, southHand, westHand, northHand];
      const {
        watashi,
        shimocha,
        toimen,
        kamicha,
        currentTurn
      } = assignHandsAndCurrentTurn(seatOrder, randomSeat, hands);

      console.log('CHEAT CODE:', finalSeed)
      return {
        ...state,
        table: {
          round: 'east',  // Tonpuusen
          seat: randomSeat,
          roundCount: 1,
          honba: false,
          riichiLastGame: false,
          continue: 0,
          deposit: 0
        },
        input: {
          dora: doraIndicator, // set in setup
          hand: watashi.sort(compareTiles), // inline sorting  
          /* 
          seed-1734743081296 
          hand: [
            { type: 'm', n: 7 },
            { type: 'm', n: 7 },
            { type: 'm', n: 7 },
            { type: 'm', n: 8 },
            { type: 'm', n: 8 },
            { type: 'm', n: 8 },
            { type: 'm', n: 6 },
            { type: 'm', n: 6 },
            { type: 'm', n: 6 },
            { type: 'z', n: 5 },
            { type: 's', n: 4 },
            { type: 's', n: 5 },
            { type: 's', n: 6 },
          ],*/
          drawnTile: null,
          melds: [],
          /* melds: [
            {
              type: 'pon',
              tiles: [{ type: 'm', n: 2 }, { type: 'm', n: 2 }, { type: 'm', n: 2 }],
              discardIndex: 2,
            }
          ], */
        },
        handOptions: { ...initialHandOptions },
        seed: finalSeed, // set in setup
        liveWallCut, // set in setup
        wall, // set in setup
        dice1, // set in setup
        dice2, // set in setup
        wanpaiDora, // set in setup
        wanpaiUradora, // set in setup
        wanpaiKan, // set in setup
        wanpaiHaitei: [],
        kamichaHand: kamicha,
        toimenHand: toimen,
        shimochaHand: shimocha,
        watashiDiscards: [],
        kamichaDiscards: [],
        toimenDiscards: [],
        shimochaDiscards: [],

        currentTurn, // set in setup
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

        tenhouPhase: true,
        ippatsuPhase: false,
        riichiDiscardIndex: null,
        rinshanKaihouPhase: false,
        haiteiPhase: false,
        houteiPhase: false,
        mustDiscard: false,
        roundOver: false,
        gameOver: false,
      }
    }

    case 'custom-new-game': {
      // Extract the custom hand (the 13 tiles) from the payload.
      const { hand } = payload;
      const customHand: Tile[] = payload.hand;
      const { red } = state.currentRule;

      // Initialize the round normally.
      const {
        seed: finalSeed,
        dice1,
        dice2,
        liveWallCut,
        wall,
        wanpaiKan,
        wanpaiDora,
        wanpaiUradora,
        doraIndicator,
        eastHand,
        southHand,
        westHand,
        northHand,
      } = initializeRound(red);

      // Create RNG to pick the dealer seat deterministically.
      const seatOrder: Wind[] = ['east', 'south', 'west', 'north'];
      const rng = seedrandom(finalSeed);
      const randomIndex = Math.floor(rng() * 4);
      const randomSeat = seatOrder[randomIndex];

      const hands: [Tile[], Tile[], Tile[], Tile[]] = [eastHand, southHand, westHand, northHand];
      const { watashi, shimocha, toimen, kamicha, currentTurn } =
        assignHandsAndCurrentTurn(seatOrder, randomSeat, hands);

      // --- Revision 1: Swap tiles so that watashi (local player's hand) becomes customHand ---
      // Helper function to compare two tiles.
      const tilesMatch = (a: Tile, b: Tile): boolean => {
        if (a.type !== b.type || a.n !== b.n) return false;
        if (a.type === 'm' || a.type === 'p' || a.type === 's') {
          const aRed = 'red' in a ? a.red || false : false;
          const bRed = 'red' in b ? b.red || false : false;
          return aRed === bRed;
        }
        return true;
      };

      // Keep track of indices in watashi that are already fixed.
      const fixedIndices = new Set<number>();

      // For each tile in the custom hand, check whether watashi's tile at that position matches.
      customHand.forEach((customTile, i) => {
        // Skip if this index is already fixed.
        if (fixedIndices.has(i)) return;

        if (tilesMatch(watashi[i], customTile)) {
          fixedIndices.add(i);
          return;
        }

        // Define the arrays to search for the tile that should be in watashi.
        // Exclude watashi itself.
        const arraysToSearch: Tile[][] = [wall, wanpaiKan, wanpaiDora, wanpaiUradora, kamicha, toimen, shimocha];

        for (let arr of arraysToSearch) {
          const idx = arr.findIndex(tile => tilesMatch(tile, customTile));
          if (idx !== -1) {
            // Swap the tile from arr with the one currently in watashi.
            const temp = arr[idx];
            arr[idx] = watashi[i];
            watashi[i] = temp;
            fixedIndices.add(i);
            break;
          }
        }
      });
      // At this point, watashi should match customHand.

      // --- Revision 2: Return the new state with watashi replaced by the custom hand ---
      return {
        ...state,
        table: {
          round: 'east', // default value; adjust as needed
          seat: randomSeat,
          roundCount: 1,
          honba: false,
          riichiLastGame: false,
          continue: 0,
          deposit: 0,
        },
        input: {
          dora: doraIndicator,
          hand: watashi.sort(compareTiles), // now exactly customHand
          drawnTile: null,
          melds: [],
        },
        handOptions: { ...initialHandOptions },
        seed: finalSeed,
        liveWallCut,
        wall,
        dice1,
        dice2,
        wanpaiDora,
        wanpaiUradora,
        wanpaiKan,
        wanpaiHaitei: [],
        kamichaHand: kamicha,
        toimenHand: toimen,
        shimochaHand: shimocha,
        watashiDiscards: [],
        kamichaDiscards: [],
        toimenDiscards: [],
        shimochaDiscards: [],

        currentTurn, // set in setup
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

        tenhouPhase: true,
        ippatsuPhase: false,
        riichiDiscardIndex: null,
        rinshanKaihouPhase: false,
        haiteiPhase: false,
        houteiPhase: false,
        mustDiscard: false,
        roundOver: false,
        gameOver: false,
      };
    }


    case 'new-round': {
      console.log('=== New Round Logs ===');
      const { red } = state.currentRule;

      //const seed = payload && payload.seed ? payload.seed : undefined;

      const seatOrder: Wind[] = ['east', 'north', 'west', 'south'];
      const currentSeatIndex = seatOrder.indexOf(state.table.seat);
      const nextSeatIndex = (currentSeatIndex + 1) % seatOrder.length;
      const nextSeat = seatOrder[nextSeatIndex];
      const newRoundCount = state.table.roundCount + 1;

      const {
        seed: finalSeed,
        dice1,
        dice2,
        liveWallCut,
        wall,
        wanpaiKan,
        wanpaiDora,
        wanpaiUradora,
        doraIndicator,
        eastHand,
        southHand,
        westHand,
        northHand
      } = initializeRound(red);

      const hands: [Tile[], Tile[], Tile[], Tile[]] = [eastHand, southHand, westHand, northHand];
      const {
        watashi,
        shimocha,
        toimen,
        kamicha,
        currentTurn
      } = assignHandsAndCurrentTurn(seatOrder, nextSeat, hands);

      // Determine the new 'continue' value based on the previous round's 'honba'
      let newContinue: number;
      if (state.table.honba === true) {
        newContinue = state.table.continue + 1;
      }
      else {
        newContinue = 0; // Reset continue count
      }

      // Determine the new 'deposit' value based on the previous round's 'riichiLastGame'
      let newDeposit: number;
      if (state.table.riichiLastGame === true) {
        newDeposit = state.table.deposit + 1;
      }
      else {
        newDeposit = 0; // Reset deposit count
      }

      console.log('CHEAT CODE:', finalSeed)
      return {
        ...state,
        table: {
          round: 'east', // Tonpuusen
          seat: nextSeat, // east->south->west->north
          roundCount: newRoundCount, // +1
          honba: false, // reset for the new round
          riichiLastGame: false, // reset for the new round
          continue: newContinue,
          deposit: newDeposit
        },
        input: {
          dora: doraIndicator, // set in setup
          hand: watashi.sort(compareTiles), // inline sorting
          drawnTile: null,
          melds: [],
        },
        handOptions: { ...initialHandOptions },
        seed: finalSeed, // set in setup
        liveWallCut, // set in setup
        dice1, // set in setup
        dice2, // set in setup
        wall, // set in setup
        wanpaiDora, // set in setup
        wanpaiUradora, // set in setup
        wanpaiKan, // set in setup
        wanpaiHaitei: [],
        kamichaHand: kamicha,
        toimenHand: toimen,
        shimochaHand: shimocha,
        watashiDiscards: [],
        kamichaDiscards: [],
        toimenDiscards: [],
        shimochaDiscards: [],

        currentTurn,
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

        tenhouPhase: true,
        ippatsuPhase: false,
        riichiDiscardIndex: null,
        rinshanKaihouPhase: false,
        haiteiPhase: false,
        houteiPhase: false,
        mustDiscard: false,
        roundOver: false,
        gameOver: false,
      };
    }

    //-----------------------------------------
    // since calling kan when watashi turn we dont need 'reactionPhase'
    // this only draws tile from wall for watashi
    //-----------------------------------------
    case 'draw-tile': {
      // If the wall is empty, do nothing or handle “no more tiles” scenario
      if (state.wall.length === 0) return state;

      // 1) If it **is** Watashi's turn => the usual draw logic
      if (state.currentTurn === 'watashi') {
        // Check if watashi already has a drawnTile
        if (state.input.drawnTile) {
          // Watashi has already drawn a tile and hasn't discarded yet
          // Prevent drawing another tile
          return state;
        }

        // Normal scenario: Watashi draws from the wall
        const drawnTile = state.wall[state.wall.length - 1];
        const newWall = state.wall.slice(0, -1);

        return {
          ...state,
          wall: newWall,
          input: {
            ...state.input,
            drawnTile,
          },
          discardCheck: undefined,
          tempFuriten: false,
          // tempFuriten is reset when we draw another tile
        };
      }
      return state;
    }

    case 'store-discard': {
      // 1) Must NOT be Watashi's turn
      if (state.currentTurn === 'watashi') return state;

      // 2) Draw a tile from the wall => discardTile
      const discardTile = state.wall[state.wall.length - 1];
      const newWall = state.wall.slice(0, -1);

      // 3) Identify which player's discard array to add to
      let discardKey: keyof AppState = 'kamichaDiscards';
      if (state.currentTurn === 'shimocha') discardKey = 'shimochaDiscards';
      if (state.currentTurn === 'toimen') discardKey = 'toimenDiscards';
      if (state.currentTurn === 'kamicha') discardKey = 'kamichaDiscards';

      // 4) Append that tile to the discard array
      const updatedDiscards = [...(state[discardKey] as Tile[]), discardTile];

      // 5) Check for Ron eligibility using the helper function
      const { result } = payload;
      const ronCheck = canRon(state, discardTile, result);

      // 6) If in Riichi or Double Riichi, canChi/pon/kan remain false
      let canChi = false;
      let canPon = false;
      let canOpenKan = false;

      if (
        state.handOptions.riichi !== 'riichi' &&
        state.handOptions.riichi !== 'double-riichi'
      ) {
        // Only allow Chi if discard is from Kamicha
        canChi = (state.currentTurn === 'kamicha')
          ? canWatashiChi(state, discardTile)
          : false;
        canPon = canWatashiPon(state, discardTile);
        canOpenKan = canWatashiOpenKan(state, discardTile);
      }

      // 7) Combine Ron check with other reaction checks
      const canReact = ronCheck.canRon || canChi || canPon || canOpenKan;

      if (canReact) {
        return {
          ...state,
          wall: newWall,
          [discardKey]: updatedDiscards,
          discardCheck: {
            tile: discardTile,
            fromPlayer: state.currentTurn,
          },
          reactionPhase: true,
        };
      } else {
        // 8) No reaction possible => skip to next seat’s turn
        const nextTurn = getNextSeat(state.currentTurn as Seat);
        return {
          ...state,
          wall: newWall,
          [discardKey]: updatedDiscards,
          discardCheck: undefined,
          currentTurn: nextTurn,
          reactionPhase: false,
        };
      }
    }


    case 'remove-hand-tile': {
      //console.log('[REDUCER] remove-hand-tile'); //DEBUG
      // Safely construct the full hand including drawnTile if present

      if (state.handOptions.riichi === 'riichi' || state.handOptions.riichi === 'double-riichi') {
        return {
          ...state,
          riichiErrorMessage: "Can't modify riichi hand"
        };
      }

      const fullHand = state.input.drawnTile
        ? [...state.input.hand, state.input.drawnTile]
        : [...state.input.hand];

      // Attempt to discard the tile at 'payload' index from the fullHand
      const discardedTile = fullHand[payload];

      // Remove the tile at the given index
      const newHand = fullHand
        .filter((_, i) => i !== payload)
        .sort(compareTiles);

      // Advance turn, or handle turn logic as previously coded
      const nextTurn = getNextSeat(state.currentTurn as Seat);

      return {
        ...state,
        input: {
          ...state.input,
          hand: newHand,
          drawnTile: null, // Ensure drawnTile cleared here if needed
        },
        watashiDiscards: [...state.watashiDiscards, discardedTile],
        currentTurn: nextTurn,
        mustDiscard: false,
        tenhouPhase: false,
        ippatsuPhase: false,
        rinshanKaihouPhase: false,
      };
    }

    case 'discard-drawn-tile': {
      //console.log('[REDUCER] discard-drawn-tile'); //DEBUG
      const discardedTile = state.input.drawnTile;

      // If there's no tile, discardedTile: null so bail
      if (!discardedTile) {
        return state;
      }

      // Advance to the next player
      const nextTurn = getNextSeat(state.currentTurn as Seat);

      return {
        ...state,
        input: {
          ...state.input,
          drawnTile: null,
        },
        watashiDiscards: [...state.watashiDiscards, discardedTile],
        currentTurn: nextTurn,
        inputFocus: { type: 'hand' },
        tenhouPhase: false,
        ippatsuPhase: false,
      };
    }

    case 'round-over': {
      console.log('=== Round Over ===');
      const { result } = payload;
      const { riichi, ron, tsumo } = state.handOptions;

      if (result === null) {
        return {
          ...state,
        };
      }

      /// Default honba: true if neither Ron nor Tsumo happened
      let honba = !ron && !tsumo;

      // If result.type === 'hora-shanten', no drawn tile condition
      if (result.type === 'hora-shanten') {
        // we are tenpai but did not win, no ryuukyoku
        if (result.info.type === 'hora' && !ron && !tsumo) {
          honba = false;
        }
        // we did not win, and other players didnt so ryuukyoku:true
        else if (result.info.type === 'shanten' && !ron && !tsumo) {
          honba = true;
        }
      }

      // Create new table object
      let newTable = {
        ...state.table,
        honba,
        riichiLastGame: riichi === 'riichi' || riichi === 'double-riichi',
      };

      return {
        ...state,
        roundOver: true,
        table: newTable,
      };
    }

    case 'game-over': {
      console.log('=== Game Over ===');
      return {
        ...state,
        gameOver: true,
      };
    }

    // -------------------------------------------------
    // "check-chi": The user clicked "Chi" button
    // reactionPhase=true, We see if watashi can form Chi
    // with discardCheck.tile
    // -------------------------------------------------
    case 'call-chi': {
      // Only allow calling Chi if reactionPhase is true and we have a valid discardCheck
      if (!state.reactionPhase || !state.discardCheck) {
        return state;
      }

      // If the discarder is NOT your Kamicha, skip
      // (Because in Riichi, you can only Chi from the player on your left = "kamicha")
      if (state.discardCheck.fromPlayer !== 'kamicha') {
        return state;
      }

      // Now do your "can we call chi" logic
      const discardTile = state.discardCheck.tile;
      if (!['m', 'p', 's'].includes(discardTile.type) ||
        discardTile.n < 1 || discardTile.n > 9) {
        // can't chi from honor
        return state;
      }

      // Check sequences
      const possibleSeqs = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 6, 7], [6, 7, 8], [7, 8, 9]]
        .filter(seq => seq.includes(discardTile.n));

      const hand = state.input.hand;
      const validSequences = possibleSeqs.filter(seq => {
        const others = seq.filter(n => n !== discardTile.n);
        return others.every(n => hand.some(h => h.type === discardTile.type && h.n === n));
      });

      if (validSequences.length === 0) {
        // no valid chi
        return {
          ...state,
          chiErrorMessage: "Cannot Chi that tile",
        };
      }

      if (state.handOptions.riichi === 'riichi' || state.handOptions.riichi === 'double-riichi') {
        return {
          ...state,
          riichiErrorMessage: "Can't modify riichi hand"
        };
      }

      // Otherwise set up chiSelection
      // (We have not yet removed tiles from the hand; we just store an object so the user
      //  can pick the 2 tile indices to complete the meld)
      return {
        ...state,
        chiSelection: {
          discardTile,
          discardKey: (state.discardCheck.fromPlayer + 'Discards') as keyof AppState,
          possibleSequences: validSequences,
          pickedTiles: [],
          pickedTileIndices: [],
        },
        // Keep reactionPhase true until user finishes or passes
        // The user will pick 2 tiles => triggers 'select-chi-tile' actions
      };
    }

    case 'pass-discard': {
      // we were in reaction phase, and we clicked 'next' to pass and are in this case
      // The user passed on the reaction chi/pon/kan/ron

      // 1) Must be in reactionPhase and have a discardCheck tile
      if (!state.reactionPhase || !state.discardCheck) {
        return state;
      }

      // We'll need the same "result" you passed to 'store-discard', 
      // so you must include it in the payload again when calling 'pass-discard'.
      const { result } = payload;
      const lastDiscardTile = state.discardCheck.tile;

      // 2) Check if Ron was possible using the same helper
      const ronCheck = canRon(state, lastDiscardTile, result);
      const passingRon = ronCheck.canRon; // true if we *could* have Ron

      // 3) Decide if we apply tempFuriten or riichiFuriten
      const inRiichi = (
        state.handOptions.riichi === 'riichi' ||
        state.handOptions.riichi === 'double-riichi'
      );

      let newRiichiFuriten = state.riichiFuriten;
      let newTempFuriten = state.tempFuriten;

      // If we passed on a winning tile
      if (passingRon) {
        if (inRiichi) {
          // Once in Riichi, passing a winning tile => permanent riichiFuriten
          newRiichiFuriten = true;
        } else {
          // If not in Riichi, set temporary furiten
          newTempFuriten = true;
        }
      }

      // Set ronErrorMessage based on which furiten flag is true
      let ronErrorMessage: string | undefined = undefined;
      if (newRiichiFuriten) {
        ronErrorMessage = 'Riichi Furiten for the rest of the round';
      } else if (newTempFuriten) {
        ronErrorMessage = 'Temporary Furiten for this turn';
      }

      // 4) Advance turn
      const nextTurn = getNextSeat(state.currentTurn as Seat);
      return {
        ...state,
        discardCheck: undefined,
        reactionPhase: false,
        currentTurn: nextTurn,
        tempFuriten: newTempFuriten,
        riichiFuriten: newRiichiFuriten,
        ronErrorMessage,
      };
    }

    case 'select-chi-tile': {
      if (!state.chiSelection) {
        return state; // No Chi in progress
      }

      const {
        discardTile,
        discardKey,
        pickedTiles,
        pickedTileIndices,
        possibleSequences
      } = state.chiSelection;

      if (!discardTile) {
        return state;
      }


      const selectedTile = state.input.hand[payload];

      // Check if tile is already picked
      if (pickedTileIndices.includes(payload)) {
        return state; // Ignore duplicate selections
      }

      // Add user selected tile to picks
      const updatedPickedTiles = [...pickedTiles, selectedTile];
      const updatedPickedIndices = [...pickedTileIndices, payload];

      // If fewer than 2 picks, keep waiting
      if (updatedPickedTiles.length < 2) {
        // Wait for the second tile
        return {
          ...state,
          chiSelection: {
            ...state.chiSelection,
            pickedTiles: updatedPickedTiles,
            pickedTileIndices: updatedPickedIndices,
          },
        };
      }

      // Now we have 2 chosen tiles plus the discard tile.
      // We want discardTile FIRST, then the 2 picks sorted ascending
      const localPicks = [...updatedPickedTiles].sort((a, b) => a.n - b.n);
      const finalTiles = [discardTile, ...localPicks];
      // finalTiles[0] = discardTile (will be shown rotated)
      // finalTiles[1..2] = local picks in ascending order

      // Check suit
      const allSameSuit = finalTiles.every(tile => tile.type === discardTile.type);
      // check if valid sequence
      const sortedNumbers = finalTiles
        .map(t => t.n)
        .sort((a, b) => a - b);
      // e.g. if user picked 5, discard is 3, and second pick is 4 => sortedNumbers = [3,4,5]
      const isValidSequence = allSameSuit && possibleSequences.some(seq =>
        seq.every((n, i) => sortedNumbers[i] === n)
      );

      if (!isValidSequence) {
        // Invalid sequence: show error and clear chiSelection
        return {
          ...state,
          chiSelection: undefined,
          reactionPhase: false, // ending any chance for chi 
          chiErrorMessage: "Thats not Chi"
        };
      }

      // Valid Chi sequence: proceed & update the state accordingly
      // Remove the selected tiles from the hand

      // Remove the discard tile from the player's discards
      const updatedDiscards = (state[discardKey] as Tile[]).slice(0, -1);

      // 5) Construct the new Chii meld object storing exactly these 3 tiles:
      const newChiiMeld: Chii = {
        type: 'chii' as const,
        tiles: finalTiles as NumberTile[], // [discardTile, hand.tile1, hand.tile2]
      };

      // Remove those 2 tiles from hand, remove the discard from discard array
      const remainingHand = removePickedTiles(state.input.hand, updatedPickedTiles);

      // valid sequence removed tile pushed into melds
      return {
        ...state,
        input: {
          ...state.input,
          hand: remainingHand,
          melds: [...state.input.melds, newChiiMeld]
        },
        [discardKey]: updatedDiscards,
        chiSelection: undefined,
        reactionPhase: false,
        mustDiscard: true,
        currentTurn: 'watashi' as Seat
      };
    }

    case 'call-pon': {
      // Must be in reactionPhase AND have a discardCheck.
      if (!state.reactionPhase || !state.discardCheck) {
        return state;
      }

      // If we’re in reactionPhase, we must use discardCheck to see the tile and fromPlayer
      if (state.reactionPhase && state.discardCheck) {
        const discardTile = state.discardCheck.tile;
        const discardKey = (state.discardCheck.fromPlayer + 'Discards') as keyof AppState;

        // Ensure we have the discard array
        const prevDiscards = state[discardKey] as Tile[];
        if (prevDiscards.length === 0) {
          return state; // no tile in that discard array
        }

        // Check if we have 2 copies in hand
        const neededType = discardTile.type;
        const neededNum = discardTile.n;
        const matchingTilesInHand = state.input.hand.filter(
          t => t.type === neededType && t.n === neededNum
        );

        // If fewer than 2 copies, we cannot Pon
        if (matchingTilesInHand.length < 2) {
          return state; // can't form Pon
        }

        if (state.handOptions.riichi === 'riichi' || state.handOptions.riichi === 'double-riichi') {
          return {
            ...state,
            riichiErrorMessage: "Can't modify riichi hand"
          };
        }

        // Otherwise, set up ponSelection where the user will pick 2 tiles
        return {
          ...state,
          ponSelection: {
            discardTile,
            discardKey,
            pickedTiles: [],
            pickedTileIndices: []
          },
          // reactionPhase remains true, so user can proceed to pick
        };
      }
    }

    case 'select-pon-tile': {
      if (typeof payload !== 'number' || payload < 0 || payload >= state.input.hand.length) {
        return state;
      }

      // 1) If no active ponSelection, bail out
      if (!state.ponSelection) {
        return state;
      }

      const {
        discardTile,
        discardKey,
        pickedTiles,
        pickedTileIndices
      } = state.ponSelection;

      if (!discardTile) {
        return state;
      }

      const selectedTile = state.input.hand[payload];

      // 2) Make sure the user isn't picking the same tile index twice
      if (pickedTileIndices.includes(payload)) {
        // Already selected
        return state;
      }

      // 3) Add the newly selected tile to the partial picks
      const updatedPickedTiles = [...pickedTiles, selectedTile];
      const updatedPickedIndices = [...pickedTileIndices, payload];

      // 4) We need exactly 2 tiles from the user’s hand
      if (updatedPickedTiles.length < 2) {
        // Not enough yet → update ponSelection
        return {
          ...state,
          ponSelection: {
            ...state.ponSelection,
            pickedTiles: updatedPickedTiles,
            pickedTileIndices: updatedPickedIndices,
          },
        };
      }

      // 5) Once we have 2 from the hand, plus the discard tile
      //    => total 3 identical tiles
      // Combine them
      const finalTiles = [...updatedPickedTiles, discardTile];

      // 6) Validate they are indeed identical
      const neededType = discardTile.type;
      const neededNum = discardTile.n;

      const isValidPon = finalTiles.every(
        tile => tile.type === neededType && tile.n === neededNum
      );

      if (!isValidPon) {
        // If for some reason they don't match (which shouldn't happen if your UI is restricting),
        // show an error
        return {
          ...state,
          ponSelection: undefined,
          reactionPhase: false,
          ponErrorMessage: "Thats not Pon",
        };
      }

      // 7) We have a valid Pon. 
      //    Remove these 2 selected tiles from the user’s hand
      const remainingHand = removePickedTiles(state.input.hand, updatedPickedTiles);

      // 8) Remove the discard tile from the  player's discard array
      const updatedDiscards = (state[discardKey] as Tile[]).slice(0, -1);

      // 9) Determine the discardIndex (fromPlayer) based on discard seat
      let newDiscardIndex: number;
      if (state.discardCheck && typeof state.discardCheck.fromPlayer !== 'undefined') {
        switch (state.discardCheck.fromPlayer) {
          case 'shimocha':
            newDiscardIndex = 2;
            break;
          case 'toimen':
            newDiscardIndex = 1;
            break;
          case 'kamicha':
            newDiscardIndex = 0;
            break;
          default:
            newDiscardIndex = -1; // Handle default case
            break;
        }
      } else {
        // Handle the case where state.discardCheck or state.discardCheck.fromPlayer is undefined
        newDiscardIndex = -1; // or another default value or error handling as appropriate
      }

      // 10) Create a new Pon meld object with discardIndex set
      const newPonMeld: Pon = {
        type: 'pon',
        tiles: finalTiles,
        discardIndex: newDiscardIndex,
      };

      // 10) Build a new state
      return {
        ...state,
        input: {
          ...state.input,
          hand: remainingHand,
          // push a new meld object
          melds: [...state.input.melds, newPonMeld],
        },
        [discardKey]: updatedDiscards,
        ponSelection: undefined,   // done selecting
        reactionPhase: false,
        mustDiscard: true,
        currentTurn: 'watashi' as Seat // clear any previous error
      };
    }

    //-----------------------------------------
    // since calling kan when watashi turn we dont need 'reactionPhase
    //-----------------------------------------
    case 'call-kan-drawn': {
      // Must be Watashi’s turn (i.e., not a reaction from someone’s discard).
      if (state.currentTurn !== 'watashi') {
        return state;
      }

      const drawnTile = state.input.drawnTile; // could be null or an actual tile

      // (A) Shouminkan: upgrade existing 'pon' to a 'kan'
      if (drawnTile) {
        // 1) Find an existing 'pon' meld with the same tile (all 3 identical).
        //    Because now we store *all 3 tiles* in a pon, we must check them carefully:
        const existingPonIndex = state.input.melds.findIndex(
          m =>
            m.type === 'pon' &&
            m.tiles.length === 3 &&
            // Check if these 3 are all the same type/number
            m.tiles.every(t => t.type === drawnTile.type && t.n === drawnTile.n)
        );
        if (existingPonIndex >= 0) {
          // (A1) Remove that old 'pon' from melds
          const newMelds = [...state.input.melds];
          const oldPon = newMelds.splice(existingPonIndex, 1)[0] as Pon; // remove & store

          // (A2) Build a new 'kan' meld with closed=false
          //      Because we’re upgrading an existing Pon (3 identical) plus drawnTile
          const newKanTiles = [...oldPon.tiles, drawnTile]; // total 4 identical
          const newKan = {
            type: 'kan' as const,
            tiles: newKanTiles,
            discardIndex: oldPon.discardIndex,
            closed: false, // open / Daiminkan upgrade
            shouminkan: true,  // upgrading pon to kan is shouminkan
          };

          // (A3) Remove the tile from drawnTile in input
          //      i.e., the user used that tile to upgrade pon -> kan
          let newDrawnTile: Tile | null = null;

          // (A4) “Kan draw” from `wanpaiKan`
          const drawnTileKan = state.wanpaiKan[0];
          const newWanpaiKan = state.wanpaiKan.slice(1);

          // (A5) Move top tile of the main wall into `wanpaiHaitei`
          const haiteihai = state.wall[0];
          const newWall = state.wall.slice(1);
          const newWanpaiHaitei = [...state.wanpaiHaitei, haiteihai];

          // (A6) Reveal the next Dora
          const i = state.input.dora.length;
          let newDora = [...state.input.dora];
          if (i < state.wanpaiDora.length) {
            const nextDoraTile = state.wanpaiDora[i];
            newDora.push(nextDoraTile);
          }

          // (A7) If we now have 5 total Dora => Suu Kaikan => game over
          const isSuuKaikan = newDora.length === 5;

          // (A8) Return updated state
          return {
            ...state,
            input: {
              ...state.input,
              melds: [...newMelds, newKan],
              drawnTile: drawnTileKan, // user draws from Kan
              dora: newDora,
            },
            wall: newWall,
            wanpaiKan: newWanpaiKan,
            wanpaiHaitei: newWanpaiHaitei,
            kanSelection: undefined, // no selection needed
            currentTurn: 'watashi' as Seat,
            roundOver: isSuuKaikan ? true : false,
          };
        }
      }

      // (B) Closed Kan from the single drawn tile (4th copy in hand)
      if (drawnTile) {
        // Check if we already have 3 matching in hand
        const neededType = drawnTile.type;
        const neededNum = drawnTile.n;
        const matching = state.input.hand.filter(
          t => t.type === neededType && t.n === neededNum
        );
        if (matching.length >= 3) {
          // → Show a “kanSelection” or do it immediately
          return {
            ...state,
            kanSelection: {
              discardTile: drawnTile, // “4th tile”
              discardKey: undefined,  // no outside discard
              pickedTiles: [],
              pickedTileIndices: [],
              highlightDrawn: true,
            },
          };
        }
      }

      // (C) Ankan from 4 copies purely in your hand (drawnTile might be irrelevant or null)
      {
        // Check if there's a 4-of-a-kind in your hand
        const tileCounts: Record<string, number> = {};
        for (const t of state.input.hand) {
          const key = `${t.type}-${t.n}`;
          tileCounts[key] = (tileCounts[key] || 0) + 1;
        }
        const fourKey = Object.keys(tileCounts).find(k => tileCounts[k] === 4);
        if (fourKey) {
          // we have an in-hand 4-of-a-kind → user can do ankan
          return {
            ...state,
            kanSelection: {
              discardTile: null, // no outside tile
              discardKey: undefined,
              pickedTiles: [],
              pickedTileIndices: [],
              highlightDrawn: false,
            },
          };
        }
      }

      // Otherwise no possible call
      return state;
    }

    // kan from other discard + 3 in hand = daiminkan
    // returns kanSelection
    case 'call-kan-discard': {
      // Must be in reactionPhase *and* we have a discardCheck
      if (!state.reactionPhase || !state.discardCheck) {
        return state;
      }

      const discardTile = state.discardCheck.tile;
      const discardKey = (state.discardCheck.fromPlayer + 'Discards') as keyof AppState;

      // Confirm we have at least 3 in hand matching that discard
      const neededType = discardTile.type;
      const neededNum = discardTile.n;
      const matching = state.input.hand.filter(
        t => t.type === neededType && t.n === neededNum
      );

      if (matching.length < 3) {
        // Not enough copies to form a 4-of-a-kind
        return state;
      }

      if (state.handOptions.riichi === 'riichi' || state.handOptions.riichi === 'double-riichi') {
        return {
          ...state,
          riichiErrorMessage: "Can't modify riichi hand"
        };
      }

      // Show a kanSelection so user picks which 3 tiles from hand
      // (some GUIs do it automatically; you might do an immediate “select”)
      return {
        ...state,
        kanSelection: {
          discardTile,   // the outside tile
          discardKey,    // so we know which seat’s discard array to remove from
          pickedTiles: [],
          pickedTileIndices: [],
          highlightDrawn: false,
        },
      };
    }

    case 'select-kan-tile': {
      if (!state.kanSelection) {
        return state; // no Kan in progress
      }

      const {
        pickedTiles,
        pickedTileIndices,
        discardTile, // null => Ankan, else 1 tile from drawn or from discard
        discardKey,  // undefined => closed Kan, else open Kan
      } = state.kanSelection;

      const selectedTile = state.input.hand[payload];

      // (A) If tile is already picked, ignore
      if (pickedTileIndices.includes(payload)) {
        return state;
      }

      // (B) Add selected tile to partial picks
      const newPickedTiles = [...pickedTiles, selectedTile];
      const newPickedIndices = [...pickedTileIndices, payload];

      // (C) We need either 3 from hand + 1 outside = 4 total
      //     or 4 from hand => total 4
      const required = discardTile === null ? 4 : 3;
      if (newPickedTiles.length < required) {
        return {
          ...state,
          kanSelection: {
            ...state.kanSelection,
            pickedTiles: newPickedTiles,
            pickedTileIndices: newPickedIndices,
          },
        };
      }

      // (D) Combine with discardTile if it’s an open Kan
      const finalTiles = discardTile
        ? [...newPickedTiles, discardTile] // total 4
        : [...newPickedTiles];            // total 4
      if (finalTiles.length !== 4) {
        // Safety check
        return {
          ...state,
          kanSelection: undefined,
          kanErrorMessage: "Something went wrong: finalTiles not length 4.",
        };
      }

      // (E) Validate that all 4 are identical
      const neededType = finalTiles[0].type;
      const neededNum = finalTiles[0].n;
      const isValidKan = finalTiles.every(t => t.type === neededType && t.n === neededNum);
      if (!isValidKan) {
        return {
          ...state,
          kanSelection: undefined,
          reactionPhase: false,
          kanErrorMessage: "Thats not Kan",
        };
      }

      // (F) Remove those from your hand
      const remainingHand = removePickedTiles(state.input.hand, newPickedTiles);

      // (G) Determine if closed or open
      //     “closed” if discardKey is undefined => we didn’t remove an outside discard
      const isClosedKan = (discardKey === undefined || discardKey === null);

      // If closed Kan used the drawnTile, remove drawnTile from input
      let newDrawnTile = state.input.drawnTile;
      if (isClosedKan && discardTile === state.input.drawnTile) {
        newDrawnTile = null;
      }

      // (G) Determine discardIndex based on fromPlayer in discardCheck
      let newDiscardIndex: number;

      if (discardTile && required === 3) {
        // Only assign discardIndex if we're combining 3 from hand + 1 discard
        switch (state.discardCheck?.fromPlayer) {
          case 'shimocha':
            newDiscardIndex = 3;
            break;
          case 'toimen':
            newDiscardIndex = 1;
            break;
          case 'kamicha':
            newDiscardIndex = 0;
            break;
          default:
            newDiscardIndex = -1; // Handle default case
            break;
        }
      } else {
        // Handle the case where discardIndex should not be set
        newDiscardIndex = -1;
      }

      // (H) Build a new Kan meld that stores all 4 identical tiles
      //     plus a closed boolean.
      const newKanMeld = {
        type: 'kan' as const,
        tiles: finalTiles,
        closed: isClosedKan,
        discardIndex: newDiscardIndex !== -1 ? newDiscardIndex : undefined, // Only set discardIndex if needed
        shouminkan: false,  // default to false initially
      };

      // (I) Build partial newState
      let newState = {
        ...state,
        input: {
          ...state.input,
          hand: remainingHand,
          melds: [...state.input.melds, newKanMeld], // push kan into melds
          drawnTile: newDrawnTile, // either state.input.drawnTile or null
        },
        kanSelection: undefined,
        reactionPhase: false,
        currentTurn: 'watashi' as Seat,
        tenhouPhase: false,
        ippatsuPhase: false,
      };

      // (J) If open Kan => remove the discard tile from discardKey
      if (!isClosedKan && discardKey) {
        // Remove the discard tile from the  player's discard array
        const updatedDiscards = (state[discardKey] as Tile[]).slice(0, -1);
        newState = {
          ...newState,
          [discardKey]: updatedDiscards,
        };
      }

      // (K) Perform the “Kan draw” from wanpaiKan
      const drawnTileKan = state.wanpaiKan[0];
      const newWanpaiKan = state.wanpaiKan.slice(1);

      // (L) Move top tile from main wall to wanpaiHaitei
      const haiteihai = state.wall[0];
      const newWall = state.wall.slice(1);
      const newWanpaiHaitei = [...state.wanpaiHaitei, haiteihai];

      newState = {
        ...newState,
        wall: newWall,
        wanpaiKan: newWanpaiKan,
        wanpaiHaitei: newWanpaiHaitei,
        input: {
          ...newState.input,
          drawnTile: drawnTileKan, // user draws from Kan
        },
        rinshanKaihouPhase: true,
      };

      // (M) Reveal next Dora
      const i = newState.input.dora.length;
      if (newState.wanpaiDora && i < newState.wanpaiDora.length) {
        const nextDoraTile = newState.wanpaiDora[i];
        newState = {
          ...newState,
          input: {
            ...newState.input,
            dora: [...newState.input.dora, nextDoraTile],
          },
        };
      }

      // (N) If we have 5 total Dora => Suu Kaikan => roundOver
      if (newState.input.dora.length === 5) {
        newState = {
          ...newState,
          roundOver: true,
        };
      }

      // dora < 5 , push 
      return newState;
    }

    case 'call-riichi': {
      // 1) Extract the result from the payload
      const { result } = payload;  // typed as { result: Result }

      //console.log('[REDUCER] call-riichi'); //DEBUG

      const menzen = state.input.melds.every(m => m.type === 'kan' && m.closed);

      // 2) Basic validation checks
      if (
        !result || state.currentTurn !== 'watashi' ||
        state.wall.length < 5 ||
        result.type !== 'discard-shanten' ||
        !state.input.drawnTile ||
        state.handOptions.riichi !== 'none' ||
        state.riichiSelection === true ||
        !menzen  // blocks if there's any meld that is not a closed kan
      ) {
        return {
          ...state,
          riichiErrorMessage: "Cannot call riichi now"
        };
      }

      // 3) Collect discard tiles that lead to a winning shape
      //    (ignoring whether or not there's a "real yaku" – riichi itself is enough)
      const filteredTiles = result.discards.reduce((acc, { tile, next }) => {
        if (next.type === 'hora-shanten' && next.info.type === 'hora') {
          acc.push(tile);
        }
        return acc;
      }, [] as Tile[]);

      // 3) If no tiles found => no real yaku lines => can’t Riichi
      if (filteredTiles.length === 0) {
        return {
          ...state,
          riichiSelection: false,
          riichiErrorMessage: 'No valid Riichi discards with real yaku.'
        };
      }

      //console.log('call-riichi: final filteredTiles =>', filteredTiles); //DEBUG

      // 5) We store them in the state. 
      //    Because you only need the “tiles” to discard, you can keep just filteredTiles
      //    or you can store the full candidates if you want to do more logic on them.
      return {
        ...state,
        riichiSelection: true,
        approveRiichiDiscards: filteredTiles, // the tiles we can safely discard 
        riichiErrorMessage: undefined,
        mustDiscard: true
      };
    }

    case 'select-riichi-tile': {
      //console.log('=== select-riichi-tile CASE');

      // 1) If we have not in riichiSelection bail out,
      //    can only be in riichiSelection if successfully passed call-riichi case 
      if (state.riichiSelection === false) {
        console.warn('select-riichi-tile riichiSelection is false '); //DEBUG
        return {
          ...state,
          riichiErrorMessage: 'No valid Riichi discard in progress'
        };
      }

      const index = payload; // The tile index from your player's hand array
      // 2) Build your "full" hand + drawnTile
      //    so we can identify exactly which tile was clicked
      //console.log('select-riichi-tile payload index =', index); //DEBUG
      const fullHand = state.input.drawnTile
        ? [...state.input.hand, state.input.drawnTile]
        : [...state.input.hand];

      if (index < 0 || index >= fullHand.length) {
        return {
          ...state,
          riichiErrorMessage: 'Invalid tile index for Riichi selection'
        };
      }

      // convert index to tile 
      const selectedTile = fullHand[index];
      //console.log('selectedTile =', selectedTile);

      // 3) Check whether this selectedTile is in approveRiichiDiscards
      //    OR if it’s the drawnTile and also in that array
      const isApprovedDiscard = state.approveRiichiDiscards.some(
        (approved) => compareTiles(approved, selectedTile) === 0
      );
      //console.log('does tile match?', isApprovedDiscard); //

      if (!isApprovedDiscard) {
        return {
          ...state,
          riichiSelection: false,
          approveRiichiDiscards: [],   // clear or remove this array
          mustDiscard: false,
          riichiErrorMessage: 'That discard does not keep you in Tenpai'
        };
      }

      // 4) Remove that tile from the "fullHand"
      const newHand = fullHand.filter((_, i) => i !== index).sort(compareTiles);
      const discardedTile = selectedTile;

      // 5) Mark that we have declared riichi
      const nextTurn = getNextSeat(state.currentTurn);

      // 6) Determine whether it's a normal Riichi or Double Riichi.
      //    Commonly, double-riichi is only allowed if you haven’t made *any* discard yet.
      const riichiLevel = state.watashiDiscards.length === 0
        ? 'double-riichi'
        : 'riichi';

      //console.log('Discarding tile:', discardedTile, ' → Riichi declared as', riichiLevel); //DEBUG

      const RiichiDiscardIndex = state.watashiDiscards.length; // Correct index

      return {
        ...state,
        input: {
          ...state.input,
          hand: newHand,
          drawnTile: null, // you just discarded that tile (14th)
        },
        watashiDiscards: [...state.watashiDiscards, discardedTile],
        riichiSelection: false,
        approveRiichiDiscards: [],   // clear or remove this array
        mustDiscard: false,          // just discarded
        handOptions: {
          ...state.handOptions,
          riichi: riichiLevel
        },
        ippatsuPhase: true,   // can get ippatsu yaku if ron/tsumo before next discard
        riichiDiscardIndex: RiichiDiscardIndex,
        currentTurn: nextTurn,
        riichiErrorMessage: undefined
      };
    }

    case 'check-furiten': {
      const { result } = payload;

      if (!result || result.type !== 'hora-shanten' || result.info.type !== 'hora') {
        return state;
      }

      // Extract all winning tiles into an array
      const agariTiles = result.info.hora.map((line) => line.horaTile);

      // Check if any of the winning tiles match any of the discarded tiles
      const isFuriten = state.watashiDiscards.some(discardedTile =>
        agariTiles.some(agariTile =>
          compareTiles(agariTile, discardedTile) === 0
        )
      );

      // If there's a match, return state with furiten set to true
      if (isFuriten) {
        //console.log('furiten!')
        return { ...state, furiten: true };
      }

      // Otherwise, return the state unchanged
      return state;
    }

    case 'call-ron': {
      // 1) Must be reactionPhase and have a discardCheck tile
      if (!state.reactionPhase || !state.discardCheck) {
        return {
          ...state,
          ronErrorMessage: 'Cannot Ron',
        };
      }

      if (state.riichiFuriten) {
        return {
          ...state,
          ronErrorMessage: 'Riichi Furiten for the rest of the round.',
        };
      }

      if (state.tempFuriten) {
        return {
          ...state,
          ronErrorMessage: 'Temp Furiten for this turn.',
        };
      }

      if (state.furiten) {
        return {
          ...state,
          ronErrorMessage: 'Furiten due to your own discards.',
        };
      }

      // 2) Double-check we canRon
      const discardTile = state.discardCheck.tile;
      const { result } = payload;

      // If you have the same `canRon` helper used in 'store-discard':
      const ronCheck = canRon(state, discardTile, result);
      if (!ronCheck.canRon) {
        // If you want to reject the call with an error or just skip, do so here:
        return {
          ...state,
          ronErrorMessage: 'Cannot Ron upon double-check.',
        };
      }

      // 3) Identify which discard array to remove from
      const discardKey = `${state.discardCheck.fromPlayer}Discards` as keyof AppState;

      // 4) Remove the last tile from that discard array
      //    (assuming the last tile is indeed this discardTile)
      //    You can also do a safer approach: filter out the single matching tile
      //    but .slice(0, -1) is enough if you always expect the last discard
      const updatedDiscards = (state[discardKey] as Tile[]).slice(0, -1);

      // 5) Add that tile into Watashi’s hand (input.hand)
      const finalHand = [...state.input.hand, discardTile];

      // 6) Build new handOptions
      const newHandOptions = {
        ...state.handOptions,
        ron: true,                     // Now we declared Ron
        ippatsu: state.ippatsuPhase,   // If we’re in ippatsuPhase, set it
        haitei: state.wall.length === 0
      };

      const isFinalRound = state.table.roundCount === 4;

      return {
        ...state,
        // 7) Update all relevant fields
        input: {
          ...state.input,
          hand: finalHand
        },
        [discardKey]: updatedDiscards,
        reactionPhase: false,         // No further reactions after Ron
        roundOver: !isFinalRound,              // Round ends on Ron
        gameOver: isFinalRound,
        handOptions: newHandOptions,
        ippatsuPhase: false,          // Ippatsu is done once you Ron
        ronErrorMessage: undefined    // Clear error on success
      };
    }


    case 'call-tsumo': {
      if (state.currentTurn !== 'watashi') {
        return { ...state, tsumoErrorMessage: 'Cannot Tsumo, not your turn!' };
      }

      // 2) The last drawn tile is in state.input.drawnTile
      const lastDrawnTile = state.input.drawnTile;
      if (!lastDrawnTile) {
        return {
          ...state,
          tsumoErrorMessage: 'No tile to Tsumo!'
        };
      }

      // 3) Double-check we can Tsumo this tile (use the canTsumo helper)
      const { result } = payload; // e.g. the result of your “hora” check
      const tsumoCheck = canTsumo(state, lastDrawnTile, result);
      if (!tsumoCheck.canTsumo) {
        return {
          ...state,
          tsumoErrorMessage: 'Cannot Tsumo with that tile.'
        };
      }

      // Add the tile to your final winning hand
      const finalHand = [...state.input.hand, lastDrawnTile];

      //console.log('[REDUCER] call-tsumo → success, finalHand with tile:', lastDrawnTile);
      const isFinalRound = state.table.roundCount === 4;

      return {
        ...state,
        input: {
          ...state.input,
          hand: finalHand,
          drawnTile: null   // tile is now added to hand
        },
        reactionPhase: false,
        roundOver: !isFinalRound,
        gameOver: isFinalRound,
        handOptions: {
          ...state.handOptions,
          tsumo: true,
          ippatsu: state.ippatsuPhase ? true : false,
          rinshan: state.rinshanKaihouPhase ? true : false,
          tenhou: state.tenhouPhase ? true : false,
          haitei: state.wall.length === 0
        },
        tenhouPhase: false,
        ippatsuPhase: false,
        rinshanKaihouPhase: false,
        tsumoErrorMessage: undefined
      };
    }

    // in your reducer switch...
    case 'clear-error-message': {
      return {
        ...state,
        chiErrorMessage: undefined,
        ponErrorMessage: undefined,
        kanErrorMessage: undefined,
        riichiErrorMessage: undefined,
        ronErrorMessage: undefined,
        tsumoErrorMessage: undefined
      };
    }

    case 'escape-selection': {
      //console.log('escape button pressed')
      // If we are in riichiSelection mode, just cancel it and clear the potential discard list
      if (state.riichiSelection) {
        return {
          ...state,
          riichiSelection: false,
          approveRiichiDiscards: [],
          riichiErrorMessage: undefined,
          mustDiscard: false
        };
      }

      // Otherwise, if we're in the middle of Chi/Pon/Kan selection
      if (state.chiSelection || state.ponSelection || state.kanSelection) {
        const nextTurn = getNextSeat(state.currentTurn as Seat);

        return {
          ...state,
          currentTurn: nextTurn,
          chiSelection: undefined,
          ponSelection: undefined,
          kanSelection: undefined,
          chiErrorMessage: undefined, // optional, if you want to clear the error message too
          ponErrorMessage: undefined,
          kanErrorMessage: undefined,
          // Typically, when you cancel a reaction, it also ends reactionPhase
          reactionPhase: false,
        };
      }

      // If neither is in progress, just return state unchanged
      return state;
    }

    case 'log-shanten': {
      // 1) Extract the result from the payload
      const { result } = payload;

      // Helper that returns the current shanten value.
      // We use runtime checks to avoid explicit interface imports.
      function getCurrentShanten(res: any): number | null {
        if (!res) {
          return null;
        }

        if (res.type === 'hora-shanten') {
          if (res.info && res.info.type === 'hora') {
            return 0; // it is tempai so 0 shanten
          } else if (res.info && res.info.type === 'shanten') {
            return res.info.shanten;
          }
        }

        return null; // Default if not 'hora-shanten' or missing info.
      }

      // 2) Compute the current shanten.
      const currentShanten = getCurrentShanten(result);

      // Ensure state.shantenHistory is an array and replace null currentShanten with 0.
      const newShantenHistory = [...(state.shantenHistory ?? []), currentShanten ?? 0];

      // 3) Calculate the new average shanten.
      const newAvgShanten =
        newShantenHistory.length > 0
          ? newShantenHistory.reduce((sum, val) => sum + val, 0) /
          newShantenHistory.length
          : null;

      //console.log('shanten', currentShanten)
      //console.log('shantenarray', newShantenHistory)
      //console.log('avg shanten', newAvgShanten)
      return {
        ...state,
        shantenHistory: newShantenHistory,
        avgShanten: newAvgShanten,
      };
    }


    default:
      return state;
  } // closing of switch 
}; // closing of const ReduceImpl

// Exported Reducer Function with State Persistence
export const reducer: Reducer<AppState, Action> = (state, action) => {
  const newState = reducerImpl(state, action);
  localStorage.setItem(
    'store',
    JSON.stringify({ revision: 1, store: newState })
  );
  return newState;
};
