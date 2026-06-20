/**
 * Part-to-part associations (§ crankset spider/chainrings).
 *
 * Some part types reference OTHER parts in the inventory by a typed role —
 * e.g. a crankset's chainring(s) and its (optional) spider. Associations are
 * stored on the owning part record as a JSON map `{ [role]: partId[] }` and are
 * edited on that part's page. Role config below is the single source of truth.
 */
export interface AssociationRole {
  /** Stored key in the `associations` map. */
  role: string;
  /** UI label. */
  label: string;
  /** Part type_id candidates must have. */
  targetType: string;
  /** false = at most one associated part; true = many. */
  multiple: boolean;
  hint?: string;
}

export const ASSOCIATION_ROLES: Record<string, AssociationRole[]> = {
  crankset: [
    {
      role: 'spider',
      label: 'Spider',
      targetType: 'spider',
      multiple: false,
      hint: 'For direct-mount cranks fitted with a removable spider.'
    },
    {
      role: 'chainring',
      label: 'Chainring(s)',
      targetType: 'chainring',
      multiple: true,
      hint: 'The chainring(s) fitted to this crank — direct-mount or spider-mounted.'
    }
  ]
};

export function rolesForType(typeId: string): AssociationRole[] {
  return ASSOCIATION_ROLES[typeId] ?? [];
}

/** Normalise a stored associations value into `{ [role]: partId[] }`. */
export function normalizeAssociations(
  raw: unknown,
  typeId: string
): Record<string, string[]> {
  const roles = rolesForType(typeId);
  const out: Record<string, string[]> = {};
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const r of roles) {
    const v = src[r.role];
    const ids = (Array.isArray(v) ? v : v == null ? [] : [v])
      .map((x) => String(x))
      .filter(Boolean);
    out[r.role] = r.multiple ? ids : ids.slice(0, 1);
  }
  return out;
}
