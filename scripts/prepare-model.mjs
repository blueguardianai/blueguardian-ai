// Downloads the CLIP models once (dev machine only) and produces what the app ships:
//   models/vision.onnx + src/ai/text-embeds.json           desktop: large model, run by onnxruntime-node
//   models/vision-web.onnx + src/ai/text-embeds-web.json   website: small model, run in the browser
// Each text-embeds file holds one averaged text embedding per class (from the classes.json prompts).
// Re-run after editing the prompts in src/ai/classes.json.
import { AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, env } from '@huggingface/transformers';
import fs from 'node:fs';
import path from 'node:path';

const TARGETS = [
  { model: 'Xenova/clip-vit-large-patch14', dtype: 'fp16', onnx: 'vision.onnx', embeds: 'text-embeds.json' },
  { model: 'Xenova/clip-vit-base-patch32', dtype: 'q8', onnx: 'vision-web.onnx', embeds: 'text-embeds-web.json' },
];
const root = path.resolve(import.meta.dirname, '..');
const norm = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
const classes = JSON.parse(fs.readFileSync(path.join(root, 'src/ai/classes.json'), 'utf8'));
fs.mkdirSync(path.join(root, 'models'), { recursive: true });

for (const { model, dtype, onnx, embeds } of TARGETS) {
  const tok = await AutoTokenizer.from_pretrained(model);
  const text = await CLIPTextModelWithProjection.from_pretrained(model, { dtype });
  const out = [];
  for (const c of classes) {
    const { text_embeds } = await text(tok(c.prompts, { padding: true, truncation: true }));
    const rows = text_embeds.tolist().map(norm);
    out.push(norm(rows[0].map((_, i) => rows.reduce((s, r) => s + r[i], 0))).map(x => +x.toFixed(6)));
  }
  fs.writeFileSync(path.join(root, 'src/ai', embeds), JSON.stringify({ model, dtype, classes: out }));

  // Same file transformers.js downloaded into its cache.
  const suffix = { q8: '_quantized', fp16: '_fp16', fp32: '' }[dtype];
  await CLIPVisionModelWithProjection.from_pretrained(model, { dtype }); // ensure cached
  fs.copyFileSync(path.join(env.cacheDir, model, 'onnx', `vision_model${suffix}.onnx`), path.join(root, 'models', onnx));
  console.log(`OK: ${model} (${dtype}), ${classes.length} classes, ${out[0].length}-dim -> models/${onnx}`);
}
