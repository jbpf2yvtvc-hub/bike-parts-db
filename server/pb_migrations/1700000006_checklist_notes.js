/// <reference path="../pb_data/types.d.ts" />

// Add a free-text `notes` field to checklist_progress for per-build details that
// don't belong in the parts inventory (e.g. specific cable ends, which housing
// to use). One multi-line note per bike's build sheet.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('checklist_progress');
    collection.fields.add(new TextField({ name: 'notes', max: 10000 }));
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('checklist_progress');
    collection.fields.removeByName('notes');
    app.save(collection);
  }
);
