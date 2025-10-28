# Antikythera Engine 2 - Development Notes

## Critical Rules

### Documentation Standards (Golden Rule)

All project documentation MUST follow the professional guidance in `warp-professional-docs.md`. Treat this as the golden rule: use conservative, evidence-backed language, state bounded error metrics, specify methods and limitations, and avoid unsubstantiated superlatives. Apply it to README, API docs, VALIDATION.md, PRs, and issues.

### Time Handling - ALWAYS USE UTC

**IMPORTANT:** All time calculations in this project MUST use UTC methods to avoid Daylight Saving Time (DST) related jumps and inconsistencies.

#### Why UTC?

Daylight Saving Time transitions cause local time to "jump" forward or backward by 1 hour. When calculating astronomical positions, calendar dates, or time-of-day values, using local time methods (like `getHours()`, `getDate()`, `getFullYear()`) will cause visual discontinuities in the display:

- Pointers jumping by ~15-20 degrees (roughly 1 hour)
- Calendar day calculations being off by a day
- Time-of-day rings showing incorrect positions

#### Required UTC Methods

Always use these UTC equivalents:

| ❌ Never Use (Local Time) | ✅ Always Use (UTC) |
|---------------------------|---------------------|
| `date.getHours()`         | `date.getUTCHours()` |
| `date.getMinutes()`       | `date.getUTCMinutes()` |
| `date.getSeconds()`       | `date.getUTCSeconds()` |
| `date.getDate()`          | `date.getUTCDate()` |
| `date.getMonth()`         | `date.getUTCMonth()` |
| `date.getFullYear()`      | `date.getUTCFullYear()` |
| `date.getDay()`           | `date.getUTCDay()` |
| `date.setHours()`         | `date.setUTCHours()` |
| `date.setDate()`          | `date.setUTCDate()` |
| `new Date(year, month, day)` | `new Date(Date.UTC(year, month, day))` |

#### Files Using UTC (Verified)

✅ `engine.js` - All time calculations use UTC
✅ `public/components/FrontFace.js` - Time-of-day calculations use UTC
✅ `public/display.js` - Animation date increments use UTC
✅ `public/display-v2.js` - Animation date increments use UTC

#### Where UTC is Critical

1. **Egyptian Calendar Calculations** (`engine.js`):
   - Day of year calculation
   - Start of year reference

2. **Equation of Time** (`engine.js`):
   - Day of year for EoT formula
   - Start of year reference

3. **Sunrise/Sunset Windows** (`engine.js`):
   - Start of day (midnight)
   - End of day (23:59:59)
   - Noon for polar day/night calculations

4. **Time-of-Day Display** (`FrontFace.js`):
   - Hour/minute/second for heliostat rings
   - Current time marker positions

5. **Animation Controls** (`display.js`, `display-v2.js`):
   - Advancing date by days
   - Date manipulation for time travel

## Testing DST Transitions

When testing the instrument, always verify behavior during DST transitions:

- Spring forward: ~2:00 AM → 3:00 AM (typically March in Northern Hemisphere)
- Fall back: ~2:00 AM → 1:00 AM (typically November in Northern Hemisphere)

Set the date input to these transition dates and verify no jumps occur in:
- Egyptian calendar pointer
- Equation of Time rings
- Time-of-day markers
- All planet/moon pointers

### DST Bug History (RESOLVED)

Previous issues before UTC implementation:
- **Egyptian calendar pointer** would jump backwards ~20° at DST boundaries
- **Sunrise/sunset markers** would disappear when crossing DST transitions
- **Time-of-day rings** would show incorrect hour positions after DST changes
- **Animation** would skip or jump when advancing through DST boundaries

All resolved by:
1. Converting all `.getHours()`, `.getDate()`, `.getFullYear()` to UTC equivalents
2. Normalizing dates to UTC midnight for day-of-year calculations
3. Using fractional values instead of `Math.floor()` for smooth animation
4. Centralizing time math in `utils/time.js`

## Smooth Animation Principles

All movement in the instrument uses **continuous fractional values** rather than discrete steps:

### Fractional vs. Integer Values

❌ **Bad (causes jumps):**
```javascript
const dayOfYear = Math.floor((date - startOfYear) / MS_PER_DAY) + 1; // 1, 2, 3...
```

✅ **Good (smooth):**
```javascript
const dayOfYear = (date - startOfYear) / MS_PER_DAY + 1; // 1.0, 1.5, 2.73...
```

### Why Fractional Values?

- Pointers move **continuously** through the day, not in 24-hour jumps
- Year progress updates **every millisecond**, not once per day
- Animations appear **fluid** rather than stepped
- Eliminates visual **discontinuities** at boundaries

### Components Using Fractional Values

| Component | Fractional Source |
|-----------|------------------|
| Egyptian Calendar | `yearProgress360()` returns 0-360.0 |
| Equation of Time | `fractionalDayOfYear()` includes hours/minutes |
| Metonic Cycle | `progress` calculated from milliseconds |
| Saros Cycle | `progress` calculated from milliseconds |
| Sun/Moon/Planets | astronomy-engine returns precise decimals |

### Year Boundary Handling

The Egyptian calendar uses a **360-degree mapping** rather than literal day counting:

**Problem:** Gregorian years have 365/366 days, but the Egyptian calendar ring has 360 degrees.

**Solution:** Scale the full year (365.25 days) to 360 degrees:
```javascript
const yearProgress = (daysIntoYear / yearLength) * 360; // 0-360
```

This creates smooth transitions:
- **Dec 31 23:59** → ~359.9°
- **Jan 1 00:00** → 0.0°
- No jumping, clamping, or pausing
- Automatically handles leap years (366 days still maps to 360°)

## Architecture Notes

### Coordinate Systems

- **Ecliptic Longitude**: Measured along the ecliptic (zodiac), starting from the vernal equinox (0° = Aries)
- **Right Ascension/Declination**: Equatorial coordinates
- **Altitude/Azimuth**: Horizon-based coordinates (observer-specific)

### Calendar Systems

- **Egyptian Calendar**: 12 months × 30 days + 5 epagomenal days = 365 days
- **Metonic Cycle**: 19 solar years = 235 lunar months
- **Saros Cycle**: 223 synodic months ≈ 18 years, 11 days, 8 hours (eclipse prediction)

### Libraries Used

- `astronomy-engine`: High-precision astronomical calculations
- Native Canvas API: All rendering (no external graphics libraries)

## Code Organization Principles

### DRY (Don't Repeat Yourself)

Avoid duplicating date/time math across the codebase:

❌ **Bad:**
```javascript
// In engine.js
const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

// In another file
const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
```

✅ **Good:**
```javascript
const TimeUtils = require('./utils/time');
const startOfYear = TimeUtils.startOfYear(date);
```

### Benefits of Centralization

1. **Single Source of Truth**: Fix bugs once, fix everywhere
2. **Testability**: Unit test utilities in isolation
3. **Readability**: Self-documenting function names
4. **Maintainability**: Changes in one place
5. **Consistency**: All code uses same logic

## Code Style

- Use UTC for all time operations (see above)
- **Use centralized time utilities** (`utils/time.js`) for all date calculations
- Greek names for zodiac signs and months (maintain historical accuracy)
- Mechanical aesthetic for all visual elements (bronze/gold colors, clear typography)
- Comment complex astronomical calculations with explanations

## Shell Command Quoting

**CRITICAL:** When using `gh` CLI or other shell commands with multi-line strings, quotes/newlines/special chars, ALWAYS use a file instead of inline strings.

❌ **Bad (causes shell quoting issues):**
```bash
gh issue comment 3 --body 'Extended validation complete:
- Item 1
- Item 2'
```

✅ **Good (use file):**
```bash
cat > .github/comment.md << 'EOF'
Extended validation complete:
- Item 1  
- Item 2
EOF
gh issue comment 3 --body-file .github/comment.md
```

**Applies to:**
- `gh issue create --body` → use `--body-file`
- `gh pr create --body` → use `--body-file`
- `gh issue comment --body` → use `--body-file`
- Any command with JSON/markdown/multi-line input

## Centralized Time Utilities

All date/time calculations should use the functions in `utils/time.js` to ensure:
- UTC-safety (no DST bugs)
- Fractional values for smooth animation
- Consistent behavior across the codebase
- Single source of truth for time math

**Available utilities:**
- `utcStartOfDay(date)` - Get midnight UTC for a date
- `utcEndOfDay(date)` - Get 23:59:59.999 UTC for a date
- `utcNoon(date)` - Get noon UTC for a date
- `startOfYear(date)` - Get Jan 1 00:00:00 UTC for a year
- `endOfYear(date)` - Get Jan 1 00:00:00 UTC of next year
- `yearLengthDays(date)` - Get 365 or 366 (for leap years)
- `fractionalDayOfYear(date)` - Get day of year with sub-day precision (1.0 to 366.999...)
- `yearProgress360(date)` - Map year position to 360 degrees (0-360)
- `sameUtcDate(a, b)` - Compare two dates ignoring time-of-day

**Example:**
```javascript
const TimeUtils = require('./utils/time');

// Instead of:
const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

// Use:
const startOfYear = TimeUtils.startOfYear(date);
```

## GitHub Workflow

### GitHub Tooling Preference Order

Use this order for all GitHub-related tasks:

1) GitHub MCP tools (preferred)
- Use MCP for reading/updating PRs/issues, comments, reviews, branches/files.
- Examples: add_issue_comment, pull_request_read, pull_request_review_write, update_pull_request, list_issues, list_pull_requests, create_branch, push_files.
- Non-interactive by design; no pagers.

2) Fallback: GitHub CLI (gh)
- Always add --no-pager and prefer --json when parsing.
- For multi-line text, use --body-file (see Shell Command Quoting section).
- Avoid interactive prompts; never inline secrets.

3) Fallback: raw git
- Use only for local repo inspection when MCP/gh are unavailable.
- Avoid pagers (e.g., git --no-pager log) and destructive commands.

### Managing Labels

Always check existing labels before creating GitHub issues to avoid errors:

```bash
# List all labels
gh label list

# List with full details (JSON)
gh label list --json name,color,description

# Get just label names
gh label list --json name --jq '.[].name'

# Create a new label
gh label create "label-name" --color "HEX" --description "Label description"

# Edit existing label
gh label edit "label-name" --color "HEX" --description "New description"

# Delete a label
gh label delete "label-name"

# Open labels page in browser
gh label list --web
```

**Project Labels:**
- `enhancement` - New feature or request
- `bug` - Something isn't working
- `documentation` - Improvements or additions to documentation
- `api` - API endpoint development
- `hardware-integration` - Physical device / motor control features
- `phase-1`, `phase-2`, `phase-3` - Phased development tracking

**Always check labels exist before creating issues** to prevent `gh issue create` failures.
