## Arduino Integration

### Stepper Motors
The `/api/display` endpoint provides `stepsForInterval` for each celestial body:
```javascript
const response = await fetch('/api/display?interval=1000');
// data.mechanical.steppers.mars.stepsForInterval = 147
```

Send this value directly to your Arduino stepper library.

### Servo Calibration
The API provides theoretical servo angles (0-360°). **Your physical mechanism will require calibration**.

Create a calibration lookup table based on your hardware:
```cpp
// Arduino example - YOUR VALUES WILL DIFFER
int calibrate(int rawAngle) {
  // Measure actual angles on your hardware
  // and build your own lookup table
  if (rawAngle == 0) return 2;
  if (rawAngle == 90) return 88;
  // ... etc
}
```

Calibration is **implementation-specific** - test your mechanism and adjust accordingly.
