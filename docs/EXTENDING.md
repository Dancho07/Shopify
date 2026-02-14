# Extending StoreOptimizer Studio

## Add a new audit rule
1. Create a rule utility in `src/audit/`.
2. Import and call it from `runAudit.ts`.
3. Return standardized `Finding` objects (`type`, `severity`, `entityType`, `message`, `recommendation`).
4. Add tests under `tests/`.

## Add a new ad template
1. Add template key validation in `src/routes/api.ts` (`/ads/create`).
2. Extend AI generation prompt/rule output in `src/ai/*Provider.ts`.
3. Extend renderer timing + scene assembly in `src/video/`.
4. Update UI selector for template metadata.
