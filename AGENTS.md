The role of this file is to describe common mistakes and confusion points that agents
might encounter as they work in this project. If you ever encounter something in the
project that surprises you, please alert the developer working with you and indicate
that this is the case in this file to help prevent future agents from having the same issue.

## Environment variable memory

Secrets and deploy env values for this repo are stored in skate DB
`@env-librarian-as-a-service-050889983cd526a9.db`. Do not commit secrets or print values;
use skate to read/update them, then sync required values to Vercel env when deploying.

## Deployment gotchas observed

This repo is Bun-first. Do not reintroduce `package-lock.json`; Vercel will switch to
`npm install`, which previously failed on eve's optional `microsandbox` peer dependency.

The eve HTTP channel intentionally uses explicit anonymous access for this public service.
Replacing it with the scaffolded `placeholderAuth()` causes production `/eve/v1/session`
requests to return `eve_production_auth_not_configured`.

`scripts/with-skate-env.mjs` must keep working without the local skate helper present.
Vercel builds rely on real environment variables, not the local skate helper path.
