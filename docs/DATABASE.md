# Database design

## Scope

Part 5 defines the SQLite design only. Persistence code and database
initialization are intentionally deferred to Part 6 until this design is
approved.

The machine-readable proposal is in
[`database-schema.json`](./database-schema.json).

## Model

- `users` stores identities and a server-side password hash.
- `boards` belongs to one user. The unique `user_id` constraint enforces the
  MVP rule of one board per user while keeping the relationship explicit for
  future multi-user support.
- `columns` stores a board's fixed workflow stages. `position` is the
  authoritative order.
- `cards` stores card content and its column. `position` is authoritative
  within each column.

Foreign keys must be enabled for every SQLite connection. Deletes should be
implemented deliberately in Part 6; no cascade behavior is assumed by this
proposal.

## Initialization

Part 6 will create `data/project-management.sqlite3` and the tables when the
file does not exist. It will seed the MVP user, one board, and five initial
columns. The plaintext MVP password must never be persisted; the backend will
store a password hash.

SQLite WAL mode is proposed for local read/write behavior. The database path
must be configurable for tests so tests can use a temporary database without
modifying the working tree.

## API and persistence separation

The API board shape follows the existing frontend domain model: columns
contain ordered `cardIds`, while card records are stored in a top-level map.
Database rows remain normalized and use integer foreign keys. Controllers and
services will map between these shapes; route handlers must not expose raw
database rows.

All board mutations must use one transaction and re-number affected positions
without gaps. Invalid references, duplicate positions, and cross-user records
must be rejected before committing.

## Approval boundary

This is a design proposal, not an implementation. Part 6 must not begin until
the schema, initialization rules, and API mapping are approved.
