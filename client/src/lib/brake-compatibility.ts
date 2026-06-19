/**
 * Brake-type compatibility (§9.5 update).
 *
 * Brake type is no longer a configurator axis — it comes from the linked
 * **fork** (`brake_mount`, front) and **frame** (`brake_mount`, rear). These
 * helpers map between a fork/frame mount, a caliper `style`, and a wheel
 * `brake_type`, and emit PocketBase filter fragments for the pickers.
 *
 * Matching is by coarse "family" so the exact mount/style strings can evolve.
 * The substring tests tolerate both the current option labels and older ones
 * (e.g. "boss (canti/V-brake)").
 */

export type BrakeFamily = 'disc' | 'rim-boss' | 'rim-caliper' | 'none' | null;

/** Family of a fork/frame `brake_mount` value. */
export function mountFamily(mount?: string | null): BrakeFamily {
  if (!mount) return null;
  const m = mount.toLowerCase();
  if (m.includes('disc')) return 'disc';
  if (m.includes('boss') || m.includes('canti') || m.includes('v-brake')) return 'rim-boss';
  if (m.includes('caliper') || m.includes('center')) return 'rim-caliper';
  if (m === 'none') return 'none';
  return null;
}

/** Family of a brake-caliper `style` value. */
export function caliperStyleFamily(style?: string | null): BrakeFamily {
  if (!style) return null;
  const s = style.toLowerCase();
  if (s.includes('disc')) return 'disc';
  if (s.includes('cantilever') || s.includes('v-brake')) return 'rim-boss';
  if (s.includes('caliper') || s.includes('center')) return 'rim-caliper';
  return null;
}

/** PB filter fragment selecting calipers compatible with a fork/frame mount. */
export function caliperFilterForMount(mount?: string | null): string | null {
  switch (mountFamily(mount)) {
    case 'disc':
      return "attributes.style~'disc'";
    case 'rim-boss':
      return "(attributes.style~'cantilever' || attributes.style~'v-brake')";
    case 'rim-caliper':
      return "(attributes.style~'caliper' || attributes.style~'center-pull')";
    default:
      return null; // unknown or 'none' -> no extra constraint
  }
}

/** PB filter fragment selecting forks/frames compatible with a caliper style. */
export function mountFilterForCaliperStyle(style?: string | null): string | null {
  switch (caliperStyleFamily(style)) {
    case 'disc':
      return "attributes.brake_mount~'disc'";
    case 'rim-boss':
      return "attributes.brake_mount~'boss'";
    case 'rim-caliper':
      return "attributes.brake_mount~'caliper'";
    default:
      return null;
  }
}

/** PB filter fragment selecting wheels matching a fork/frame mount's brake type. */
export function wheelBrakeTypeFilterForMount(mount?: string | null): string | null {
  const fam = mountFamily(mount);
  if (fam === 'disc') return "attributes.brake_type~'disc'";
  if (fam === 'rim-boss' || fam === 'rim-caliper') return "attributes.brake_type~'rim'";
  return null;
}
