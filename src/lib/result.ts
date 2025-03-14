// src/lib/result.ts
import {
  generateChitoitsuHora,
  generateHora,
  generateKokushiHora,
  uniqueHoras,
  type Hora
} from './hora';
import { type HandOptions, type Input } from './input';
import {
  compareTiles,
  countsIndexToTile,
  tileAvailableCount,
  tilesToCounts,
  type Tile,
  type TileAvailability,
  type TileCountsIndex
} from './tile';
import {
  chitoitsuShantenTiles,
  countChitoitsuShanten,
  countKokushiShanten,
  kokushiShantenTiles,
  minShanten,
  shantenTiles,
  waitingTiles
} from './tile/shanten';
import { countBy, minsBy, uniqueSorted } from './util';
import type { Rule } from './rule';
import type { Table } from './table';

interface HoraInfo {
  type: 'hora';
  hora: Hora[];
}

interface ShantenInfo {
  type: 'shanten';
  shanten: number;
  tileAvailabilities: TileAvailability[];
}

export interface Discard {
  tile: Tile;
  next: HoraShanten | Tempai;
}

interface HoraShanten {
  type: 'hora-shanten';
  info: HoraInfo | ShantenInfo;
}

interface DiscardShanten {
  type: 'discard-shanten';
  discards: Discard[];
}

interface Tempai {
  type: 'tempai';
  tileAvailabilities: TileAvailability[];
}

interface JustHora {
  type: 'just-hora';
}

export type Result = HoraShanten | DiscardShanten | Tempai | JustHora | null;

// called in mahjonglayout.tsx line 778
// called in this file line 257
// called in this file line
// called in this file line 
export const generateResult = (
  table: Table,
  input: Input,
  handOptions: HandOptions,
  rule: Rule,
  allDiscards: Tile[]
): Result => {

  // Combine hand + drawnTile if present.
  const combinedHand = input.drawnTile
    ? [...input.hand, input.drawnTile]
    : [...input.hand];

  // 3,6,9,12 length
  // Early returns for invalid states
  //
  if (combinedHand.length % 3 === 0 || combinedHand.length > 18) return null;

  const handCounts = tilesToCounts(combinedHand);
  const meldTiles = input.melds.flatMap(m => m.tiles);
  const handAndMelds = [...combinedHand, ...meldTiles];
  const allInputTiles = [...handAndMelds, ...input.dora, ...allDiscards];
  const handAndMeldsCounts = tilesToCounts(handAndMelds);
  const tileCountsIndexToTileAvailabilities = (index: TileCountsIndex) => {
    const tile = countsIndexToTile(index);
    if (tile.type !== 'z' && tile.n === 5) {
      return [false, true].flatMap(red => {
        const t = {
          ...tile,
          red
        };
        const c = tileAvailableCount(rule.red, allInputTiles, t);
        return c === null ? [] : [{ tile: t, count: c } as TileAvailability];
      });
    }
    return [
      {
        tile,
        count: tileAvailableCount(rule.red, allInputTiles, tile)
      } as TileAvailability
    ];
  };

  // no drawn tile, 
  // 1 mod 3 = 1
  // 4 mod 3 = 1
  // 7 mod 3 = 1
  //10 mod 3 = 1
  //13 mod 3 = 1
  if (combinedHand.length % 3 === 1) {
    const { shanten, results } = minShanten(
      tilesToCounts(combinedHand),
      ((14 - combinedHand.length - 1) / 3) as 0 | 1 | 2 | 3 | 4
    );

    // no melds and no drawn tile 
    if (combinedHand.length === 13) {
      const chitoitsuShanten = countChitoitsuShanten(handCounts);
      const kokushiShanten = countKokushiShanten(handCounts);
      if (shanten === 0 || chitoitsuShanten === 0 || kokushiShanten === 0) {
        const horas = [
          ...(shanten === 0
            ? generateHora(table, handOptions, results, input, rule)
            : []),
          ...(chitoitsuShanten === 0
            ? generateChitoitsuHora(
              table,
              combinedHand,
              handOptions,
              input.dora,
              rule
            )
            : []),
          ...(kokushiShanten === 0
            ? generateKokushiHora(table, handCounts, handOptions, rule)
            : [])
        ];
        return {
          type: 'hora-shanten',
          info: {
            type: 'hora',
            hora: uniqueHoras(horas, rule)
          }
        };
      }
      const min = Math.min(shanten, chitoitsuShanten, kokushiShanten);
      return {
        type: 'hora-shanten',
        info: {
          type: 'shanten',
          shanten: min,
          tileAvailabilities: uniqueSorted(
            [
              ...(shanten === min
                ? shantenTiles(results, handAndMeldsCounts, 0).flatMap(
                  tileCountsIndexToTileAvailabilities
                )
                : []),
              ...(chitoitsuShanten === min
                ? chitoitsuShantenTiles(handCounts).flatMap(
                  tileCountsIndexToTileAvailabilities
                )
                : []),
              ...(kokushiShanten === min
                ? kokushiShantenTiles(handCounts).flatMap(
                  tileCountsIndexToTileAvailabilities
                )
                : [])
            ].sort((a, b) => compareTiles(a.tile, b.tile)),
            (a, b) => compareTiles(a.tile, b.tile) === 0
          )
        }
      };
    }

    // no drawntile but has melds
    // 1hand + 4melds*3 = 13
    // 4hand + 3melds*3 = 13
    // 7hand + 2melds*3 = 13
    // 10hand + 1meld*3 = 13
    // 13 hand + 0meld  = 13
    if (
      combinedHand.length + countBy(input.melds, m => m.tiles.length > 0) * 3 ===
      13
    ) {
      if (shanten === 0) {
        return {
          type: 'hora-shanten',
          info: {
            type: 'hora',
            hora: uniqueHoras(
              generateHora(table, handOptions, results, input, rule),
              rule
            )
          }
        };
      }
      return {
        type: 'hora-shanten',
        info: {
          type: 'shanten',
          shanten,
          tileAvailabilities: shantenTiles(
            results,
            handAndMeldsCounts,
            input.melds.length as 0 | 1 | 2 | 3 | 4
          ).flatMap(tileCountsIndexToTileAvailabilities)
        }
      };
    }
    if (shanten === 0) {
      return {
        type: 'tempai',
        tileAvailabilities: waitingTiles(results, handAndMeldsCounts).flatMap(
          tileCountsIndexToTileAvailabilities
        )
      };
    }
    return {
      type: 'hora-shanten',
      info: {
        type: 'shanten',
        shanten,
        tileAvailabilities: shantenTiles(
          results,
          handAndMeldsCounts,
          ((14 - combinedHand.length - 1) / 3) as 0 | 1 | 2 | 3 | 4
        ).flatMap(tileCountsIndexToTileAvailabilities)
      }
    };
  }

  // without drawn tile after chi or pon amd mustDiscard: true
  // 2 mod 3 = 2
  // 5 mod 3 = 2
  // 8 mod 3 = 2
  //11 mod 3 = 2
  //14 mod 3 = 2
  if (input.hand.length % 3 === 2 && !input.drawnTile) {
    const [handWithoutLast, last] = (() => {
      const a = [...input.hand];
      const b = a.pop();
      if (typeof b === 'undefined') throw new Error();
      return [a, b];
    })();
    const result = generateResult(
      table,
      { ...input, hand: handWithoutLast },
      handOptions,
      rule,
      allDiscards
    );
    if (
      result === null ||
      (result.type !== 'hora-shanten' && result.type !== 'tempai')
    )
      throw new Error();

    if (result.type === 'hora-shanten' && result.info.type === 'hora') {
      const h = result.info.hora.filter(
        h => compareTiles(h.horaTile, last) === 0
      );
      if (h.length > 0) {
        return {
          type: 'hora-shanten',
          info: {
            type: 'hora',
            hora: h
          }
        };
      }
    }
    if (
      result.type === 'tempai' &&
      result.tileAvailabilities.some(a => compareTiles(a.tile, last) === 0)
    ) {
      return { type: 'just-hora' };
    }

    const discardCandidates = uniqueSorted(
      handWithoutLast,
      (a, b) => compareTiles(a, b) === 0
    ).filter(t => compareTiles(t, last) !== 0);

    const discards = [
      ...discardCandidates.map(t => {
        const hand = [...input.hand];
        hand.splice(
          hand.findIndex(h => compareTiles(h, t) === 0),
          1
        );
        const r = generateResult(table, { ...input, hand }, handOptions, rule, allDiscards);
        if (r === null || (r.type !== 'hora-shanten' && r.type !== 'tempai'))
          throw new Error();

        return { tile: t, next: r };
      }),
      { tile: last, next: result }
    ];
    const [, best] = minsBy(discards, d =>
      d.next.type === 'tempai' || d.next.info.type === 'hora'
        ? 0
        : d.next.info.shanten
    );
    return { type: 'discard-shanten', discards: best };
  }

  // with drawn tile
  // 2 mod 3 = 2
  // 5 mod 3 = 2
  // 8 mod 3 = 2
  //11 mod 3 = 2
  //14 mod 3 = 2
  if (combinedHand.length % 3 === 2 && input.drawnTile) {
    // 1) Let’s handle the scenario of discarding the "last" tile 
    //    (which we pretend is the drawnTile). This logic is from your 
    //    original approach, but we’ll rename variables for clarity:

    // a) Pretend we discarding drawnTile 
    //    "14th" tile results in a winning or improved hand:
    // handWithoutLast = input.hand => 13 tiles
    // lastTile = input.drawnTile => 1 tile, had to exist combinedHand.length % 3 === 2
    const [handWithoutLast, lastTile] = [input.hand, input.drawnTile];


    // Now we simulate discarding drawnTile
    //    building a new 13-tile Input: drawnTile = null, hand = handWithoutLast = input.hand
    const discardDrawnTileInput = {
      ...input,
      hand: handWithoutLast,
      drawnTile: null,
    };
    // recursive (a)
    const discardDrawnTileResult = generateResult(
      table,
      discardDrawnTileInput,
      handOptions,
      rule,
      allDiscards
    );

    // If that recursion says we have a "hora"/yaku
    if (
      discardDrawnTileResult === null ||
      (discardDrawnTileResult.type !== 'hora-shanten' &&
        discardDrawnTileResult.type !== 'tempai')
    ) {
      throw new Error('Discarding the drawnTile leads to invalid state?');
    }

    // we might return early with { type: 'hora-shanten', info: { ... } }
    if (
      discardDrawnTileResult.type === 'hora-shanten' &&
      discardDrawnTileResult.info.type === 'hora'
    ) {
      // E.g. see if lastTile was the winning tile
      const matching = discardDrawnTileResult.info.hora.filter(h =>
        compareTiles(h.horaTile, lastTile) === 0
      );
      if (matching.length > 0) {
        // We can form a Mentsu Hora discarding exactly the drawn tile
        return {
          type: 'hora-shanten',
          info: {
            type: 'hora',
            hora: matching
          }
        };
      }
    }
    if (
      discardDrawnTileResult.type === 'tempai' &&
      discardDrawnTileResult.tileAvailabilities.some(a =>
        compareTiles(a.tile, lastTile) === 0
      )
    ) {
      return { type: 'just-hora' };
    }

    // 2) Now handle discarding *any tile from input.hand*:
    //    (not the drawn tile).
    const discards: Discard[] = [];

    // We'll gather all unique “hand” tiles, ignoring duplicates
    const uniqueHandTiles = uniqueSorted(
      input.hand,
      (x, y) => compareTiles(x, y) === 0
    );

    // b) For each tile in the hand, build a new input 
    //    that splices that tile out but keeps drawnTile
    for (const t of uniqueHandTiles) {
      const newHand = [...input.hand];
      const idx = newHand.findIndex(h => compareTiles(h, t) === 0);
      if (idx < 0) continue; // sanity check
      newHand.splice(idx, 1); // remove that tile => 12 in the array

      const discardHandTileInput = {
        ...input,
        hand: newHand,            // 12 in hand
        drawnTile: input.drawnTile, // still 1 => total 13
      };
      // recursive (b)
      const nextResult = generateResult(table, discardHandTileInput, handOptions, rule, allDiscards);
      if (
        nextResult === null ||
        (nextResult.type !== 'hora-shanten' && nextResult.type !== 'tempai')
      ) {
        throw new Error('Discarding a tile from hand leads to invalid state?');
      }

      discards.push({ tile: t, next: nextResult });
    }

    // 3) add the drawntile to the discard option UI
    discards.push({ tile: lastTile, next: discardDrawnTileResult });

    // 4) Evaluate all discards → choose best
    const [, best] = minsBy(discards, d =>
      d.next.type === 'tempai' || d.next.info.type === 'hora'
        ? 0
        : d.next.info.shanten
    );

    // 5) Return the best discard-shanten
    return { type: 'discard-shanten', discards: best };
  }

  // if none matched => throw error
  throw new Error('Unreachable: 14-tile logic ended unexpectedly?');

};