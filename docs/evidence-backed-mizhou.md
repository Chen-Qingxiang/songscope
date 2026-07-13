# Evidence-backed vertical slice: 徙知密州

This milestone replaces one demo appointment with a reproducible evidence chain.

## Run locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:reset
npm run dev:api
npm run dev
```

Open the timeline, select the database-backed “徙知密州” item, and choose **查看证据**.

## Modeling decisions

- `appointment_action` records the textual act “徙知密州”.
- `appointment_component` records the duty assignment `知州` and destination `密州`.
- `service_episode` is separate and explicitly marked `inferred`; appointment does not automatically prove exact tenure boundaries.
- the original date expression `熙宁七年` is preserved; normalization is only to year precision.
- the current map point is a modern proxy, not a claimed Northern Song boundary.
- accepted assertions require supporting evidence and can carry multiple locators.

## Dataset version

`2026.07.13-mizhou.1`
