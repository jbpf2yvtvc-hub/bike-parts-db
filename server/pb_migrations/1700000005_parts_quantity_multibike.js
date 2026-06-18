/// <reference path="../pb_data/types.d.ts" />

// Add `quantity` to parts and convert the single `bike` relation into a
// multi-relation `bikes` (a part with quantity N can be installed on up to N
// bikes; the per-quantity cap is enforced in app code). Existing single-bike
// assignments are migrated into the new array.
migrate(
  (app) => {
    const parts = app.findCollectionByNameOrId('parts');
    const bikes = app.findCollectionByNameOrId('bikes');

    parts.fields.add(new NumberField({ name: 'quantity', onlyInt: true, min: 1, required: true }));
    parts.fields.add(
      new RelationField({
        name: 'bikes',
        collectionId: bikes.id,
        cascadeDelete: false,
        maxSelect: 99
      })
    );
    app.save(parts);

    // Backfill: copy bike -> bikes, default quantity to 1.
    const records = app.findRecordsByFilter('parts', "id != ''", '', 1000, 0);
    for (const r of records) {
      const current = r.get('bike');
      if (current) r.set('bikes', [current]);
      if (!r.get('quantity')) r.set('quantity', 1);
      app.save(r);
    }

    parts.fields.removeByName('bike');
    app.save(parts);
  },
  (app) => {
    const parts = app.findCollectionByNameOrId('parts');
    const bikes = app.findCollectionByNameOrId('bikes');

    parts.fields.add(
      new RelationField({
        name: 'bike',
        collectionId: bikes.id,
        cascadeDelete: false,
        maxSelect: 1
      })
    );
    app.save(parts);

    const records = app.findRecordsByFilter('parts', "id != ''", '', 1000, 0);
    for (const r of records) {
      const arr = r.get('bikes');
      if (arr && arr.length) r.set('bike', arr[0]);
      app.save(r);
    }

    parts.fields.removeByName('bikes');
    parts.fields.removeByName('quantity');
    app.save(parts);
  }
);
