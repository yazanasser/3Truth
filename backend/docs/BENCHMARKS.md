# Local benchmark record

Recorded on 2026-07-13 on the current Windows development host with Node.js 22. The run used 30 iterations per endpoint and the deterministic gateway text path with the Python service unavailable. These numbers are engineering baselines, not accuracy claims or production SLOs.

| Operation | p50 | p95 | max | Average response |
| --- | ---: | ---: | ---: | ---: |
| Gateway health | 7.59 ms | 35.75 ms | 885.61 ms | small JSON |
| Text analysis, degraded local path | 36.39 ms | 118.88 ms | 325.55 ms | 6,967 bytes |

The gateway health maximum includes cold-start overhead. The Python service's first health response measured 3,078.32 ms while CPU models initialized, so its probe budget is five seconds and successful results are cached for 30 seconds. Full text inference observed during integration verification ranged from 4.41 to 37.63 seconds on this CPU host; this small sample is a sizing warning, not a percentile estimate. Full model latency is hardware-, model-, and input-dependent and must be measured separately on the deployment host. The gateway permits 45 seconds for text, 90 seconds for image, and 120 seconds for video inference by default.

Run the same harness against a live gateway:

```powershell
cd backend
$env:BENCHMARK_ITERATIONS = '30'
npm run benchmark
```

For comparable degraded-mode results, start the gateway with `PYTHON_SERVICE_URL` pointing to an unused local port. Record the host, model manifest, warm-up policy, media dimensions, and corpus composition beside every published result.
