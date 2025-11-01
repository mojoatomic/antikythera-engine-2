# Antikythera Engine 2 - Warp AI Assistant Notes

## Project Location

**Local Path:** `/Users/dougfennell/vscode/projects/antikythera-engine-2`

## Repository Information

**GitHub Owner:** `mojoatomic` (NOT `dougfennell`)
**Repository:** `antikythera-engine-2`
**Git Remote:** `https://github.com/mojoatomic/antikythera-engine-2.git`

**CRITICAL:** When using GitHub MCP tools or `gh` CLI commands, always use:
- `owner`: `mojoatomic`
- `repo`: `antikythera-engine-2`

Local filesystem username (`dougfennell`) ≠ GitHub username (`mojoatomic`)

## Quick Reference

### GitHub Operations
```bash
# Correct
gh issue create --repo mojoatomic/antikythera-engine-2
issue_write(owner="mojoatomic", repo="antikythera-engine-2", ...)

# Wrong
gh issue create --repo dougfennell/antikythera-engine-2  # ❌ Will fail
```

### Branch Workflow
- Never work directly on `main`
- Always create feature branches for new work
- Branch naming: `feature/description` or `fix/description`

## Code Quality Principles

### Value Assignment - Clarity Over Cleverness

**GOOD** ✅ - Direct, clear values:
```javascript
const multiplier = 0.8;
const lineWidth = 3 * multiplier;
```

**BAD** ❌ - Convoluted calculations:
```javascript
// Don't do this!
const value = 1 + 20 * 2 - 50 + 11 + 8;  // What is this even computing?
const lineWidth = baseWidth * (1.0 - 0.2) * someRatio / anotherValue;
```

**Key Rules:**
1. **Use direct values** - If the final value is known, assign it directly
2. **Name your constants** - If you need calculation, extract steps into named variables
3. **One operation per line** - Complex math should be broken into readable steps
4. **Comment the why, not the what** - `// 20% thinner` not `// multiply by 0.8`

**Example - Refactoring Complex Math:**
```javascript
// ❌ Bad - Unclear intent
const result = base * (1 - 0.15) + offset * 2.5 - adjustment;

// ✅ Good - Clear, step-by-step
const reductionFactor = 0.85;  // 15% reduction
const scaledOffset = offset * 2.5;
const reducedBase = base * reductionFactor;
const result = reducedBase + scaledOffset - adjustment;
```

### Don't Repeat Yourself (DRY)
- Remove redundant assignments
- Extract repeated logic into functions
- Use variables to avoid recalculating the same value

## Project-Specific Rules

See main WARP.md content in the rules system for:
- UTC time handling requirements
- Smooth animation principles
- Code organization (DRY, centralized time utilities)
- GitHub workflow preferences (MCP > gh CLI > git)
- Shell command quoting for multi-line strings
- Configuration management approach
