Closes #3

## Summary
- ✅ Replace geoip-lite with ipapi.co (24h cache, handles private IPs, query override)
- ✅ Extended validation: 48 samples over 30 days vs HORIZONS
- ✅ Update constants/validation.js with per-body p50/p95/max stats
- ✅ Update docs/VALIDATION.md with methodology and results table

## Validation Results
**Overall:** p50=1.61", p95=8.30", max=8.62" (Saturn)
- Sun: p50=0.52", max=0.96"
- Moon: p50=2.61", max=6.04"
- Mercury: p50=0.78", max=2.59"
- Venus: p50=1.39", max=2.37"
- Mars: p50=0.44", max=0.91"
- Jupiter: p50=2.96", max=3.38"
- Saturn: p50=8.22", max=8.62"

All bodies meet display quality standards (360" tolerance) with significant margin.
