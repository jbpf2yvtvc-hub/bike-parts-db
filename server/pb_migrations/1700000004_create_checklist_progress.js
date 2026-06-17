/// <reference path="../pb_data/types.d.ts" />

// `checklist_progress` collection (§5.2). One record per bike, storing the
// configurator state, checked item keys, and item-key -> part-id links.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const bikes = app.findCollectionByNameOrId('bikes');

    const collection = new Collection({
      type: 'base',
      name: 'checklist_progress',
      listRule: 'owner = @request.auth.id',
      viewRule: 'owner = @request.auth.id',
      createRule: '@request.auth.id != "" && owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
      fields: [
        {
          name: 'bike',
          type: 'relation',
          required: true,
          collectionId: bikes.id,
          cascadeDelete: true,
          maxSelect: 1
        },
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1
        },
        { name: 'config', type: 'json', maxSize: 100000 },
        { name: 'checked_items', type: 'json', maxSize: 1000000 },
        { name: 'part_links', type: 'json', maxSize: 1000000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ],
      // One progress doc per bike.
      indexes: ['CREATE UNIQUE INDEX `idx_checklist_bike` ON `checklist_progress` (`bike`)']
    });

    app.save(collection);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('checklist_progress'));
  }
);
