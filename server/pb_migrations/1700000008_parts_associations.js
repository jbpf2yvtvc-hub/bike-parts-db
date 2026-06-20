/// <reference path="../pb_data/types.d.ts" />

// Add `associations` to parts: a JSON map { [role]: partId[] } of part-to-part
// references (e.g. a crankset's spider and chainrings). Roles are defined in
// client/src/lib/associations.ts. Defaults to {} for existing records.
migrate(
  (app) => {
    const parts = app.findCollectionByNameOrId('parts');
    parts.fields.add(new JSONField({ name: 'associations', maxSize: 100000 }));
    app.save(parts);

    const records = app.findRecordsByFilter('parts', "id != ''", '', 1000, 0);
    for (const r of records) {
      if (r.get('associations') == null) {
        r.set('associations', {});
        app.save(r);
      }
    }
  },
  (app) => {
    const parts = app.findCollectionByNameOrId('parts');
    parts.fields.removeByName('associations');
    app.save(parts);
  }
);
