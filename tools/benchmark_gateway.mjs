import { performance } from 'node:perf_hooks';

const baseUrl = process.env.GATEWAY_URL || 'http://127.0.0.1:5001';
const iterations = Number.parseInt(process.env.BENCHMARK_ITERATIONS || '30', 10);

function percentile(sortedValues, percentileValue) {
  const index = Math.min(sortedValues.length - 1, Math.ceil((percentileValue / 100) * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)];
}

async function measure(name, request) {
  const durations = [];
  let transferredBytes = 0;
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    const response = await request();
    const body = await response.arrayBuffer();
    const elapsed = performance.now() - startedAt;
    if (!response.ok) throw new Error(`${name} failed with HTTP ${response.status}`);
    durations.push(elapsed);
    transferredBytes += body.byteLength;
  }
  durations.sort((left, right) => left - right);
  return {
    name,
    iterations,
    p50_ms: Number(percentile(durations, 50).toFixed(2)),
    p95_ms: Number(percentile(durations, 95).toFixed(2)),
    max_ms: Number(durations.at(-1).toFixed(2)),
    average_bytes: Math.round(transferredBytes / iterations)
  };
}

const textPayload = JSON.stringify({
  text: Array.from({ length: 16 }, (_, index) => (
    index % 2 === 0 ? 'The controlled sample preserves a consistent analytical register.' : 'Independent evidence remains necessary for a defensible conclusion.'
  )).join(' ')
});

const results = [];
results.push(await measure('health', () => fetch(`${baseUrl}/health`)));
results.push(await measure('text_analysis', () => fetch(`${baseUrl}/detect/text`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: textPayload
})));

console.log(JSON.stringify({ generated_at: new Date().toISOString(), base_url: baseUrl, results }, null, 2));
