/// <reference path="../pb_data/types.d.ts" />

// `parts` collection (§5.2). All part records live here with a `type_id` and a
// flexible `attributes` JSON field. Owner-scoped CRUD. `bike` is optional and
// is NULLIFIED (not cascaded) when a bike is deleted (§6.4) — so cascadeDelete
// is false here and bike deletion clears the relation in app code.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const bikes = app.findCollectionByNameOrId('bikes');

    const collection = new Collection({
      type: 'base',
      name: 'parts',
      listRule: 'owner = @request.auth.id',
      viewRule: 'owner = @request.auth.id',
      createRule: '@request.auth.id != "" && owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1
        },
        { name: 'type_id', type: 'text', required: true, max: 60 },
        { name: 'attributes', type: 'json', maxSize: 2000000 },
        {
          name: 'bike',
          type: 'relation',
          required: false,
          collectionId: bikes.id,
          cascadeDelete: false,
          maxSelect: 1
        },
        {
          name: 'disposition',
          type: 'select',
          maxSelect: 1,
          values: ['keep', 'for_sale', 'donate', 'unknown']
        },
        { name: 'acquisition_date', type: 'date' },
        { name: 'acquisition_price', type: 'number' },
        { name: 'asking_price', type: 'number' },
        { name: 'tags', type: 'text', max: 5000 },
        { name: 'images', type: 'file', maxSelect: 5, maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ],
      indexes: ['CREATE INDEX `idx_parts_owner_type` ON `parts` (`owner`, `type_id`)']
    });

    app.save(collection);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('parts'));
  }
);
