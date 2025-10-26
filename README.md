# Antikythera Mechanism - The Three Faces

A modern, component-based simulation of the ancient Greek Antikythera mechanism - an astronomical calculator from ~100 BCE.

## 🎯 The Vision

This project recreates the three faces of the Antikythera mechanism as interactive displays:

1. **Front Face** - All 7 celestial bodies (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) on concentric circles moving through the zodiac
2. **Back Upper Face** - Metonic cycle spiral (19-year lunar calendar) with Callippic sub-dial
3. **Back Lower Face** - Saros cycle spiral (eclipse prediction) with Exeligmos sub-dial

## 🏗️ Architecture

### Backend: Simple API Wrapper
- Node.js + Express
- Wraps `astronomy-engine` for all astronomical calculations
- Clean REST endpoints

### Frontend: Component-Based Display
- **Three Face Components**: `FrontFace`, `BackUpperFace`, `BackLowerFace`
- **Theme System**: CSS variables for instant visual transformations
- **Layout System**: Multiple viewing modes (Gallery, Hero, Focus)
- **Pure Canvas**: No frameworks; Canvas-based rendering

## 🚀 Quick Start

```bash
npm install
npm start
```

Then open: `http://localhost:3000`

## 🎨 Themes

Switch between 5 themes instantly:

1. **Ancient Bronze** - Weathered patina with blue backdrop (default)
2. **Restored Bronze** - Polished golden finish
3. **Steampunk** - Brass engravings with dark wood
4. **Minimal** - Clean modern lines
5. **Dark Mode** - OLED-friendly with green highlights

All themes use CSS variables - create your own by copying any theme and changing the colors!

## 📐 Layouts

Three layout modes for different display contexts:

- **Gallery** (default) - All three faces side-by-side, perfect for wide screens
- **Hero** - Single large front face, maximum impact
- **Focus** - One face at a time with arrow navigation, ideal for presentations

## 🔧 Components

### FrontFace Component
Displays all celestial bodies on concentric rings:
- Outermost: Egyptian calendar (360 days)
- Zodiac ring with 12 signs
- Saturn, Jupiter, Mars, Venus, Mercury pointers (outer to inner)
- Moon with realistic phase rendering
- Sun with radiant glow effect

### BackUpperFace Component
Metonic cycle (19 solar years = 235 lunar months):
- Archimedean spiral with year markers
- Callippic sub-dial (76-year refinement)
- Current position pointer

### BackLowerFace Component  
Saros cycle (223 synodic months ≈ 18 years for eclipse prediction):
- Spiral with eclipse glyphs (☉ solar, ☽ lunar)
- Exeligmos sub-dial (triple Saros = 54 years)
- Next eclipse countdown

## 🎮 Controls

- **Layout Selector** - Switch between Gallery/Hero/Focus
- **Theme Selector** - Change visual style instantly
- **Date/Time Picker** - Jump to any date
- **Now Button** - Return to current time
- **Update Button** - Refresh display
- **Play ▶** - Animate forward (1 day per frame)
- **Stop ⏸** - Pause animation
- **Arrow Keys** (Focus mode) - Navigate between faces
- **Spacebar** - Play/pause animation

## 🎨 Creating Custom Themes

Add a new theme by adding CSS variables to `index.html`:

```css
[data-theme="your-theme"] {
    --bg-primary: your-gradient-here;
    --bg-dial: your-radial-gradient;
    --color-accent: #your-color;
    --color-pointer: #your-color;
    --color-text: #your-color;
}
```

Then add it to the theme selector dropdown.

## 🔨 Creating Custom Components

Want to add a new dial or visualization? Here's the pattern:

```javascript
class YourComponent {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
  }
  
  render(data) {
    // Your rendering code here
    // Access theme colors via CSS variables
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // ... draw your visualization
  }
}
```

## 🎓 Historical Accuracy

The Antikythera mechanism was discovered in 1901 in a Roman-era shipwreck. It contained:
- At least 30 meshing bronze gears
- Multiple dials and pointers
- Inscriptions describing astronomical phenomena

Our simulation replicates the three main faces:
- **Front**: The Egyptian calendar, zodiac, and pointers for all visible celestial bodies
- **Back Upper**: Long-term lunar calendar (Metonic cycle)  
- **Back Lower**: Eclipse prediction system (Saros cycle)

## 📊 Technical Stack

- **Backend**: Node.js, Express, astronomy-engine
- **Frontend**: Vanilla JavaScript, Canvas API
- **No Build Step**: Pure HTML/CSS/JS
- **No Frameworks**: Maximum simplicity and performance

## 🚀 Use Cases

- **Museum Displays** - Gallery layout on large screens
- **Educational Tools** - Interactive astronomy learning
- **Digital Art** - Ambient display/screensaver
- **Planetarium** - Supplement to sky shows
- **Office Decor** - Educational background display

## API Endpoints

### Get Current State
```
GET /api/state
```

Returns the complete state of the mechanism for the current date/time.

### Get State for Specific Date
```
GET /api/state/:date
```

Example: `GET /api/state/2024-06-21T12:00:00Z`

### Query Parameters
You can also use query parameters:
```
GET /api/state?date=2024-06-21T12:00:00Z
```

### Specific Data Endpoints
- `GET /api/sun` - Sun position only
- `GET /api/moon` - Moon position and phase
- `GET /api/planets` - All planetary positions

## Validation

- Quick check (Moon):
```bash path=null start=null
node scripts/validate-simple.js
```

- Comprehensive (all bodies vs HORIZONS):
```bash path=null start=null
node scripts/validate-all-bodies.js
```

See `docs/VALIDATION.md` for details, coordinate frames, and expected output.

## Response Format

```json
{
  "date": "2024-10-25T12:00:00.000Z",
  "sun": {
    "longitude": 212.45,
    "latitude": 0.0,
    "rightAscension": 14.12,
    "declination": -12.34
  },
  "moon": {
    "longitude": 145.67,
    "latitude": 2.34,
    "phase": 234.56,
    "illumination": 0.67,
    "age": 18.95
  },
  "planets": {
    "mercury": { "longitude": 198.23, ... },
    "venus": { "longitude": 234.56, ... },
    "mars": { "longitude": 123.45, ... },
    "jupiter": { "longitude": 89.12, ... },
    "saturn": { "longitude": 312.34, ... }
  },
  "zodiac": {
    "sign": "Scorpio",
    "signIndex": 7,
    "degreeInSign": 2.45,
    "absoluteLongitude": 212.45
  },
  "metonicCycle": {
    "year": 8,
    "progress": 0.368,
    "anglePosition": 132.5
  },
  "sarosCycle": {
    "cycle": 145,
    "progress": 0.234,
    "anglePosition": 84.24,
    "daysUntilNext": 5043.2
  },
  "egyptianCalendar": {
    "month": 10,
    "day": 25,
    "dayOfYear": 298
  },
  "nextEclipse": {
    "type": "lunar",
    "date": "2024-11-15T06:30:00.000Z",
    "daysUntil": 21
  }
}
```

## How the Dials Work

### Zodiac Dial
- Shows the sun's position through the 12 zodiac signs
- Gold pointer indicates current sun position
- Silver pointer shows moon position
- Outer ring marked with zodiac symbols

### Lunar Phase Dial
- Displays the current phase of the moon
- Shows illumination percentage
- Visual representation of waxing/waning phases
- 8 major phase positions marked

### Metonic Cycle Spiral
- 19-year cycle (235 lunar months = 19 solar years)
- Spiral representation showing current year
- Used by ancient Greeks to predict moon positions

### Saros Cycle Spiral
- 18-year eclipse prediction cycle (223 synodic months)
- Predicts when similar eclipses will occur
- Shows time until next eclipse

## Animation Controls

- **Now**: Jump to current date/time
- **Update**: Refresh display with selected date
- **Play ▶**: Animate forward (1 day per frame)
- **Stop ⏸**: Pause animation

## Technical Stack

- **Backend**: Node.js + Express
- **Astronomy**: astronomy-engine library
- **Frontend**: Vanilla JavaScript + Canvas API
- **No frameworks**: Pure JS for maximum simplicity

## The Original Antikythera Mechanism

Discovered in 1901 in a Roman-era shipwreck off the Greek island of Antikythera, this device is considered the world's first analog computer. It used a complex system of bronze gears to predict:

- Solar and lunar positions
- Moon phases
- Eclipse timings
- Olympic game cycles
- Planetary positions (Mercury through Saturn)

Our simulation uses modern astronomical calculations to achieve similar results through software rather than mechanical gears.

## License

MIT

## Credits

Based on the astronomical knowledge preserved in the ancient Greek Antikythera mechanism (~100 BCE).
