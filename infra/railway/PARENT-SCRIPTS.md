# Parent: root `package.json` scripts to wire

Sub-agent 2 **must not** edit the root `package.json` scripts block. Parent should add:

```json
{
  "scripts": {
    "deploy": "bash scripts/deploy.sh",
    "deploy:ps": "pwsh -File scripts/deploy.ps1",
    "deploy:skip-verify": "bash scripts/deploy.sh --skip-verify",
    "smoke": "node scripts/smoke.mjs",
    "smoke:local": "node scripts/smoke.mjs http://127.0.0.1:3100",
    "wait:healthy": "node scripts/wait-healthy.mjs"
  }
}
```

Usage after wiring:

```bash
pnpm deploy
pnpm smoke -- https://YOUR_RAILWAY_DOMAIN
pnpm wait:healthy -- https://YOUR_RAILWAY_DOMAIN
```

Windows without bash:

```powershell
pnpm deploy:ps
```
