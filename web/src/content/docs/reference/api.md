---
title: API reference
description: Librarian exposes eve's canonical session routes. Start a session, stream events, and reuse the continuation token for follow-ups.
---

Librarian exposes eve's canonical HTTP session API. Start a session with a
message, stream its events as newline-delimited JSON, and reuse the
continuation token for follow-ups.

## Base URL

`https://librarian.pcstyle.dev`

## Authentication

Send a bearer token on every request. The service currently accepts any token;
clients should still send one so the contract is stable when real auth is added.

```sh
export LIBRARIAN_API_KEY="your-token"
```

## Start a session

`POST /eve/v1/session` with a JSON body containing `message`. The response
returns `sessionId` and a `continuationToken` you reuse for follow-ups.

```sh
curl -X POST https://librarian.pcstyle.dev/eve/v1/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LIBRARIAN_API_KEY" \
  -d '{"message":"In vercel/ai, where is createOpenAICompatible documented?"}'

# {"continuationToken":"eve:7f3c...","ok":true,"sessionId":"ses_01h..."}
```

## Stream events

`GET /eve/v1/session/:sessionId/stream` returns newline-delimited JSON
(`application/x-ndjson; charset=utf-8`), one event object per line. Collect
`message.completed` events; the last completed assistant message is
Librarian's answer.

```sh
curl -N https://librarian.pcstyle.dev/eve/v1/session/ses_01h.../stream

# {"type":"turn.started", ...}
# {"type":"message.appended", ...}
# {"type":"message.completed", ...}
```

## Send a follow-up

`POST /eve/v1/session/:sessionId` with the continuation token in the
`X-Continuation-Token` header and a new `message` in the body.

```sh
curl -X POST https://librarian.pcstyle.dev/eve/v1/session/ses_01h... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LIBRARIAN_API_KEY" \
  -H "X-Continuation-Token: eve:7f3c..." \
  -d '{"message":"Show the implementation file."}'
```

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/eve/v1/session` | Start a session. Body: `{ "message": "..." }`. |
| `POST` | `/eve/v1/session/:id` | Send a follow-up. Requires the continuation token header. |
| `GET` | `/eve/v1/session/:id/stream` | Stream session events as NDJSON. |
| `GET` | `/eve/v1/health` | Health probe. |

## Headers

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` on POST bodies. |
| `Authorization` | `Bearer $LIBRARIAN_API_KEY`. Falls back to `test123` in the bundled script when unset. |
| `X-Continuation-Token` | The token from the start response, reused for follow-ups. |

## Implement your own client

Stream events are newline-delimited JSON. Read the stream line by line, keep
the last `message.completed` event, and return its assistant message as
Librarian's answer. The bundled skill script at
`skills/librarian/scripts/ask-librarian.mjs` is a working reference
implementation.
