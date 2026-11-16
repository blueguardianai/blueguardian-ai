// node test/predict.test.mjs
import assert from 'node:assert/strict';
import { predict } from '../src/ai/predict.js';

const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
const basis = k => Array.from({ length: 8 }, (_, i) => (i === k ? 1 : 0));
const W = [0, 1, 2, 3].map(basis);

// Photo a bit closer to class 0 than class 1: zero-shot picks 0.
const photo = unit([0.32, 0.3, 0.1, 0.1, 0.9, 0, 0, 0]);
assert.equal(predict(photo, W).k, 0);

// A student labels this same photo as class 1: it now predicts 1.
assert.equal(predict(photo, W, [{ emb: photo, k: 1 }]).k, 1);

// An unrelated photo that is clearly class 3 is not dragged along.
const other = unit([0, 0, 0, 0.35, 0, 0, 0.9, 0]);
assert.equal(predict(other, W, [{ emb: photo, k: 1 }]).k, 3);

const { probs } = predict(photo, W);
assert.ok(Math.abs(probs.reduce((a, b) => a + b) - 1) < 1e-9);
console.log('predict: ok');
