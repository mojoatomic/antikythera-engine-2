# Antikythera Engine 2 - Warp AI Assistant Notes

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

## Project-Specific Rules

See main WARP.md content in the rules system for:
- UTC time handling requirements
- Smooth animation principles
- Code organization (DRY, centralized time utilities)
- GitHub workflow preferences (MCP > gh CLI > git)
- Shell command quoting for multi-line strings
- Configuration management approach
