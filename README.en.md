<div align="center">

<img src="build/icon.png" width="96" alt="">

# BlueGuardian AI

**From knowledge to action, for cleaner seas.**

Record a beach with photos and measurements, let the AI recognise the litter,
and see in numbers whether your action made a difference.

[**Open in the browser**](https://blueguardianai.github.io/blueguardian-ai/app/) ·
[Website](https://blueguardianai.github.io/blueguardian-ai/) ·
[Download](#download) ·
[Ελληνικά](README.md)

<img src="site/img/dash-en.jpg" width="820" alt="The dashboard: summary, findings, map and readings">

</div>

## What it does

| | |
|---|---|
| **Visits** | Each trip to the beach: a spot on the map, the date, water temperature, pH, litter count and photos. |
| **BlueVision AI** | Sorts every photo into Clean Beach, Plastic Waste, Other Waste or Natural Materials, and always shows how confident it is. |
| **People decide** | Students check the predictions. Every correction becomes an example, and similar photos update straight away. |
| **Before / After** | Puts the state before, the day of the action and the state after side by side, and works out the difference. |
| **Dashboard** | A map with Copernicus Sentinel-2 satellite imagery, charts per beach, and findings in plain language. |
| **Open data** | Export every visit to CSV, and back everything up to one file. |

<p align="center">
  <img src="site/img/ai-en.jpg" width="49%" alt="BlueVision AI: photos with a confidence per category">
  <img src="site/img/compare-en.jpg" width="49%" alt="Before, Action, After comparison">
</p>

## Download

| System | File | Note |
|---|---|---|
| **Browser** | [Open the app](https://blueguardianai.github.io/blueguardian-ai/app/) | Computer, tablet or phone. Nothing to install. |
| **Windows** 10 / 11 | [BlueGuardian-AI-Setup.exe](https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/BlueGuardian-AI-Setup.exe) | At the SmartScreen warning: "More info" → "Run anyway". |
| **macOS** Apple Silicon | [BlueGuardian-AI-mac-arm64.dmg](https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/BlueGuardian-AI-mac-arm64.dmg) | The first time: right-click the app → "Open". |
| **macOS** Intel | [BlueGuardian-AI-mac-x64.dmg](https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/BlueGuardian-AI-mac-x64.dmg) | As above. |
| **Linux** Debian / Ubuntu / Mint | [BlueGuardian-AI.deb](https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/BlueGuardian-AI.deb) | `sudo apt install ./BlueGuardian-AI.deb` |
| **Linux** any distribution | [BlueGuardian-AI.AppImage](https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/BlueGuardian-AI.AppImage) | `chmod +x BlueGuardian-AI.AppImage`, then run it. |

The desktop apps are about 700 MB because they include the large AI model and work fully offline.
They are not code-signed, so Windows and macOS ask once before opening them.

## How it works

1. **Observe.** Go to the beach and photograph what you find on the shore.
2. **Measure.** Note the water temperature, pH and how much litter you counted.
3. **Understand.** The AI sorts the photos and the dashboard shows what changes over time.
4. **Act and measure again.** After your action, record again and compare.

On first launch the app offers an example beach and a four-step guide.

## Your data

- Everything stays on your device: on the computer for the desktop app, in the browser for the website.
- There are no accounts and nothing is uploaded to a server. The AI runs locally.
- Only the maps load from the internet (OpenStreetMap and EOX).
- The "Data" page makes a backup file and moves your data to another device.

## The AI

BlueVision AI is built on CLIP, a pretrained model that compares images with text descriptions.
Nothing was trained from scratch: each category is defined by a few descriptions in [`src/ai/classes.json`](src/ai/classes.json).

When a student corrects a photo, it is stored as an example.
In later predictions, photos that look like the example lean towards its category ([`src/ai/predict.js`](src/ai/predict.js)).

| | Model | Size |
|---|---|---|
| Desktop app | CLIP ViT-L/14 | 608 MB, bundled |
| Website | CLIP ViT-B/32 (quantized) | 89 MB, downloaded on first use |

The AI makes mistakes, especially on photos with many objects. That is why human checking is part of the app and not optional.

## For developers

One codebase, two targets: an Electron app and a static website. No API keys and no server.

```sh
npm install
npm run prepare-model   # downloads both models once (models/ and src/ai/text-embeds*.json)
npm start               # desktop app
npm run web             # builds dist/web and serves it at http://localhost:8080
npm test
```

| Folder | Contents |
|---|---|
| `src/` | The app, shared by desktop and website. `app.js` UI, `i18n.js` texts, `ai/` prediction. |
| `preload.js`, `src/platform-web.js` | The two implementations of storage and AI. A cloud backend would be a third. |
| `main.js`, `src/sw.js` | Electron main process, and the website's service worker (photos, offline use). |
| `site/` | The website's landing page. |
| `scripts/` | Model preparation and the website build. |

**Releasing:** every push to `main` publishes the website. A tag builds the Windows, macOS and Linux installers and uploads them to the Release:

```sh
git tag v1.0.1 && git push origin v1.0.1
```

## The team

BlueGuardian AI is a project by **Sea Symphony**, the student team of the **3rd Junior High School of Argyroupoli**, Greece.

Maps: [OpenStreetMap](https://www.openstreetmap.org/copyright).
Satellite imagery: [Sentinel-2 cloudless](https://s2maps.eu) by EOX (contains modified Copernicus Sentinel data 2020).
Model: OpenAI's [CLIP](https://github.com/openai/CLIP), in ONNX form from [Transformers.js](https://github.com/huggingface/transformers.js).
