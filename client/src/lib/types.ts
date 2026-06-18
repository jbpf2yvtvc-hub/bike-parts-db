/** Shared record shapes (mirror the PocketBase collections in §5.2). */

export type Disposition = 'keep' | 'for_sale' | 'donate' | 'unknown';

export const DISPOSITIONS: { value: Disposition; label: string }[] = [
  { value: 'keep', label: 'Keep' },
  { value: 'for_sale', label: 'For sale' },
  { value: 'donate', label: 'Donate' },
  { value: 'unknown', label: 'Unknown' }
];

export interface PartRecord {
  id: string;
  owner: string;
  type_id: string;
  attributes: Record<string, any>;
  quantity?: number;
  // Bikes this part is installed on (multi-relation; at most `quantity` of them).
  bikes?: string[];
  disposition: Disposition;
  acquisition_date?: string;
  acquisition_price?: number;
  asking_price?: number;
  tags?: string;
  created?: string;
  updated?: string;
  // expanded relations (PocketBase `expand`)
  expand?: { bikes?: BikeRecord[] };
}

export interface BikeRecord {
  id: string;
  owner: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  notes?: string;
  is_active?: boolean;
  created?: string;
  updated?: string;
}

export interface ChecklistProgressRecord {
  id: string;
  bike: string;
  owner: string;
  config: Record<string, string>;
  checked_items: string[];
  part_links: Record<string, string>;
}
