// BlueVision AI scoring. Runs in the renderer and in node (tests).
// CLIP zero-shot logits + a cache of student-verified photos (Tip-Adapter,
// Zhang et al. 2022): every correction pulls similar photos toward its label
// instantly, no retraining needed.

// ponytail: fixed ALPHA/BETA tuned on a handful of photos; fit them on a
// validation split once the class has a few hundred verified photos.
const ALPHA = 6;  // how much one verified example can move the logits
const BETA = 10;  // how fast its influence falls off with dissimilarity

export const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export function softmax(logits) {
  const m = Math.max(...logits);
  const e = logits.map(x => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
}

// emb: normalized image embedding. classEmbeds: normalized text embedding per class.
// examples: [{ emb, k }] verified photos, k = class index.
export function predict(emb, classEmbeds, examples = []) {
  const logits = classEmbeds.map(w => 100 * dot(w, emb));
  for (const ex of examples) logits[ex.k] += ALPHA * Math.exp(-BETA * (1 - dot(ex.emb, emb)));
  const probs = softmax(logits);
  const k = probs.indexOf(Math.max(...probs));
  return { k, probs };
}
