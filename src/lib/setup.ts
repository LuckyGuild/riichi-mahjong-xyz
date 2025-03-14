// lib/setup.ts
import type { Tile } from './tile';
import type { Rule } from './rule';
import type { Wind } from './table';
import seedrandom from 'seedrandom';
import { product2 } from './util';

interface InitializedRound {
    seed: string;
    dice1: number;
    dice2: number;
    liveWallCut: number;
    wall: Tile[];
    wanpaiKan: Tile[];
    wanpaiDora: Tile[];
    wanpaiUradora: Tile[];
    doraIndicator: Tile[];
    eastHand: Tile[];
    southHand: Tile[];
    westHand: Tile[];
    northHand: Tile[];
}

const shuffle = <T>(array: T[], rng: () => number): T[] => {
    const ret = [...array];
    for (let i = ret.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [ret[i], ret[j]] = [ret[j], ret[i]];
    }
    return ret;
};


/**
 * Initializes a new round by creating and shuffling the wall, determining the
 * dead wall and dora indicator, unwinding the wall, and dealing tiles to players.
 * Returns all round-setup data so the reducer can store it in state.
 */
export function initializeRound(red: Rule['red'], seed?: string): InitializedRound {
    /// If no seed is provided, we'll generate one based solely on the current timestamp
    if (!seed) {
        // Use Date.now() for seed variability without Math.random()
        seed = `seed-${Date.now()}`;
    }

    // Log the seed so you know what seed was used this round
    //console.log(`Initializing new round with seed: ${seed}`);

    // Create RNG using the seed
    const rng = seedrandom(seed);

    // Create and shuffle initial wall
    const wall = shuffle([
        ...product2(['m', 'p', 's'], [1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap(
            ([type, n]) => {
                if (n === 5) {
                    return Array.from({ length: 4 }, (_, i) => ({
                        type,
                        n,
                        red: i < red[type as keyof Rule['red']]
                    })) as Tile[];
                }
                return Array.from({ length: 4 }, () => ({ type, n } as Tile));
            }
        ),
        ...[1, 2, 3, 4, 5, 6, 7].flatMap(n =>
            Array.from({ length: 4 }, () => ({ type: 'z', n } as Tile))
        )
    ], rng);

    // Split the wall into four walls
    const walls: Tile[][][] = [];
    for (let i = 0; i < 4; i++) {
        const wallSection = wall.splice(0, 34);
        const wallStacks: Tile[][] = [];
        for (let j = 0; j < 17; j++) {
            const stack = wallSection.splice(0, 2);
            wallStacks.push(stack);
        }
        walls.push(wallStacks);
    }
    // each walls is 17x2

    // Roll the dice
    const diceRoll = () => Math.floor(rng() * 6) + 1;
    const dice1 = diceRoll();
    const dice2 = diceRoll();
    const nDice = dice1 + dice2;

    const startingWallIndex = ((nDice % 4) + 3) % 4;
    const breakPairIndex = 17 - nDice;

    // Collect the Dead Wall
    const deadWall: Tile[][] = [];
    let currentWallIndex = startingWallIndex;
    let currentPairIndex = breakPairIndex;

    // Track the wall from which we last removed a stack.
    let lastWallIndexUsed = currentWallIndex;

    for (let i = 0; i < 7; i++) {
        // If the current wall is empty, that's an error.
        if (walls[currentWallIndex].length === 0) {
            throw new Error(`Wall ${currentWallIndex} is empty when attempting to remove a dead wall stack.`);
        }
        // Remove one stack (a pair of tiles) from the current wall at currentPairIndex.
        const removed = walls[currentWallIndex].splice(currentPairIndex, 1);
        if (removed.length === 0) {
            throw new Error(`Failed to remove a stack from wall ${currentWallIndex} at index ${currentPairIndex}.`);
        }
        const pair = removed[0];
        deadWall.push(pair);
        // Record the wall from which we just removed a stack.
        lastWallIndexUsed = currentWallIndex;
        // If currentPairIndex is now beyond the length of the current wall, 
        // move to the next wall for subsequent removals.
        if (currentPairIndex >= walls[currentWallIndex].length) {
            currentWallIndex = (currentWallIndex + 1) % 4;
            currentPairIndex = 0;
        }
    }

    // After removal, the "last touched wall" is walls[lastWallIndexUsed].
    // Its shape is determined by how many stacks remain in that wall.
    const liveWallCut = walls[lastWallIndexUsed].length;

    // wanpaiKan used for Kan draws
    const wanpaiKan: Tile[] = [
        deadWall[1][1],
        deadWall[1][0],
        deadWall[0][1],
        deadWall[0][0]
    ];

    // wanpaiDora used for dora 
    const wanpaiDora: Tile[] = [
        deadWall[2][0],
        deadWall[3][0],
        deadWall[4][0],
        deadWall[5][0],
        deadWall[6][0]
    ];

    // wanpaiUradora used for Uradora
    const wanpaiUradora: Tile[] = [
        deadWall[2][1],
        deadWall[3][1],
        deadWall[4][1],
        deadWall[5][1],
        deadWall[6][1]
    ];

    // Dora Indicator Tile
    const doraIndicator = [wanpaiDora[0]];

    // Unwind walls into wall
    wall.length = 0;
    currentWallIndex = startingWallIndex;
    currentPairIndex = breakPairIndex - 1;

    if (currentPairIndex < 0) {
        currentWallIndex = (currentWallIndex - 1 + 4) % 4;
        currentPairIndex = walls[currentWallIndex].length - 1;
    }

    while (true) {
        const wallsAreEmpty = walls.every(w => w.length === 0);
        if (wallsAreEmpty) break;

        while (walls[currentWallIndex].length === 0) {
            currentWallIndex = (currentWallIndex - 1 + 4) % 4;
            if (walls.every(w => w.length === 0)) break;
        }

        if (walls[currentWallIndex].length === 0) break;

        if (currentPairIndex < 0) {
            currentWallIndex = (currentWallIndex - 1 + 4) % 4;
            while (walls[currentWallIndex].length === 0) {
                currentWallIndex = (currentWallIndex - 1 + 4) % 4;
                if (walls.every(w => w.length === 0)) break;
            }
            if (walls[currentWallIndex].length === 0) break;
            currentPairIndex = walls[currentWallIndex].length - 1;
        }

        const pair = walls[currentWallIndex][currentPairIndex];
        if (pair.length === 2) {
            const tile1 = pair[1];
            const tile0 = pair[0];
            wall.unshift(tile1, tile0);
        }

        if (pair.length === 2) {
            walls[currentWallIndex].splice(currentPairIndex, 1);
        }

        currentPairIndex--;
    }

    // Deal hands
    const eastHand: Tile[] = [];
    const southHand: Tile[] = [];
    const westHand: Tile[] = [];
    const northHand: Tile[] = [];

    const hands = [eastHand, southHand, westHand, northHand];

    for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 4; i++) {
            const tiles = wall.splice(0, 4);
            hands[i].push(...tiles);
        }
    }

    for (let i = 0; i < 4; i++) {
        const tile = wall.splice(0, 1)[0];
        if (tile) {
            hands[i].push(tile);
        }
    }

    const totalTiles = wall.length + wanpaiKan.length + wanpaiDora.length + wanpaiUradora.length +
        eastHand.length + southHand.length + westHand.length + northHand.length;

    if (totalTiles !== 136) {
        console.error(`Expected 136 tiles, but found ${totalTiles}`);
    }

    return {
        seed,
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
    };
}

/**
 * Given watashi's seat (randomSeat or nextSeat), and the known seat order,
 * returns both the watashiHand (unsorted) and the currentTurn player based on who is East.
 * 
 * @param seatOrder Array of winds in fixed order: ['east', 'south', 'west', 'north']
 * @param watashiSeat The wind assigned to Watashi ('east', 'south', 'west', or 'north')
 * @param hands An array of hands in order [eastHand, southHand, westHand, northHand]
 * @returns { watashiHand: Tile[], currentTurn: 'watashi' | 'shimocha' | 'toimen' | 'kamicha' }
 */
export function assignHandsAndCurrentTurn(
    seatWinds: Wind[], //['east', 'south', 'west', 'north']
    watashiSeat: Wind, // randomSeat= one from 'east', 'south', 'west', 'north'
    hands: [Tile[], Tile[], Tile[], Tile[]] // [eastHand, southHand, westHand, northHand]
): {
    watashi: Tile[];
    shimocha: Tile[];
    toimen: Tile[];
    kamicha: Tile[];
    currentTurn: 'watashi' | 'shimocha' | 'toimen' | 'kamicha';
} {
    // 1) Find the index of Watashi's seat among seatWinds
    const watashiIndex = seatWinds.indexOf(watashiSeat);
    // e.g. if watashiSeat='north' => watashiIndex=3

    // 2) Build a small lookup that says which seatIndex => which label
    // seatIndex  (mod 4) => 'watashi' | 'shimocha' | 'toimen' | 'kamicha'
    const seatMapping: {
        [index: number]: 'watashi' | 'shimocha' | 'toimen' | 'kamicha';
    } = {};

    seatMapping[watashiIndex] = 'watashi';
    seatMapping[(watashiIndex + 1) % 4] = 'shimocha';
    seatMapping[(watashiIndex + 2) % 4] = 'toimen';
    seatMapping[(watashiIndex + 3) % 4] = 'kamicha';

    // 3) seatIndex 0 is East => currentTurn is seatMapping[0].
    //    This tells us who is "East" right now in label form.
    const currentTurn = seatMapping[0];

    // 4) Build the final object in one pass:
    //    - watashi is hands[watashiIndex]
    //    - shimocha is hands[(watashiIndex+1)%4]
    //    - etc.
    const result = {
        watashi: hands[watashiIndex],
        shimocha: hands[(watashiIndex + 1) % 4],
        toimen: hands[(watashiIndex + 2) % 4],
        kamicha: hands[(watashiIndex + 3) % 4],
        currentTurn
    };

    return result;
}
