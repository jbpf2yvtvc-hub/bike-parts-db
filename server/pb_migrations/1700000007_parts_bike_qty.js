/// <reference path="../pb_data/types.d.ts" />

// Add `bike_qty` to parts: a JSON map { [bikeId]: unitCount } so a part with
// quantity > 1 can place more than one unit on the SAME bike (e.g. two `either`
// brakes filling front + rear). The `bikes` relation still lists the distinct
// bikes a part is on (for filtering/expansion); bike_qty carries the per-bike
// unit count. Backfill: one unit per currently-assigned bike.
migrate(
  (app) => {
    const parts = app.findCollectionByNameOrId('parts');
    parts.fields.add(new JSONField({ name: 'bike_qty', maxSize: 100000 }));
    app.save(parts);

    const records = app.findRecordsByFilter('parts', "id != ''", '', 1000, 0);
    for (const r of records) {
      const bikes = r.get('bikes');
      const map = {};
      if (Array.isArray(bikes)) for (const id of bikes) map[id] = 1;
      r.set('bike_qty', map);
      app.save(r);
    }
  },
  (app) => {
    const parts = app.findCollectionByNameOrId('parts');
    parts.fields.removeByName('bike_qty');
    app.save(parts);
  }
);
