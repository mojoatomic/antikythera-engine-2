class FrontFace {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.maxRadius = Math.min(canvas.width, canvas.height) / 2 - 80;
    
    // Planet orbital radii (concentric circles)
    this.orbits = {
      saturn: 0.95,
      jupiter: 0.85,
      mars: 0.75,
      venus: 0.65,
      mercury: 0.55,
      moon: 0.45,
      sun: 0.35
    };
    
    // Planet colors (traditional associations)
    this.colors = {
      saturn: '#8B7355',    // Brown/earth
      jupiter: '#DAA520',   // Gold
      mars: '#CD5C5C',      // Red
      venus: '#F0E68C',     // Pale yellow
      mercury: '#C0C0C0',   // Silver
      moon: '#E0E0E0',      // Bright silver
      sun: '#FFD700'        // Bright gold
    };
    
    // Zodiac symbols (names come from language manager)
    this.zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
    
    // Parapegma - Star risings/settings (names from language manager)
    this.parapegma = [
      { day: 15, key: 'pleiades', symbol: '★' },
      { day: 45, key: 'arcturus', symbol: '★' },
      { day: 75, key: 'sirius', symbol: '★' },
      { day: 105, key: 'hyades', symbol: '★' },
      { day: 135, key: 'orion', symbol: '★' },
      { day: 165, key: 'lyra', symbol: '★' },
      { day: 195, key: 'aquila', symbol: '★' },
      { day: 225, key: 'canis', symbol: '★' },
      { day: 255, key: 'cassiopeia', symbol: '★' },
      { day: 285, key: 'perseus', symbol: '★' },
      { day: 315, key: 'andromeda', symbol: '★' },
      { day: 345, key: 'pegasus', symbol: '★' }
    ];
  }
  
  render(data) {
    // Determine mount and rotation angle
    const rotate = (data && data.settings && data.settings.rotate) || (window.appSettings && window.appSettings.rotate) || 'none';
    const angle = rotate === 'ccw90' ? -Math.PI / 2 : (rotate === 'cw90' ? Math.PI / 2 : 0);

    // Reset transform, clear, then apply rotation around canvas center
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (angle !== 0) {
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.rotate(angle);
      this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    }

    // Draw from outside in - EoT rings are OUTERMOST
    this.drawEquationOfTimeRings(data);
    this.drawEgyptianCalendar(data);
    this.drawMonthNames();
    this.drawParapegmaMarkers(data);
    this.drawZodiacRing();
    this.drawDegreeScale();
    this.drawOrbitalRings();
    this.drawPlanetPointers(data);
    this.drawCenterHub();
    this.drawLabels(data);

    this.ctx.restore();
  }
  
  drawEquationOfTimeRings(data) {
    if (!data.equationOfTime || !data.sun) return;
    
    const eot = data.equationOfTime;
    const date = new Date(data.date);
    
    // Ring dimensions - OUTERMOST rings
    const outerRingRadius = this.maxRadius + 35;
    const innerRingRadius = this.maxRadius + 15;
    
    // Get sun's ecliptic longitude to rotate entire ring system
    const sunLongitude = data.sun.longitude;
    const eclipticRotation = (sunLongitude - 90) * Math.PI / 180;
    
    // === 1. OUTER RING - Mean Solar Time (Clock Time) ===
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, outerRingRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 24-hour graduations on outer ring
    for (let hour = 0; hour < 24; hour++) {
      const hourAngle = (hour * 15 - 90) * Math.PI / 180; // 15° per hour
      const angle = hourAngle + eclipticRotation; // Rotate by sun's position
      const isMajor = hour % 6 === 0;
      const tickLength = isMajor ? 15 : 8;
      
      this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
      this.ctx.lineWidth = isMajor ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.moveTo(
        this.centerX + Math.cos(angle) * (outerRingRadius - tickLength),
        this.centerY + Math.sin(angle) * (outerRingRadius - tickLength)
      );
      this.ctx.lineTo(
        this.centerX + Math.cos(angle) * outerRingRadius,
        this.centerY + Math.sin(angle) * outerRingRadius
      );
      this.ctx.stroke();
      
      // Hour labels
      if (hour % 6 === 0) {
        this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
        this.ctx.font = 'bold 10px Georgia';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const labelRadius = outerRingRadius - 25;
        this.ctx.fillText(
          hour.toString(),
          this.centerX + Math.cos(angle) * labelRadius,
          this.centerY + Math.sin(angle) * labelRadius
        );
      }
    }
    
    
    // === 2. INNER RING - Apparent Solar Time (Sundial) ===
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, innerRingRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 24-hour graduations on inner ring
    for (let hour = 0; hour < 24; hour++) {
      const hourAngle = (hour * 15 - 90) * Math.PI / 180;
      const angle = hourAngle + eclipticRotation; // Rotate by sun's position
      const isMajor = hour % 6 === 0;
      const tickLength = isMajor ? 15 : 8;
      
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      this.ctx.lineWidth = isMajor ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.moveTo(
        this.centerX + Math.cos(angle) * (innerRingRadius + tickLength),
        this.centerY + Math.sin(angle) * (innerRingRadius + tickLength)
      );
      this.ctx.lineTo(
        this.centerX + Math.cos(angle) * innerRingRadius,
        this.centerY + Math.sin(angle) * innerRingRadius
      );
      this.ctx.stroke();
      
      // Hour labels
      if (hour % 6 === 0) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 10px Georgia';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const labelRadius = innerRingRadius + 25;
        this.ctx.fillText(
          hour.toString(),
          this.centerX + Math.cos(angle) * labelRadius,
          this.centerY + Math.sin(angle) * labelRadius
        );
      }
    }
    
    
    // === 3. MARKERS showing current time of day positions ===
    
    // Calculate time of day angles (0-24 hours maps to 0-360 degrees)
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    
    // Mean solar time (clock time) - simple hour angle
    const meanTimeHours = hours + minutes / 60 + seconds / 3600;
    const meanAngle = (meanTimeHours * 15 - 90) * Math.PI / 180 + eclipticRotation;
    
    // Apparent solar time (sundial time) - adjusted by equation of time
    const eotMinutes = eot.equationOfTime.minutes;
    const apparentTimeHours = meanTimeHours + (eotMinutes / 60); // Add EoT correction
    const apparentAngle = (apparentTimeHours * 15 - 90) * Math.PI / 180 + eclipticRotation;
    
    // Mean Time marker (on outer ring) - BRONZE
    const meanMarkerX = this.centerX + Math.cos(meanAngle) * outerRingRadius;
    const meanMarkerY = this.centerY + Math.sin(meanAngle) * outerRingRadius;
    
    this.ctx.fillStyle = '#d4af37';
    this.ctx.beginPath();
    this.ctx.arc(meanMarkerX, meanMarkerY, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Apparent Time marker (on inner ring) - BRIGHT GOLD
    const apparentMarkerX = this.centerX + Math.cos(apparentAngle) * innerRingRadius;
    const apparentMarkerY = this.centerY + Math.sin(apparentAngle) * innerRingRadius;
    
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(apparentMarkerX, apparentMarkerY, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Subtle glow
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(apparentMarkerX, apparentMarkerY, 14, 0, Math.PI * 2);
    this.ctx.fill();
    
    // === 4. SUNRISE/SUNSET MARKERS ===
    
    if (data.sunVisibility && data.sunVisibility.sunrise && data.sunVisibility.sunset) {
      const vis = data.sunVisibility;
      
      // Calculate sunrise time in hours using UTC to avoid DST jumps
      const sunriseTime = new Date(vis.sunrise.time);
      const sunriseHours = sunriseTime.getUTCHours() + sunriseTime.getUTCMinutes() / 60;
      const sunriseAngle = (sunriseHours * 15 - 90) * Math.PI / 180 + eclipticRotation;
      
      // Calculate sunset time in hours using UTC to avoid DST jumps
      const sunsetTime = new Date(vis.sunset.time);
      const sunsetHours = sunsetTime.getUTCHours() + sunsetTime.getUTCMinutes() / 60;
      const sunsetAngle = (sunsetHours * 15 - 90) * Math.PI / 180 + eclipticRotation;
      
      // Sunrise marker (on both rings) - ORANGE
      const sunriseOuterX = this.centerX + Math.cos(sunriseAngle) * outerRingRadius;
      const sunriseOuterY = this.centerY + Math.sin(sunriseAngle) * outerRingRadius;
      const sunriseInnerX = this.centerX + Math.cos(sunriseAngle) * innerRingRadius;
      const sunriseInnerY = this.centerY + Math.sin(sunriseAngle) * innerRingRadius;
      
      // Sunrise marker on outer ring - solid orange circle
      this.ctx.fillStyle = '#ff6b35';
      this.ctx.beginPath();
      this.ctx.arc(sunriseOuterX, sunriseOuterY, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Sunrise label (local time) just outside the outer ring
      const showSunriseSunset = (data && data.settings && data.settings.showSunriseSunset) || (window.appSettings && window.appSettings.showSunriseSunset) || false;
      if (showSunriseSunset && vis.sunrise && vis.sunrise.time) {
        const tz = data?.observer?.timezone;
        const label = new Date(vis.sunrise.time).toLocaleTimeString('en-US', {
          timeZone: tz || undefined,
          hour: '2-digit', minute: '2-digit'
        });
        this.ctx.font = '10px Georgia';
        this.ctx.fillStyle = 'rgba(255, 107, 53, 0.9)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const srLabelR = outerRingRadius + 28;
        const srLabelX = this.centerX + Math.cos(sunriseAngle) * srLabelR;
        const srLabelY = this.centerY + Math.sin(sunriseAngle) * srLabelR;
        this.ctx.fillText(label, srLabelX, srLabelY);
      }
      
      // Sunrise line connecting rings
      this.ctx.strokeStyle = 'rgba(255, 107, 53, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(sunriseInnerX, sunriseInnerY);
      this.ctx.lineTo(sunriseOuterX, sunriseOuterY);
      this.ctx.stroke();
      
      // Sunset marker (on both rings) - ORANGE/RED with moon phase
      const sunsetOuterX = this.centerX + Math.cos(sunsetAngle) * outerRingRadius;
      const sunsetOuterY = this.centerY + Math.sin(sunsetAngle) * outerRingRadius;
      const sunsetInnerX = this.centerX + Math.cos(sunsetAngle) * innerRingRadius;
      const sunsetInnerY = this.centerY + Math.sin(sunsetAngle) * innerRingRadius;
      
      // Draw moon phase at sunset position
      if (data.moon) {
        this.drawMoonPhase(
          sunsetOuterX,
          sunsetOuterY,
          10,
          data.moon.illumination,
          data.moon.phase
        );
      } else {
        // Fallback to moon icon if no moon data
        this.ctx.fillStyle = '#ff8c35';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('🌙', sunsetOuterX, sunsetOuterY);
      }
      
      // Sunset line connecting rings
      this.ctx.strokeStyle = 'rgba(255, 140, 53, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(sunsetInnerX, sunsetInnerY);
      this.ctx.lineTo(sunsetOuterX, sunsetOuterY);
      this.ctx.stroke();

      // Sunset label (local time) just outside the outer ring, near moon marker
      if (showSunriseSunset && vis.sunset && vis.sunset.time) {
        const tz = data?.observer?.timezone;
        const label = new Date(vis.sunset.time).toLocaleTimeString('en-US', {
          timeZone: tz || undefined,
          hour: '2-digit', minute: '2-digit'
        });
        this.ctx.font = '10px Georgia';
        this.ctx.fillStyle = 'rgba(240, 230, 210, 0.9)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const ssLabelR = outerRingRadius + 36;
        const ssLabelX = this.centerX + Math.cos(sunsetAngle) * ssLabelR;
        const ssLabelY = this.centerY + Math.sin(sunsetAngle) * ssLabelR;
        this.ctx.fillText(label, ssLabelX, ssLabelY);
      }
      
      // Daylight arc (between sunrise and sunset on outer ring)
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
      this.ctx.lineWidth = 8;
      this.ctx.beginPath();
      // Draw arc from sunrise to sunset (clockwise)
      if (sunsetAngle > sunriseAngle) {
        this.ctx.arc(this.centerX, this.centerY, outerRingRadius, sunriseAngle, sunsetAngle);
      } else {
        // Handle crossing midnight
        this.ctx.arc(this.centerX, this.centerY, outerRingRadius, sunriseAngle, sunsetAngle + Math.PI * 2);
      }
      this.ctx.stroke();
    }
    
    // === 5. Current EoT value display (Top Right) ===
    const eotValue = eot.equationOfTime.minutes;
    const eotStatusKey = eotValue > 0 ? 'sundial_ahead' : 'sundial_behind';
    
    this.ctx.font = '11px Georgia';
    this.ctx.fillStyle = 'rgba(240, 230, 210, 0.7)';
    this.ctx.textAlign = 'right';
    //this.ctx.fillText(languageManager.t(`front_face.${eotStatusKey}`), this.canvas.width - 20, 60);
    const padding = 15;
    const lineHeight = 18;
    this.ctx.fillText(languageManager.t(`front_face.${eotStatusKey}`), this.canvas.width - padding, padding + lineHeight * 2);
  }
  
  drawEgyptianCalendar(data) {
    // Outermost ring - 360 day Egyptian calendar with DETAILED graduations
    const outerRadius = this.maxRadius;
    const innerRadius = this.maxRadius - 35;
    
    // Ring background
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, outerRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, innerRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw EVERY day (360 tick marks!)
    for (let day = 0; day < 360; day++) {
      const angle = (day - 90) * Math.PI / 180;
      
      // Every 5th day is longer
      const isMultipleOf5 = day % 5 === 0;
      // Every 10th day is even longer
      const isMultipleOf10 = day % 10 === 0;
      // Every 30th day (month boundary) is longest
      const isMonthBoundary = day % 30 === 0;
      
      let tickLength;
      let lineWidth;
      
      if (isMonthBoundary) {
        tickLength = 30;
        lineWidth = 3;
      } else if (isMultipleOf10) {
        tickLength = 20;
        lineWidth = 2;
      } else if (isMultipleOf5) {
        tickLength = 12;
        lineWidth = 1.5;
      } else {
        tickLength = 6;
        lineWidth = 1;
      }
      
      const x1 = this.centerX + Math.cos(angle) * (outerRadius - tickLength);
      const y1 = this.centerY + Math.sin(angle) * (outerRadius - tickLength);
      const x2 = this.centerX + Math.cos(angle) * outerRadius;
      const y2 = this.centerY + Math.sin(angle) * outerRadius;
      
      this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      
      // Add day numbers every 10 days
      if (isMultipleOf10 && day > 0) {
        this.ctx.fillStyle = 'rgba(240, 230, 210, 0.7)';
        this.ctx.font = '9px Georgia';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const textAngle = angle;
        const textRadius = outerRadius - 15;
        const tx = this.centerX + Math.cos(textAngle) * textRadius;
        const ty = this.centerY + Math.sin(textAngle) * textRadius;
        
        // Day number within month (1-30)
        const dayInMonth = (day % 30) || 30;
        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.rotate(textAngle + Math.PI / 2);
        this.ctx.fillText(dayInMonth.toString(), 0, 0);
        this.ctx.restore();
      }
    }
    
    // Egyptian calendar pointer
    if (data.egyptianCalendar) {
      const dayAngle = (data.egyptianCalendar.dayOfYear - 90) * Math.PI / 180;
      this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.lineTo(
        this.centerX + Math.cos(dayAngle) * (outerRadius - 12),
        this.centerY + Math.sin(dayAngle) * (outerRadius - 12)
      );
      this.ctx.stroke();
    }
  }
  
  drawMonthNames() {
    // Draw month names around the calendar (from language manager)
    const radius = this.maxRadius - 48;
    
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 11px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 + 15 - 90) * Math.PI / 180; // Center of each month
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle + Math.PI / 2);
      this.ctx.fillText(languageManager.getMonthName(i + 1), 0, 0);
      this.ctx.restore();
    }
  }
  
  drawParapegmaMarkers(_data) {
    // Parapegma - star rising/setting calendar (from language manager)
    // Align with month names at same radius
    const radius = this.maxRadius - 48;
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.parapegma.forEach(entry => {
      const angle = (entry.day - 90) * Math.PI / 180;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle + Math.PI / 2);
      
      // Star name (from language manager) - below the month name position
      this.ctx.fillStyle = 'rgba(240, 230, 210, 0.6)';
      this.ctx.font = '9px Georgia';
      this.ctx.fillText(languageManager.t(`parapegma.${entry.key}`), 0, 12);
      
      this.ctx.restore();
    });
  }
  
  drawZodiacRing() {
    const radius = this.maxRadius - 80;
    
    // Draw zodiac circle
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Inner circle for zodiac band
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, radius - 30, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw zodiac signs
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 12; i++) {
      // const angle = (i * 30 - 90) * Math.PI / 180;
      const angle = (i * 30 - 15) * Math.PI / 180;

      const x = this.centerX + Math.cos(angle) * (radius - 15);
      const y = this.centerY + Math.sin(angle) * (radius - 15);
      
      // Zodiac symbol
      this.ctx.fillText(this.zodiacSymbols[i], x, y);
    }
  }
  
  drawZodiacNames() {
    // Draw zodiac names (from language manager)
    const radius = this.maxRadius - 115;
    
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 10px Georgia';
    this.ctx.textAlign = 'center';
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 + 15 - 90) * Math.PI / 180; // Center of sign
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle + Math.PI / 2);
      this.ctx.fillText(languageManager.getZodiacName(i), 0, 0);
      this.ctx.restore();
    }
  }
  
  drawDegreeScale() {
    // Fine degree markings (every 5 degrees)
    const _outerR = this.maxRadius - 110;
    const innerR = this.maxRadius - 120;
    
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    
    for (let deg = 0; deg < 360; deg += 5) {
      const angle = (deg - 90) * Math.PI / 180;
      
      // Every 10 degrees is longer
      const isMultipleOf10 = deg % 10 === 0;
      const tickLength = isMultipleOf10 ? 8 : 4;
      const lineWidth = isMultipleOf10 ? 1.5 : 0.8;
      
      const x1 = this.centerX + Math.cos(angle) * innerR;
      const y1 = this.centerY + Math.sin(angle) * innerR;
      const x2 = this.centerX + Math.cos(angle) * (innerR + tickLength);
      const y2 = this.centerY + Math.sin(angle) * (innerR + tickLength);
      
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }
  
  drawOrbitalRings() {
    // Draw concentric circles for each planet
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    this.ctx.lineWidth = 1;
    
    Object.entries(this.orbits).forEach(([_body, ratio]) => {
      const radius = (this.maxRadius - 70) * ratio;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    });
  }
  
  drawPlanetPointers(data) {
    if (!data.planets) return;
    
    // Draw each planet pointer
    const bodies = ['saturn', 'jupiter', 'mars', 'venus', 'mercury'];
    
    bodies.forEach(planet => {
      if (!data.planets[planet]) return;
      
      const longitude = data.planets[planet].longitude;
      const angle = (longitude - 90) * Math.PI / 180;
      const radius = (this.maxRadius - 70) * this.orbits[planet];
      
      // Pointer line
      this.ctx.strokeStyle = this.colors[planet];
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.lineTo(
        this.centerX + Math.cos(angle) * radius,
        this.centerY + Math.sin(angle) * radius
      );
      this.ctx.stroke();
      
      // Planet marker
      this.ctx.fillStyle = this.colors[planet];
      this.ctx.beginPath();
      this.ctx.arc(
        this.centerX + Math.cos(angle) * radius,
        this.centerY + Math.sin(angle) * radius,
        6,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      
      // Outer ring
      this.ctx.strokeStyle = 'var(--color-text, #f0e6d2)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });
    
    // Moon pointer with phase
    if (data.moon) {
      const moonAngle = (data.moon.longitude - 90) * Math.PI / 180;
      const moonRadius = (this.maxRadius - 70) * this.orbits.moon;
      
      this.ctx.strokeStyle = this.colors.moon;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.lineTo(
        this.centerX + Math.cos(moonAngle) * moonRadius,
        this.centerY + Math.sin(moonAngle) * moonRadius
      );
      this.ctx.stroke();
      
      // Moon phase ball
      this.drawMoonPhase(
        this.centerX + Math.cos(moonAngle) * moonRadius,
        this.centerY + Math.sin(moonAngle) * moonRadius,
        10,
        data.moon.illumination,
        data.moon.phase
      );
    }
    
    // Sun pointer (brightest, innermost)
    if (data.sun) {
      const sunAngle = (data.sun.longitude - 90) * Math.PI / 180;
      const sunRadius = (this.maxRadius - 70) * this.orbits.sun;
      
      this.ctx.strokeStyle = this.colors.sun;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.lineTo(
        this.centerX + Math.cos(sunAngle) * sunRadius,
        this.centerY + Math.sin(sunAngle) * sunRadius
      );
      this.ctx.stroke();
      
      // Sun marker with rays
      const sunX = this.centerX + Math.cos(sunAngle) * sunRadius;
      const sunY = this.centerY + Math.sin(sunAngle) * sunRadius;
      
      // Outer glow
      const gradient = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 12);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(0.5, '#FFA500');
      gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Core
      this.ctx.fillStyle = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  drawMoonPhase(x, y, radius, illumination, phase) {
    // Full circle
    this.ctx.fillStyle = this.colors.moon;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shadow based on illumination
    if (illumination < 1) {
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.beginPath();
      const shadowOffset = radius * (1 - illumination * 2);
      
      if (phase < 180) {
        // Waning - shadow on right
        this.ctx.arc(x, y, radius, -Math.PI/2, Math.PI/2);
        this.ctx.arc(x + shadowOffset, y, radius, Math.PI/2, -Math.PI/2);
      } else {
        // Waxing - shadow on left
        this.ctx.arc(x, y, radius, Math.PI/2, -Math.PI/2);
        this.ctx.arc(x - shadowOffset, y, radius, -Math.PI/2, Math.PI/2);
      }
      this.ctx.fill();
    }
    
    // Border
    this.ctx.strokeStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  drawCenterHub() {
    // Center hub with decorative rings
    const hubRadius = 25;
    
    // Outer ring
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, hubRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Center disc
    this.ctx.fillStyle = '#8b7355';
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, hubRadius - 5, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner accent ring
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, hubRadius - 10, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  drawLabels(data) {
    const padding = 15;
    const lineHeight = 18;
    
    // ========== UPPER LEFT: Dual Time Display ==========
    this.ctx.textAlign = 'left';
    
    // Get timezone for conversion
    const upperLeftTz = data?.observer?.timezone;
    const upperLeftDate = new Date(data.date);
    
    // Calculate Mean Time (clock time) - convert UTC to local
    const meanTimeStr = upperLeftDate.toLocaleTimeString('en-US', {
      timeZone: upperLeftTz || undefined,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Calculate Sundial Time (apparent solar time) using EoT
    let sundialTimeStr = meanTimeStr; // Fallback
    if (data.equationOfTime) {
      const eotMinutes = data.equationOfTime.equationOfTime.minutes;
      const sundialDate = new Date(upperLeftDate.getTime() + eotMinutes * 60 * 1000);
      sundialTimeStr = sundialDate.toLocaleTimeString('en-US', {
        timeZone: upperLeftTz || undefined,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Mean Time label and value
    this.ctx.font = 'bold 11px Georgia';
    this.ctx.fillStyle = '#d4af37'; // Bronze for mean time
    this.ctx.fillText(
      languageManager.t('front_face.mean_time'),
      padding,
      padding + lineHeight
    );
    
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.fillStyle = '#d4af37';
    this.ctx.fillText(
      meanTimeStr,
      padding,
      padding + lineHeight * 2
    );
    
    // Sundial Time label and value
    this.ctx.font = 'bold 11px Georgia';
    this.ctx.fillStyle = '#FFD700'; // Gold for sundial time
    this.ctx.fillText(
      languageManager.t('front_face.sundial_time'),
      padding,
      padding + lineHeight * 3.5
    );
    
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(
      sundialTimeStr,
      padding,
      padding + lineHeight * 4.5
    );
    
    // ========== UPPER RIGHT: Equation of Time ==========
    if (data.equationOfTime) {
      this.ctx.textAlign = 'right';
      const eot = data.equationOfTime.equationOfTime;
      const eotMins = Math.abs(eot.minutes);
      
      this.ctx.fillStyle = '#ff6b35';
      this.ctx.font = 'bold 16px Georgia';
      this.ctx.fillText(
        `${eot.minutes > 0 ? '+' : '−'}${eotMins.toFixed(1)} min`,
        this.canvas.width - padding,
        padding + lineHeight
      );
    }
    
    // ========== LOWER LEFT: Zodiac + Egyptian Calendar ==========
    this.ctx.textAlign = 'left';
    
    if (data.zodiac) {
      const zodiacName = languageManager.getZodiacName(data.zodiac.signIndex);
      this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
      this.ctx.font = 'bold 13px Georgia';
      this.ctx.fillText(
        `${zodiacName} ${data.zodiac.degreeInSign.toFixed(1)}°`,
        padding,
        this.canvas.height - padding - lineHeight * 2
      );
    }
    
    if (data.egyptianCalendar) {
      // Show full Gregorian date with year, using observer timezone when available
      const tz = data?.observer?.timezone;
      const dateObj = new Date(data.date);
      const dateStr = dateObj.toLocaleDateString('en-US', {
        timeZone: tz || undefined,
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      this.ctx.font = '11px Georgia';
      this.ctx.fillStyle = 'rgba(240, 230, 210, 0.8)';
      this.ctx.fillText(
        dateStr,
        padding,
        this.canvas.height - padding - lineHeight
      );
    }
    
    // ========== LOWER RIGHT: Location + Real-time Clock ==========
    this.ctx.textAlign = 'right';
    let lowerRightY = this.canvas.height - padding;
    
    // Display time (controlled) using observer timezone when available
    {
      const tz = data && data.observer && data.observer.timezone ? data.observer.timezone : undefined;
      const t = new Date(data && data.date ? data.date : Date.now());
      const timeStr = t.toLocaleTimeString('en-US', {
        timeZone: tz || undefined,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
      this.ctx.fillStyle = 'var(--color-pointer, #ffaa00)';
      this.ctx.font = 'bold 16px "Courier New", monospace';
      this.ctx.fillText(
        timeStr,
        this.canvas.width - padding,
        lowerRightY - lineHeight * 3
      );
    }
    
    // Location information
    if (data.observer && (data.observer.city || data.observer.name || (typeof data.observer.latitude === 'number' && typeof data.observer.longitude === 'number'))) {
      const source = data.observer.source || 'unknown';
      
      // Source icon based on source type
      let sourceIcon = '📍';
      if (source === 'env' || source === 'env_config') {
        sourceIcon = '⚙️';
      } else if (source === 'ip_geolocation') {
        sourceIcon = '🌐';
      } else if (source === 'control') {
        sourceIcon = '🎛️';
      } else if (source === 'fallback') {
        sourceIcon = '📍';
      }
      
      // Primary location label: city/state, else provided name, else blank
      this.ctx.font = 'bold 11px Georgia';
      this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
      let locationText;
      if (data.observer.city) {
        locationText = data.observer.state ? `${data.observer.city}, ${data.observer.state}` : data.observer.city;
      } else if (data.observer.name) {
        // Skip displaying name if it's just coordinates (fallback format from server)
        const isCoordinatesFallback = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(data.observer.name);
        locationText = isCoordinatesFallback ? '' : data.observer.name;
      } else {
        locationText = '';
      }
      if (locationText) {
        this.ctx.fillText(
          `${sourceIcon} ${locationText}`,
          this.canvas.width - padding,
          lowerRightY - lineHeight * 2
        );
      }
      
      // Coordinates (when available)
      if (typeof data.observer.latitude === 'number' && typeof data.observer.longitude === 'number') {
        this.ctx.font = '9px Georgia';
        this.ctx.fillStyle = 'rgba(240, 230, 210, 0.6)';
        const lat = Math.abs(data.observer.latitude).toFixed(2);
        const latDir = data.observer.latitude >= 0 ? 'N' : 'S';
        const lon = Math.abs(data.observer.longitude).toFixed(2);
        const lonDir = data.observer.longitude >= 0 ? 'E' : 'W';
        this.ctx.fillText(
          `${lat}°${latDir} ${lon}°${lonDir}`,
          this.canvas.width - padding,
          lowerRightY - lineHeight
        );
      }
    }
  }
}
