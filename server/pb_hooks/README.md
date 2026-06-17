# pb_hooks

Optional PocketBase JavaScript hooks (`*.pb.js`). None are required for the
core app — owner-scoping and the immutable-username rule are enforced via
collection rules in `pb_migrations/`. Add hooks here if you later need
server-side side effects (e.g. derived fields).
