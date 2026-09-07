# JSON normalization benchmark

Run `npm run benchmark:json` from the repository root after installing dependencies.

The benchmark measures the current `parseJSON` with whitespace trimming and empty-string conversion enabled. It includes reading an in-memory request stream through `parseText` and `raw-body`, JSON parsing, depth validation, and normalization. No HTTP transport is timed.

Payloads contain 400 or 5,400 user records with nested objects, arrays, strings, numbers, booleans, and nulls, producing bodies of 75,081 and 1,030,781 bytes.

Each payload gets 100 warmup parses, followed by 25 samples of 20 parses each. The output reports minimum, median, and maximum per-parse sample averages in microseconds, not individual request latency percentiles.

Run before and after parser changes on the same machine and Node version, without a profiler. Keep the fixtures and sampling settings unchanged when comparing runs. Shared-machine load affects the results, so these measurements are not a CI threshold.
