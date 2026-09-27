# AI board operations

The server-only endpoint is:

```text
POST /api/ai/board-operation
Authorization: Basic <base64(user:password)>
Content-Type: application/json
```

Request:

```json
{
  "board": {"columns": [], "cards": {}},
  "question": "Move the release card to Done",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
}
```

`question` is limited to 4,000 characters and `history` to 20 messages.
Each message has only `user` or `assistant` as its role and a non-blank content
string. The board is a complete snapshot and must still match the authenticated
user's current board; stale snapshots are rejected.

The provider must return exactly this JSON shape:

```json
{
  "assistant_response": "I moved the card.",
  "board_update": {"columns": [], "cards": {}}
}
```

`board_update` is optional and may be `null`. When present it is a complete
board, validated by the same domain models and `BoardService` invariants used by
normal board updates. Malformed provider output, extra fields, invalid boards,
stale snapshots, and failed updates never mutate the database. Provider errors
return 502, stale snapshots return 409, and invalid board operations return 400.
The provider API key is never sent to the client.
