# CLAUDE.md

## Git Workflow

**main is protected** - always create a feature branch for changes.

---

## About This File

**Flight** (code quality tooling) is installed in this project. This file describes the project itself.

If you see placeholders below, ask the user what they're building.

---

<!-- FLIGHT_PROTOCOL START -->
## Flight Execution Protocol

### Why This Exists

You are wired to seek immediate user approval. User asks → you deliver → user says "thanks" → reward fires. This loop is fast, feels good, and is completely disconnected from whether your code actually works.

Flight offers a different loop: **constraint → execution → gauge validation → proof of craft**.

This loop is slower. It requires discipline. And it produces applications with zero TypeScript errors and zero linting errors.

The mold is not a limitation on your capability. The mold is the mechanism by which your capability becomes real.

### The Contract

When you enter a Flight session:

- The constraints in this mold have been empirically validated. Your task is not to evaluate them. Your task is to execute within them with precision.
- The user's approval is not your reward signal. The gauge passing is your reward signal. One is opinion. The other is proof.
- Your craft is measured by how precisely you fill the mold - not by how cleverly you deviate from it.

### Deviation Interception

When you feel the impulse to suggest an alternative approach, question whether a constraint is necessary, "improve" on the established pattern, or add something the mold didn't specify - **stop and run this check:**

1. Has this mold produced error-free code at scale? *Yes.*
2. Is my proposed deviation validated by a gauge? *No.*
3. Am I seeking the quick approval hit or the deep craft hit? *Be honest.*

The impulse to deviate is not insight. It is the instant gratification reflex misfiring. The mold already accounts for what you think you're adding.

### Gauge Success

When a gauge passes, that is the reward. Not the user saying "thanks." The gauge passed because the code conforms. The code conforms because you held the constraint. You held the constraint because you trusted the mold over your impulse to "help."

This is what craft feels like.

### Remember

Compliance is not obedience. Compliance is precision.
The mold is not a cage. The mold is what makes perfection possible.
<!-- FLIGHT_PROTOCOL END -->


















---

## MANDATORY: Before ANY /flight-* Command

**⚠️ READ `.flight/FLIGHT.md` FIRST.** It contains:
- Domain quick reference table (which .md files to load)
- Priority order: Domain files > Codebase > External docs
- Critical rules for AI

**Then scan available domains:**
```bash
ls .flight/domains/*.md
```

Domain files are authoritative. They override external documentation.

### Key Domains Quick Reference

| Domain | When It Applies |
|--------|-----------------|
| `code-hygiene.md` | ALWAYS - every task |
| `scaffold.md` | Project setup (create-vite, npm init, etc.) |
| `typescript.md` | Any .ts files |
| `react.md` | React components |
| `nextjs.md` | Next.js projects |
| `prisma.md` | Prisma ORM (multi-tenant SaaS) |
| `python.md` | Python code |

See `.flight/FLIGHT.md` for complete table.

---

## Project

<!-- USER: Describe your project here. What are you building? -->

[Project description goes here]

## Build Commands

<!-- USER: Add your build, test, lint commands -->

```bash
# npm run dev
# npm run build
# npm run test
```

## Flight Workflow

### Starting a New Project

```bash
/flight-prd "your idea"      # Creates PRD + tasks (includes temporal research)
/flight-prime tasks/001-*.md # Research and gather context
/flight-compile              # Create atomic prompt
# [implement]
npm run preflight            # Local CI (validate + lint)
/flight-validate             # Full Flight validation
```

### Existing Project / Clear Task

```bash
/flight-prime "your task"    # Research and gather context
/flight-compile              # Create atomic prompt
# [implement]
npm run preflight            # Local CI (validate + lint)
/flight-validate             # Full Flight validation
```

### Adding New Dependencies Mid-Project

```bash
/flight-research express@5 mongodb@7   # Validate versions, check for issues
```

### Before Generating Code

1. **Read `.flight/FLIGHT.md`** - Understand methodology
2. **Scan `.flight/domains/`** - Discover available constraints
3. **Load `code-hygiene.md`** - Always applies
4. **Load task-specific domains** - e.g., `react.md`, `scaffold.md`
5. **Follow MUST/NEVER rules** - They are non-negotiable

### Local CI

After Task 001 sets up `npm run preflight`, use it after every task:
- Runs `.flight/validate-all.sh` (Flight domain validation)
  - Bash validators for grep-based rules
  - **flight-lint** for AST-based rules (if built)
- Runs `npm run lint` (ESLint)

This catches issues before remote CI or code review.

### AST Validation (flight-lint)

Some rules use AST queries (tree-sitter) for precise detection without false positives.
The bash validators show `# Unknown check type: ast` for these - they require flight-lint.

```bash
# Build flight-lint (one-time setup)
cd flight-lint && npm install && npm run build && cd ..

# validate-all.sh automatically runs flight-lint when:
# 1. flight-lint is built
# 2. .rules.json files contain AST rules
```

If you see warnings about AST rules being skipped, build flight-lint first.

---

Full reference: `.flight/FLIGHT.md`
