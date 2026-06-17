/**
 * Freehub × rear-speed compatibility matrix (§9.4).
 *
 * PocketBase cannot evaluate this matrix in a query, so it is applied as a
 * post-fetch TS predicate in the checklist part picker (§9.5 two-step filter).
 *
 * The `standard` strings here must match the `freehub_standard` option values
 * in schemas/cassette.json and schemas/wheel.json exactly.
 */

export type RearSpeeds = '1' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

const MATRIX: Record<string, RearSpeeds[]> = {
  'Shimano HG': ['6', '7', '8', '9', '10'],
  'Shimano HG 11 (road)': ['11'],
  'Shimano Micro Spline': ['12'],
  'SRAM XD': ['11', '12'],
  'SRAM XDR': ['11', '12'],
  Campagnolo: ['9', '10', '11', '12'],
  'Single-speed freewheel': ['1'],
  Track: ['1'],
  'Flip-flop': ['1']
};

/** True if a freehub/hub standard supports the given rear-speed count. */
export function freehubCompatible(
  standard: string | undefined | null,
  rearSpeeds: string
): boolean {
  if (!standard) return false;
  const list = MATRIX[standard];
  if (!list) return false;
  return list.includes(rearSpeeds as RearSpeeds);
}

/** All freehub/hub standards compatible with a given rear-speed count. */
export function getCompatibleFreehubStandards(rearSpeeds: string): string[] {
  return Object.keys(MATRIX).filter((std) =>
    MATRIX[std].includes(rearSpeeds as RearSpeeds)
  );
}

/** All known freehub/hub standard names. */
export function allFreehubStandards(): string[] {
  return Object.keys(MATRIX);
}
