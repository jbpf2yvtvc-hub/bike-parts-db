/// <reference path="../pb_data/types.d.ts" />

// `bikes` collection (§5.2). Owner-scoped CRUD.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    const collection = new Collection({
      type: 'base',
      name: 'bikes',
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
        { name: 'name', type: 'text', required: true, max: 120 },
        { name: 'make', type: 'text', max: 120 },
        { name: 'model', type: 'text', max: 120 },
        { name: 'year', type: 'number', onlyInt: true },
        { name: 'color', type: 'text', max: 60 },
        { name: 'notes', type: 'text', max: 2000 },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ]
    });

    app.save(collection);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('bikes'));
  }
);
