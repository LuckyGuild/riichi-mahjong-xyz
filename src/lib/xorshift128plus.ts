class Xoshiro128Plus {
    private state: Uint32Array;

    constructor(seed?: Uint32Array) {
        if (seed && seed.length === 4) {
            this.state = new Uint32Array(seed);
        } else {
            this.state = this.seedFromCrypto();
        }
    }

    // Seed the RNG using the browser's crypto object
    private seedFromCrypto(): Uint32Array {
        const seed = new Uint32Array(4);
        crypto.getRandomValues(seed);
        return seed;
    }

    // Serialize the seed for reproducibility
    getSeed(): Uint32Array {
        return this.state.slice(); // Return a copy of the seed
    }

    // Set the state to a specific seed
    setSeed(seed: Uint32Array): void {
        if (seed.length !== 4) {
            throw new Error("Seed must be an array of 4 unsigned 32-bit integers.");
        }
        this.state.set(seed);
    }

    // Rotate left
    private rotl(x: number, k: number): number {
        return ((x << k) | (x >>> (32 - k))) >>> 0; // Ensure unsigned
    }

    // Generate the next random number
    next(): number {
        const s0 = this.state[0];
        let s1 = this.state[1];
        const s2 = this.state[2];
        const s3 = this.state[3];

        const result = (s0 + s3) >>> 0; // Ensure unsigned addition

        s1 ^= s0;
        this.state[0] = (this.rotl(s0, 9) ^ s1 ^ (s1 << 11)) >>> 0; // Ensure unsigned
        this.state[1] = this.rotl(s1, 19) >>> 0;                   // Ensure unsigned
        this.state[2] = (s2 ^ s3) >>> 0;                          // Ensure unsigned
        this.state[3] = this.rotl(s3, 11) >>> 0;                  // Ensure unsigned

        return result / 0x100000000; // Return as a float between 0 and 1
    }
}

// Example usage:
const rng = new Xoshiro128Plus();
console.log("Random number:", rng.next());

// Save the seed
const seed = rng.getSeed();
console.log("Saved seed:", seed);

// Restore the state using the saved seed
const rng2 = new Xoshiro128Plus(seed);
console.log("Recreated random number:", rng2.next());
