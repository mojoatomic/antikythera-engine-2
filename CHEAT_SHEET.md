# Quick Reference Cheat Sheet

## 🚀 Getting Started

```bash
# Install
npm install

# Run
npm start

# Open
http://localhost:3000
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause animation |
| `←` | Previous face (Focus mode) |
| `→` | Next face (Focus mode) |

## 🎨 Themes

| Theme | Best For |
|-------|----------|
| Ancient Bronze | Museum, historical |
| Restored Bronze | Office, presentations |
| Steampunk | Creative spaces |
| Minimal | Modern offices |
| Dark Mode | Home theaters, OLED |

## 📐 Layouts

| Layout | Description |
|--------|-------------|
| Gallery | All three faces side-by-side |
| Hero | Single large front face only |
| Focus | One at a time, arrow navigation |

## 🎯 API Quick Reference

```bash
# Current state
GET http://localhost:3000/api/state

# Specific date
GET http://localhost:3000/api/state/2024-12-31T23:59:59Z

# Just sun
GET http://localhost:3000/api/sun

# Just moon  
GET http://localhost:3000/api/moon

# Just planets
GET http://localhost:3000/api/planets
```

## 📊 What Each Face Shows

### Front Face
- ☉ Sun
- ☽ Moon (with phase)
- ☿ Mercury
- ♀ Venus
- ♂ Mars  
- ♃ Jupiter
- ♄ Saturn
- 12 Zodiac signs
- Egyptian calendar

### Back Upper
- Metonic 19-year cycle
- Callippic 76-year sub-dial
- Current year indicator

### Back Lower
- Saros eclipse cycle
- Eclipse type markers (☉☽)
- Exeligmos 54-year sub-dial
- Next eclipse countdown

## 🎨 Adding a Theme

```css
[data-theme="mytheme"] {
    --bg-primary: gradient-here;
    --bg-dial: gradient-here;
    --color-accent: #color;
    --color-pointer: #color;
    --color-text: #color;
}
```

```html
<option value="mytheme">My Theme</option>
```

## 🔧 Creating a Component

```javascript
class MyComponent {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  
  render(data) {
    // Your code here
  }
}
```

## 📁 File Structure

```
engine.js              Backend calculations
server.js              API server
public/
  index.html          Main page
  display.js          Controller
  components/
    FrontFace.js      All planets
    BackUpperFace.js  Metonic cycle
    BackLowerFace.js  Saros cycle
```

## 🐛 Troubleshooting

### Server won't start
```bash
# Check port 3000 is free
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Can't connect to API
- Is server running? `npm start`
- Check console for errors
- Try: `http://localhost:3000/api/state`

### Blank display
- Check browser console (F12)
- Verify API is responding
- Try refreshing page

### Animation stuttering
- Close other browser tabs
- Reduce canvas size
- Stop other animations

## 💡 Quick Tips

### Best Viewing
- Gallery layout on wide screens
- Hero layout on square displays
- Focus layout for touch screens

### Performance
- Dark Mode uses less power on OLED
- Lower canvas resolution if slow
- Stop animation when not viewing

### Presentations
- Focus layout for clicking through
- Minimal theme for clarity
- Jump to specific dates for demos

### Installation
- Works on any static host
- Backend needs Node.js
- No database required

## 📱 Mobile Tips

- Hero layout works best
- Touch to pause/play
- Swipe in Focus mode
- Portrait orientation OK

## 🎓 Educational Use

### Classroom
```javascript
// Jump to important dates
"2024-06-21" // Summer solstice
"2024-12-21" // Winter solstice  
"2024-03-20" // Spring equinox
"2024-09-22" // Fall equinox
```

### Demos
1. Start on "Now"
2. Explain each face
3. Jump to eclipse date
4. Show Saros prediction
5. Animate through month

## 🔍 Interesting Dates to Try

```
2024-04-08  Total solar eclipse
2024-10-14  Annular solar eclipse
2025-03-14  Total lunar eclipse
2026-08-12  Total solar eclipse
```

## 🎬 Animation Speeds

Current: 1 day per 100ms = ~10 days/sec

To change: Edit `display.js`
```javascript
setInterval(() => {
  currentDate.setDate(currentDate.getDate() + 1); // Change this
}, 100); // Or change this
```

## 📊 Data Flow

```
User Action
    ↓
display.js (controller)
    ↓
Fetch from API
    ↓
server.js (Express)
    ↓
engine.js (calculations)
    ↓
astronomy-engine (library)
    ↓
← Returns data
    ↓
Components render
    ↓
Canvas displays
```

## 🌟 Cool Demos

### Planetary Conjunction
Set to date when planets align, watch them meet

### Eclipse Prediction  
Jump to date, see Saros prediction was correct

### Retrograde Motion
Animate and watch Mars move backward

### Moon Phases
Animate through month, watch moon change

### Seasonal Changes
Animate through year, watch sun through zodiac

## 📞 Support

- Check README.md for details
- Read VISUAL_GUIDE.md for face info
- See EXTENSION_GUIDE.md for customization
- Review PROJECT_SUMMARY.md for architecture

## 🎉 One-Line Install & Run

```bash
npm install && npm start
```

That's it! 🚀
