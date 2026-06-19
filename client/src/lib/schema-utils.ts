/**
 * Schema engine (§6.1).
 *
 * Part-type schemas are JSON files in src/lib/schemas (generated from the
 * canonical /schemas via `npm run sync:schemas`). They drive:
 *   - server-side form rendering (field config)
 *   - Zod validation
 *   - the search `tags` index (searchable fields)
 *   - the checklist compatibility filters (option values)
 *
 * Adding a new part type = add a JSON file + redeploy. No backend change.
 */
import { z } from 'zod';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'relation';

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  searchable?: boolean;
  hint?: string;
  inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search';
  autocomplete?: string;
  options?: string[];
  /** Conditionally show this field only when another field's value matches.
   *  Enforced reactively when JS is on; with no JS the field always shows. */
  showWhen?: { field: string; in: string[] };
}

export interface PartSchema {
  type_id: string;
  label: string;
  fields: FieldDef[];
}

// Eagerly import every part-type schema at build time.
const modules = import.meta.glob<{ default: PartSchema }>('./schemas/*.json', {
  eager: true
});

const schemas: Record<string, PartSchema> = {};
for (const path in modules) {
  const schema = modules[path].default;
  schemas[schema.type_id] = schema;
}

/** All schemas, sorted by label, for the type picker. */
export function listSchemas(): PartSchema[] {
  return Object.values(schemas).sort((a, b) => a.label.localeCompare(b.label));
}

export function getSchema(typeId: string): PartSchema | undefined {
  return schemas[typeId];
}

export function getLabel(typeId: string): string {
  return schemas[typeId]?.label ?? typeId;
}

/** Build a Zod schema for the `attributes` of a given part type. */
export function schemaToZod(schema: PartSchema): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of schema.fields) {
    let validator: z.ZodTypeAny;

    switch (field.type) {
      case 'number':
        validator = z
          .union([z.literal(''), z.coerce.number()])
          .transform((v) => (v === '' ? undefined : v));
        break;
      case 'boolean':
        // HTML checkboxes submit "on"/"true" when checked, nothing when not.
        validator = z
          .union([z.boolean(), z.string()])
          .transform((v) => v === true || v === 'on' || v === 'true');
        break;
      case 'multiselect':
        validator = z.array(z.string()).default([]);
        break;
      case 'select':
        validator = field.options
          ? z.union([z.literal(''), z.enum(field.options as [string, ...string[]])])
          : z.string();
        break;
      default:
        validator = z.string();
    }

    if (field.required) {
      if (field.type === 'number') {
        validator = z.coerce.number({ message: `${field.label} is required` });
      } else if (field.type === 'boolean') {
        // a required boolean just stays boolean
      } else if (field.type === 'multiselect') {
        validator = z.array(z.string()).min(1, `${field.label} is required`);
      } else {
        validator = z.string().min(1, `${field.label} is required`);
      }
    } else if (field.type !== 'multiselect' && field.type !== 'boolean') {
      validator = validator.optional();
    }

    shape[field.id] = validator;
  }

  return z.object(shape);
}

/**
 * Build the searchable `tags` string for a part: concatenation of every
 * searchable attribute value, rebuilt on save (§6.2). Keeps search filterable
 * server-side via PocketBase's `tags ~ 'q'`.
 */
export function buildTags(schema: PartSchema, attributes: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const field of schema.fields) {
    if (!field.searchable) continue;
    const value = attributes[field.id];
    if (value == null || value === '') continue;
    if (Array.isArray(value)) parts.push(value.join(' '));
    else parts.push(String(value));
  }
  return parts.join(' ').toLowerCase();
}

/** Parse a submitted FormData into a raw attributes object for a schema. */
export function readAttributes(schema: PartSchema, form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.type === 'multiselect') {
      out[field.id] = form.getAll(`attr.${field.id}`).map(String);
    } else if (field.type === 'boolean') {
      out[field.id] = form.has(`attr.${field.id}`);
    } else {
      const v = form.get(`attr.${field.id}`);
      out[field.id] = v == null ? '' : String(v);
    }
  }
  return out;
}
