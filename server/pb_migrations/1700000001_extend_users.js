/// <reference path="../pb_data/types.d.ts" />

// Extend the built-in `users` auth collection (§5.2) with profile fields,
// owner-scoped read/write, and an immutable `username` rule (§2.4).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    users.fields.add(new TextField({ name: 'username', required: true, max: 30 }));
    users.fields.add(new TextField({ name: 'display_name', max: 60 }));
    users.fields.add(new TextField({ name: 'bio', max: 280 }));
    users.fields.add(new TextField({ name: 'phone', max: 30 }));

    // Unique username (DB-enforced, in addition to the registration check).
    users.indexes.push(
      'CREATE UNIQUE INDEX `idx_users_username` ON `users` (`username`)'
    );

    // A user can only read/update/delete their own record. The update rule
    // makes `username` immutable: either it is not in the request body, or it
    // equals the stored value.
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.updateRule =
      'id = @request.auth.id && (@request.body.username:isset = false || @request.body.username = username)';
    users.deleteRule = 'id = @request.auth.id';

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.fields.removeByName('username');
    users.fields.removeByName('display_name');
    users.fields.removeByName('bio');
    users.fields.removeByName('phone');
    users.indexes = users.indexes.filter((i) => !i.includes('idx_users_username'));
    users.listRule = null;
    users.viewRule = null;
    users.updateRule = null;
    users.deleteRule = null;
    app.save(users);
  }
);
