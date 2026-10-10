## siteFlow architecture
- Frontend only: all data comes from mock services in `src/services` backed by `src/store/appStore.ts` (localStorage); never add server routes or a database — the backend is built separately.
- Components write only through services, never `appStore.setState` directly (except demo toggles), so services can be swapped for REST clients.
- Offline writes go through `recordChange()` in `src/services/core.ts`, which queues outbox items; keep every new field write on that path.
- Dates format with the America/Vancouver timezone in `src/utils/format.ts` to keep SSR and client output identical.
