export function seededRandom(seed: number): () => number {
  let localSeed = seed;

  return () => {
    const x = Math.sin(localSeed++ * 9999) * 10000;
    return x - Math.floor(x);
  };
}
