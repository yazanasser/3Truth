import assert from 'node:assert/strict';
import test from 'node:test';

const baseUrl = process.env.GATEWAY_URL || 'http://127.0.0.1:5001';

test('gateway health is hardened and does not expose framework metadata', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const body = await response.json();
  assert.equal(body.status, 'healthy');
  assert.equal(body.mode, 'local-processing-only');
});

test('untrusted origins are rejected', async () => {
  const response = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://untrusted.invalid' } });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Origin not allowed' });
});

test('client-supplied OTP endpoint no longer exists', async () => {
  const response = await fetch(`${baseUrl}/api/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.invalid', otp_code: '123456' })
  });
  assert.equal(response.status, 404);
});

test('text analysis returns confidence, uncertainty, evidence, and feature importance', async () => {
  const text = Array.from({ length: 16 }, (_, index) => (
    index % 2 === 0 ? 'The controlled sample preserves a consistent analytical register.' : 'Independent evidence remains necessary for a defensible conclusion.'
  )).join(' ');
  const response = await fetch(`${baseUrl}/detect/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.ai_probability >= 0 && result.ai_probability <= 1);
  assert.ok(result.confidence_score >= 0 && result.confidence_score <= 1);
  assert.ok(result.uncertainty >= 0 && result.uncertainty <= 1);
  assert.equal(typeof result.review_required, 'boolean');
  assert.ok(['decisive', 'indicative', 'inconclusive'].includes(result.verdict_status));
  assert.ok(Array.isArray(result.feature_importance));
  assert.ok(Array.isArray(result.evidence_report?.detectors));
  assert.ok(Array.isArray(result.evidence_report?.fusion?.uncertainty_reasons));
});

test('oversized JSON bodies fail with 413', async () => {
  const response = await fetch(`${baseUrl}/detect/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'x'.repeat(1_100_000) })
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'Request body exceeds the configured limit' });
});
