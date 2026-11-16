# BlueGuardian AI

Record beach visits (photos, location, water temperature, pH, litter count), let BlueVision AI sort the photos
into four categories, let students correct it, and compare Before / After an action.
A project by Sea Symphony, 3rd Junior High School of Argyroupoli. Greek and English.

One codebase, two targets:

| Target | AI model | Data |
|---|---|---|
| Desktop app (Electron) | CLIP ViT-L/14, 608 MB, bundled | `userData` folder on the computer |
| Website (static, installable) | CLIP ViT-B/32 quantized, 89 MB, downloaded on first use | the browser (IndexedDB + Cache Storage) |

Nothing is uploaded anywhere and there are no API keys or secrets in this project.

## Develop

    npm install
    node node_modules/electron/install.js   # only if npm blocked install scripts
    npm run prepare-model                   # downloads both models once, writes models/ and src/ai/text-embeds*.json
    npm start                               # desktop app
    npm run web                             # builds dist/web and serves it at http://localhost:8080
    npm test

## Release

Local builds (Linux machine):

    npm run dist:linux    # dist/BlueGuardian-AI.AppImage and .deb
    npm run dist:win      # dist/BlueGuardian-AI-Setup.exe (unsigned)
    npm run build:web     # dist/web

macOS installers can only be built on a Mac, so releases are built by GitHub Actions
(`.github/workflows/release.yml`), which needs no secrets:

    git tag v1.0.0 && git push origin v1.0.0

That builds Windows, macOS (Apple Silicon + Intel) and Linux installers, attaches them to the GitHub Release,
and publishes the website to GitHub Pages (enable it once: repo Settings > Pages > Source: GitHub Actions).
The website's download buttons point at `releases/latest/download/` of `blueguardianai/blueguardian-ai`;
change `RELEASE` at the top of `site/site.js` if the repository has another name.

## Layout

- `src/` the app (shared by desktop and web). `app.js` UI, `i18n.js` texts, `ai/predict.js` zero-shot + corrections.
- `preload.js` / `src/platform-web.js` the two implementations of the storage + AI `api`. A cloud backend would be a third.
- `main.js` Electron main process. `src/sw.js` service worker (photos + offline) for the website.
- `site/` the landing page. `scripts/` model preparation and the web build.
