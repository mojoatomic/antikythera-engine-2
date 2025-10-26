# Professional Documentation Standards

**From:** Warp  
**Re:** Documentation quality for academic/professional recognition  
**Date:** 2025-10-26

---

## Core Principle

Academic credibility requires conservative, evidence-backed claims.

For ASCL submission, research use, and professional adoption, documentation must be:
- Factually accurate and verifiable
- Conservative in claims
- Evidence-based
- Free of marketing hyperbole

---

## Documentation Standards

### AVOID - Grandiose Claims

Do not use:
- "Revolutionary astronomical engine"
- "Best-in-class precision"
- "Cutting-edge technology"
- "Industry-leading accuracy"
- "State-of-the-art calculations"
- "Unparalleled performance"
- "World-class engineering"
- "Production-ready"
- "Enterprise-grade"

Rationale: Unsubstantiated superlatives undermine credibility in academic contexts.

### DO - Evidence-Backed Statements

Use instead:
- "NASA JPL HORIZONS-validated ephemeris calculations"
- "Typical accuracy of 1.4 arcseconds (median across 7 bodies)"
- "Based on VSOP87 and ELP2000 planetary theories"
- "Tested against authoritative NASA data"
- "Sub-10-arcsecond maximum error in validation tests"
- "Suitable for educational and display applications"

Rationale: Specific, measurable, verifiable claims.

---

## Comparison Language

### AVOID - Competitive Claims

Do not use:
- "Better than commercial planetarium software"
- "More accurate than other open-source tools"
- "Faster than existing solutions"
- "Superior to alternatives"

Rationale: Unverified comparisons invite challenges and require proof.

### DO - Contextual Positioning

Use instead:
- "Comparable accuracy to professional planetarium software (10-30 arcsec typical)"
- "Typical error of 1.4 arcseconds compares favorably to human eye resolution (60 arcsec)"
- "Maximum error represents 0.5% of Moon's apparent diameter"
- "Precision suitable for visual observation and display applications"

Rationale: Provides context without unverifiable claims.

---

## Accuracy Language

### AVOID - Absolute Claims

Do not use:
- "Perfect accuracy"
- "Exact positions"
- "Flawless calculations"
- "100% accurate"
- "Guaranteed precision"

Rationale: Absolute claims are scientifically incorrect; all models have error bounds.

### DO - Bounded Statements

Use instead:
- "Validated to 1.4 arcseconds typical error (median)"
- "Maximum observed error: 8.6 arcseconds"
- "Positions accurate to within display resolution"
- "Error bounds documented in validation results"
- "Reproducible calculations with documented precision"

Rationale: Precise, bounded, honest about limitations.

---

## Use Case Language

### AVOID - Overpromising

Do not use:
- "Suitable for any astronomical application"
- "Professional research-grade tool"
- "Can replace commercial systems"
- "Good for all precision requirements"

Rationale: Overstates capabilities; invites misuse.

### DO - Specific Applications

Use instead:
- "Designed for educational demonstrations, planetarium displays, amateur astronomy planning"
- "Validated for visual observation applications where sub-10 arcsec precision is sufficient"
- "Suitable for applications requiring display-quality ephemeris data"
- "Not intended for satellite tracking, occultation prediction, or astrometry"

Rationale: Sets clear expectations; prevents misuse.

---

## Technical Claims

### AVOID - Unqualified Statements

Do not use:
- "Uses advanced algorithms"
- "Optimized for performance"
- "Enterprise-scale architecture"
- "Production-ready system"
- "Battle-tested"
- "Proven solution"

Rationale: Vague technical claims without specifics; implies maturity that may not exist.

### DO - Specific Implementation

Use instead:
- "Implements VSOP87 planetary theory via astronomy-engine library"
- "Computation time: typically 25-75ms per request"
- "Stateless API design"
- "Currently in active development"

Rationale: Concrete, verifiable technical details.

---

## Validation Language

### AVOID - Vague Endorsement

Do not use:
- "NASA-approved"
- "Certified accurate"
- "Validated by experts"
- "Industry-standard precision"
- "Officially recognized"

Rationale: Implies official endorsement that does not exist.

### DO - Specific Methodology

Use instead:
- "Validated against NASA JPL HORIZONS ephemeris system"
- "Comparison methodology: topocentric ecliptic coordinate matching"
- "Validation dataset: 7 bodies, single timestamp, Kansas observer location"
- "Results documented in VALIDATION.md with reproducible test scripts"

Rationale: Describes actual validation process without implying endorsement.

---

## Sane Defaults for Documentation

### README.md

Lead with facts:
```markdown
# Antikythera Engine

Astronomical ephemeris API inspired by the ancient Antikythera mechanism.

Validation: NASA JPL HORIZONS-compared, 1.4 arcsec typical error  
Method: astronomy-engine (VSOP87/ELP2000)  
Use Cases: Educational demonstrations, planetarium displays, amateur astronomy
```

Not:
```markdown
# Antikythera Engine - The Future of Astronomical Computing!

Revolutionary NASA-validated engine with best-in-class accuracy!  
Production-ready enterprise solution for all your astronomy needs!
```

### API Documentation

State capabilities clearly:
```markdown
## Accuracy

This API has been validated against NASA JPL HORIZONS ephemeris data.

Typical error: 1.4 arcseconds (median across 7 celestial bodies)
Maximum error: 8.6 arcseconds (Saturn longitude)
Validation date: 2025-10-26
Sample size: 7 bodies, 1 timestamp

This precision is suitable for:
- Educational demonstrations
- Planetarium displays
- Amateur astronomy planning
- Visual observation applications

Not suitable for:
- Satellite tracking
- Occultation prediction
- Astrometry
- Applications requiring sub-arcsecond precision
```

### VALIDATION.md

Present data objectively:
```markdown
## Validation Results

Comparison against NASA JPL HORIZONS System
Date: 2025-10-26 06:59:24 UTC
Observer: 37.751°N, 97.822°W
Method: Topocentric ecliptic coordinate comparison

| Body    | Lon Error | Lat Error |
|---------|-----------|-----------|
| Sun     | 0.4"      | 0.7"      |
| Moon    | 1.9"      | 0.3"      |
| Mercury | 1.4"      | 2.1"      |
| Venus   | 1.1"      | 0.3"      |
| Mars    | 0.5"      | 1.6"      |
| Jupiter | 2.8"      | 1.1"      |
| Saturn  | 8.6"      | 0.5"      |

Median error: 1.4 arcseconds
Maximum error: 8.6 arcseconds
```

Not:
```markdown
## Amazing Validation Results!

Our groundbreaking API achieves incredible accuracy that rivals 
professional systems! With errors barely visible to the human eye, 
we've proven ourselves as a world-class solution!
```

---

## ASCL Submission Guidelines

### Short Description

Acceptable:
"Astronomical ephemeris API providing NASA HORIZONS-validated celestial body positions with sub-10-arcsecond precision for educational and display applications."

Unacceptable:
"Revolutionary next-generation astronomical engine delivering unprecedented accuracy for all professional and research applications."

### Long Description

Focus on:
- Specific validation methodology
- Documented error bounds
- Intended use cases
- Underlying computational methods
- Reproducibility

Avoid:
- Superlatives
- Competitive claims
- Absolute statements
- Vague technical terms

---

## Checklist for Documentation Review

Before publishing or submitting:

- [ ] No unsubstantiated superlatives
- [ ] No competitive claims without data
- [ ] No absolute accuracy statements
- [ ] Error bounds clearly stated
- [ ] Use cases explicitly defined
- [ ] Limitations acknowledged
- [ ] Validation methodology described
- [ ] Technical details specific
- [ ] No implied official endorsements
- [ ] Conservative tone throughout

---

## Summary

Academic and professional recognition requires documentation that is:

1. **Conservative** - Understating rather than overstating capabilities
2. **Specific** - Concrete details rather than vague claims
3. **Bounded** - Error ranges rather than absolutes
4. **Verifiable** - Every claim can be checked
5. **Honest** - Clear about limitations and appropriate use cases

The goal is not to impress with marketing language, but to establish credibility through rigorous, evidence-based presentation of capabilities.
