# Website deployment and final handoff

Website owner: Sai Sri Krishna Teja Sanku (Krishna).

## Ready now

- Website PR: https://github.com/JyothiNandhan/ShellHacks_2026/pull/3
- Local export parsing, real engine integration, local WASM/NER, recap, cleanup report, and three visual themes.
- Production build, lint, typecheck, engine and website tests passed during the integration check.
- `app.yaml` is a deployment template, not evidence of a live deployment.

## Deploy after the PR is merged

1. Sign into the intended DigitalOcean project. Confirm the service size and recurring price before creating the app. The template selects one 1 GB instance in NYC; adjust to the project's budget and availability.
2. Connect `JyothiNandhan/ShellHacks_2026`, branch `main`. Review any GitHub access grant yourself. Import the app spec, or enter its service settings in App Platform.
3. Keep the source directory at the repository root (`/`): the website needs the root lockfile and engine workspace. Build with `npm ci --include=dev && npm run build -w apps/web`; run `npm run start -w apps/web`; HTTP port `3000`. This is a web service, not a static export.
4. Verify that the build copies both ONNX runtime assets and that the deployment health check succeeds. Record the generated HTTPS URL below.
5. In the app's domain settings, add the selected domain and follow the exact DNS records DigitalOcean provides. Verify HTTPS before using the domain in the submission.
6. When Person 3's API arrives, configure its documented secrets in DigitalOcean, never in Git or `NEXT_PUBLIC_*`. The website already requests the relative `/api/tool-safety?tool=chatgpt` URL.

// TODO(deploy): live URL, custom domain, and deployment date are not yet available.

Official references: [app specification](https://docs.digitalocean.com/products/app-platform/reference/app-spec/), [domain setup](https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/).

## Acceptance checklist

- [ ] `/` and `/scan` work over HTTPS on desktop and mobile.
- [ ] `/promptshield-wasm/ort-wasm-simd-threaded.jsep.mjs` and `.wasm` return 200, not an HTML error page.
- [ ] Try with sample data completes and the report says AI name detection is on. First use downloads model assets; inference remains local.
- [ ] Compare planted category counts with `fixtures/fake-export/manifest.json`. Review extra NER categories with Bhoomika instead of changing the ground truth.
- [ ] Inspect Network: no export text or report findings are transmitted. Model/config/tokenizer downloads are expected.
- [ ] Privately test an actual ChatGPT export. Do not commit it, its report, screenshots, or network logs containing private details.
- [ ] With Person 3's route merged, all four tool-safety answers show real sources. Exercise loading, failure, and retry. A mock card does not pass this check.
- [ ] With Rohith's artifact at `apps/web/public/download/promptshield-extension.zip`, rebuild, download it, unpack it, and run the extension checks together on the three target sites.
- [ ] Confirm cleanup marks persist during the session, report clearing works, and real conversation links open the intended chats. Synthetic IDs are not real chats.
- [ ] Run `npm run build --workspaces --if-present` and `npm test --workspaces --if-present` after the team integrations.
- [ ] Record a backup demo and complete the submission fields in `../submission/draft.md`.

## Publishing these preparation files

The PR above contains the already-pushed website work. New preparation files remain local until you push them. After reviewing the commit:

```sh
git status
git log -1 --format=fuller
git push origin Krishna
```

The existing PR updates automatically. Have the team review and merge it before deploying `main`.
