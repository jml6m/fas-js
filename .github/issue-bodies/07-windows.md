On Windows (Node 22), `npm test` fails after build:

```
Error: Cannot find module '...\node'
```

Reproduction: `npm ci && npm test` on Windows 10/11.

**Deliverables:**
- Root cause identified (cross-env, nyc, mocha arg parsing)
- Fix verified on Windows and Linux CI