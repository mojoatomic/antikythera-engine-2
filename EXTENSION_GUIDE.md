# Extension Guide

How to customize and extend the Antikythera display system.

## Adding a New Theme

### Step 1: Define CSS Variables

Add to `index.html` in the `<style>` section:

```css
[data-theme="hologram"] {
    --bg-primary: linear-gradient(135deg, #000428 0%, #004e92 100%);
    --bg-dial: radial-gradient(circle, rgba(0,255,255,0.1) 0%, rgba(0,0,0,0.8) 100%);
    --color-accent: #00ffff;
    --color-pointer: #00ff00;
    --color-text: #00ffff;
}
```

### Step 2: Add to Theme Selector

In `index.html`, add option to `<select id="themeSelect">`:

```html
<option value="hologram">Hologram</option>
```

**That's it!** The entire display will use your new colors.

---

## Creating a Custom Component

Let's create a **Planet Distance Display** showing each planet's current distance from Earth.

### Step 1: Create Component File

`public/components/PlanetDistances.js`:

```javascript
class PlanetDistances {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    
    this.planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    this.colors = {
      mercury: '#C0C0C0',
      venus: '#F0E68C',
      mars: '#CD5C5C',
      jupiter: '#DAA520',
      saturn: '#8B7355'
    };
  }
  
  render(data) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Title
    this.ctx.fillStyle = 'var(--color-accent)';
    this.ctx.font = 'bold 24px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Planetary Distances', this.centerX, 40);
    
    // Draw bars for each planet
    let y = 80;
    this.planets.forEach(planet => {
      if (data.planets && data.planets[planet]) {
        this.drawPlanetBar(planet, data.planets[planet], y);
        y += 60;
      }
    });
  }
  
  drawPlanetBar(name, planetData, y) {
    // Planet name
    this.ctx.fillStyle = 'var(--color-text)';
    this.ctx.font = '16px Georgia';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      name.charAt(0).toUpperCase() + name.slice(1), 
      40, 
      y
    );
    
    // Distance bar (mock calculation - you'd use real distance data)
    const distance = Math.abs(planetData.longitude - 180) / 180; // Simplified
    const barWidth = 300 * distance;
    
    this.ctx.fillStyle = this.colors[name];
    this.ctx.fillRect(40, y + 10, barWidth, 20);
    
    // Distance label
    this.ctx.fillStyle = 'var(--color-text)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(
      `${(distance * 2).toFixed(2)} AU`, 
      this.canvas.width - 40, 
      y + 24
    );
  }
}
```

### Step 2: Add Canvas to HTML

In `index.html`, add to `.faces-container`:

```html
<div class="face-card face" id="planetDistancesFace">
    <canvas id="planetDistancesCanvas" width="600" height="600"></canvas>
</div>
```

### Step 3: Initialize in Display Controller

In `display.js`:

```javascript
// Add at top
let planetDistances = null;

// In initComponents()
const planetDistancesCanvas = document.getElementById('planetDistancesCanvas');
planetDistances = new PlanetDistances(planetDistancesCanvas);

// In updateDisplay()
planetDistances.render(data);
```

### Step 4: Load Component Script

In `index.html`, add before `display.js`:

```html
<script src="components/PlanetDistances.js"></script>
```

**Done!** Your new component will render alongside the others.

---

## Creating a Custom Layout

Let's add a **"Dashboard"** layout - front face large, others as thumbnails.

### Step 1: Add CSS

In `index.html` `<style>`:

```css
.layout-dashboard .faces-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 20px;
    max-width: 1600px;
    margin: 0 auto;
}

.layout-dashboard #frontFace {
    grid-column: 1;
    grid-row: 1 / 3;
}

.layout-dashboard #backUpperFace,
.layout-dashboard #backLowerFace {
    grid-column: 2;
}
```

### Step 2: Add to Layout Selector

In `index.html`:

```html
<option value="dashboard">Dashboard</option>
```

**That's it!** The layout system will apply your new grid automatically.

---

## Advanced: Custom Astronomical Calculations

Want to add a feature not in astronomy-engine? Extend the backend.

### Example: Adding House System for Astrology

In `engine.js`:

```javascript
getHouses(date, observer) {
  // Calculate astrological houses
  const sunPos = this.getSunPosition(date, observer);
  const lst = this.calculateLocalSiderealTime(date, observer);
  
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const houseCusp = (lst + (i * 30)) % 360;
    houses.push({
      house: i + 1,
      cusp: houseCusp,
      sign: this.getZodiacSign(houseCusp)
    });
  }
  
  return houses;
}
```

Add to API in `server.js`:

```javascript
app.get('/api/houses', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const observer = new astronomy.Observer(
      req.query.lat || 37.5,
      req.query.lon || 23.0,
      0
    );
    const houses = engine.getHouses(date, observer);
    res.json(houses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Now create a `HouseSystem.js` component that fetches and displays this data!

---

## Tips for Great Components

### 1. Follow the Theme System

Always use CSS variables for colors:

```javascript
this.ctx.fillStyle = 'var(--color-accent)';  // Good
this.ctx.fillStyle = '#d4af37';              // Bad
```

### 2. Provide Clear Visual Hierarchy

```javascript
// Title: large, accent color
this.ctx.font = 'bold 24px Georgia';
this.ctx.fillStyle = 'var(--color-accent)';

// Data: medium, text color
this.ctx.font = '16px Georgia';
this.ctx.fillStyle = 'var(--color-text)';

// Labels: small, slightly dimmed
this.ctx.font = '12px Georgia';
this.ctx.fillStyle = 'rgba(240, 230, 210, 0.7)';
```

### 3. Handle Missing Data Gracefully

```javascript
render(data) {
  if (!data.planets) {
    this.showError('Planetary data not available');
    return;
  }
  
  // Continue rendering...
}
```

### 4. Make It Responsive

```javascript
constructor(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  
  // Use relative sizing
  this.maxRadius = Math.min(canvas.width, canvas.height) / 2 - 40;
  this.centerX = canvas.width / 2;
  this.centerY = canvas.height / 2;
}
```

### 5. Add Subtle Animation

```javascript
render(data) {
  // Fade in pointers
  this.ctx.globalAlpha = 0.9;
  this.drawPointers(data);
  this.ctx.globalAlpha = 1.0;
  
  // Glow effect
  const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 20);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  this.ctx.fillStyle = gradient;
  this.ctx.fill();
}
```

---

## Example: Creating a "Moon Tracker" Component

Full working example:

```javascript
class MoonTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  
  render(data) {
    if (!data.moon) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Large moon in center
    this.drawMoon(w/2, h/2, 100, data.moon);
    
    // Stats
    this.drawStats(data.moon, 40, h - 100);
  }
  
  drawMoon(x, y, radius, moon) {
    // Full disc
    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shadow for phase
    if (moon.illumination < 1) {
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.beginPath();
      const offset = radius * (1 - moon.illumination * 2);
      
      if (moon.phase < 180) {
        this.ctx.arc(x, y, radius, -Math.PI/2, Math.PI/2);
        this.ctx.arc(x + offset, y, radius, Math.PI/2, -Math.PI/2);
      } else {
        this.ctx.arc(x, y, radius, Math.PI/2, -Math.PI/2);
        this.ctx.arc(x - offset, y, radius, -Math.PI/2, Math.PI/2);
      }
      this.ctx.fill();
    }
  }
  
  drawStats(moon, x, y) {
    this.ctx.fillStyle = 'var(--color-text)';
    this.ctx.font = '16px Georgia';
    this.ctx.textAlign = 'left';
    
    const stats = [
      `Phase: ${moon.phase.toFixed(1)}°`,
      `Illumination: ${(moon.illumination * 100).toFixed(1)}%`,
      `Longitude: ${moon.longitude.toFixed(2)}°`,
      `Latitude: ${moon.latitude.toFixed(2)}°`
    ];
    
    stats.forEach((stat, i) => {
      this.ctx.fillText(stat, x, y + (i * 25));
    });
  }
}
```

---

## Sharing Your Extensions

Created something cool? The community would love to see it!

1. Create a GitHub repo
2. Include your component file
3. Add screenshots
4. Share usage instructions

**Example repo structure:**
```
my-antikythera-extension/
├── components/
│   └── MoonTracker.js
├── themes/
│   └── hologram.css
├── screenshots/
│   └── preview.png
└── README.md
```

Happy extending! 🚀
