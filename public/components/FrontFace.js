class FrontFace {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.maxRadius = Math.min(canvas.width, canvas.height) / 2 - 40;
    
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
    
    // Zodiac with Greek names
    this.zodiacSigns = [
      { symbol: '♈', name: 'ΚΡΙΟΣ', latin: 'Aries' },
      { symbol: '♉', name: 'ΤΑΥΡΟΣ', latin: 'Taurus' },
      { symbol: '♊', name: 'ΔΙΔΥΜΟΙ', latin: 'Gemini' },
      { symbol: '♋', name: 'ΚΑΡΚΙΝΟΣ', latin: 'Cancer' },
      { symbol: '♌', name: 'ΛΕΩΝ', latin: 'Leo' },
      { symbol: '♍', name: 'ΠΑΡΘΕΝΟΣ', latin: 'Virgo' },
      { symbol: '♎', name: 'ΖΥΓΟΣ', latin: 'Libra' },
      { symbol: '♏', name: 'ΣΚΟΡΠΙΟΣ', latin: 'Scorpio' },
      { symbol: '♐', name: 'ΤΟΞΟΤΗΣ', latin: 'Sagittarius' },
      { symbol: '♑', name: 'ΑΙΓΟΚΕΡΩΣ', latin: 'Capricorn' },
      { symbol: '♒', name: 'ΥΔΡΟΧΟΟΣ', latin: 'Aquarius' },
      { symbol: '♓', name: 'ΙΧΘΥΕΣ', latin: 'Pisces' }
    ];
    
    // Egyptian/Greek month names
    this.monthNames = [
      'ΦΑΩΦΙ', 'ΑΘΥΡ', 'ΧΟΙΑΚ', 'ΤΥΒΙ', 'ΜΕΧΕΙΡ', 'ΦΑΜΕΝΩΘ',
      'ΦΑΡΜΟΥΘΙ', 'ΠΑΧΩΝ', 'ΠΑΥΝΙ', 'ΕΠΕΙΦ', 'ΜΕΣΟΡΗ', 'ΘΩΥΘ'
    ];
    
    // Parapegma - Star risings/settings (simplified examples)
    this.parapegma = [
      { day: 15, text: 'ΠΛΕΙΑΔΕΣ', symbol: '★' },   // Pleiades
      { day: 45, text: 'ΑΡΚΤΟΥΡΟΣ', symbol: '★' },  // Arcturus
      { day: 75, text: 'ΣΕΙΡΙΟΣ', symbol: '★' },    // Sirius
      { day: 105, text: 'ΥΑΔΕΣ', symbol: '★' },     // Hyades
      { day: 135, text: 'ΩΡΙΩΝ', symbol: '★' },     // Orion
      { day: 165, text: 'ΛΥΡΑ', symbol: '★' },      // Lyra
      { day: 195, text: 'ΑΕΤΟΣ', symbol: '★' },     // Aquila
      { day: 225, text: 'ΚΥΩΝ', symbol: '★' },      // Canis
      { day: 255, text: 'ΚΑΣΣΙΟΠΕΙΑ', symbol: '★' }, // Cassiopeia
      { day: 285, text: 'ΠΕΡΣΕΥΣ', symbol: '★' },   // Perseus
      { day: 315, text: 'ΑΝΔΡΟΜΕΔΑ', symbol: '★' }, // Andromeda
      { day: 345, text: 'ΠΗΓΑΣΟΣ', symbol: '★' }    // Pegasus
    ];
  }
  
  render(data) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw from outside in - EoT rings are OUTERMOST
    this.drawEquationOfTimeRings(data);
    this.drawEgyptianCalendar(data);
    this.drawMonthNames();
    this.drawParapegmaMarkers(data);
    this.drawZodiacRing();
    this.drawZodiacNames();
    this.drawDegreeScale();
    this.drawOrbitalRings();
    this.drawPlanetPointers(data);
    this.drawCenterHub();
    this.drawLabels(data);
  }
  
  drawEquationOfTimeRings(data) {
    if (!data.equationOfTime) return;
    
    const eot = data.equationOfTime;
    const date = new Date(data.date);
    
    // Ring dimensions - OUTERMOST rings
    const outerRingRadius = this.maxRadius + 50;
    const innerRingRadius = this.maxRadius + 30;
    
    // === 1. OUTER RING - Mean Solar Time (Clock Time) ===
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, outerRingRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 24-hour graduations on outer ring
    for (let hour = 0; hour < 24; hour++) {
      const angle = (hour * 15 - 90) * Math.PI / 180; // 15° per hour
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
    
    // Label for outer ring
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 11px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ΜΕΣΗ ΩΡΑ', this.centerX, this.centerY - outerRingRadius - 10);
    this.ctx.font = '9px Georgia';
    this.ctx.fillStyle = 'rgba(240, 230, 210, 0.7)';
    this.ctx.fillText('(Mean Time)', this.centerX, this.centerY - outerRingRadius);
    
    // === 2. INNER RING - Apparent Solar Time (Sundial) ===
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, innerRingRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 24-hour graduations on inner ring
    for (let hour = 0; hour < 24; hour++) {
      const angle = (hour * 15 - 90) * Math.PI / 180;
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
    
    // Label for inner ring
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 11px Georgia';
    this.ctx.fillText('ΦΑΙΝΟΜΕΝΗ ΩΡΑ', this.centerX, this.centerY - innerRingRadius + 15);
    this.ctx.font = '9px Georgia';
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    this.ctx.fillText('(Apparent Time)', this.centerX, this.centerY - innerRingRadius + 25);
    
    // === 3. MARKERS showing current time of day positions ===
    
    // Calculate time of day angles (0-24 hours maps to 0-360 degrees)
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // Mean solar time (clock time) - simple hour angle
    const meanTimeHours = hours + minutes / 60 + seconds / 3600;
    const meanAngle = (meanTimeHours * 15 - 90) * Math.PI / 180; // 15° per hour
    
    // Apparent solar time (sundial time) - adjusted by equation of time
    const eotMinutes = eot.equationOfTime.minutes;
    const apparentTimeHours = meanTimeHours + (eotMinutes / 60); // Add EoT correction
    const apparentAngle = (apparentTimeHours * 15 - 90) * Math.PI / 180;
    
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
    
    // === 5. Current EoT value display (Top Right) ===
    const eotValue = eot.equationOfTime.minutes;
    const eotStatus = eotValue > 0 ? 'AHEAD' : 'BEHIND';
    
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 14px Georgia';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Equation of Time:', this.canvas.width - 20, 60);
    
    this.ctx.font = 'bold 16px Georgia';
    this.ctx.fillStyle = eotValue > 0 ? '#FFD700' : '#d4af37';
    const eotText = eotValue > 0 ? `+${eotValue.toFixed(1)}` : eotValue.toFixed(1);
    this.ctx.fillText(`${eotText} min`, this.canvas.width - 20, 80);
    
    this.ctx.font = '11px Georgia';
    this.ctx.fillStyle = 'rgba(240, 230, 210, 0.7)';
    this.ctx.fillText(`Sundial ${eotStatus}`, this.canvas.width - 20, 95);
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
    // Draw Greek month names around the calendar
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
      this.ctx.fillText(this.monthNames[i], 0, 0);
      this.ctx.restore();
    }
  }
  
  drawParapegmaMarkers(data) {
    // Parapegma - star rising/setting calendar
    const radius = this.maxRadius - 55;
    
    this.ctx.fillStyle = 'rgba(240, 230, 210, 0.6)';
    this.ctx.font = '10px Georgia';
    
    this.parapegma.forEach(entry => {
      const angle = (entry.day - 90) * Math.PI / 180;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      // Star symbol
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      this.ctx.fillText(entry.symbol, x, y);
      
      // Greek text for star name
      this.ctx.fillStyle = 'rgba(240, 230, 210, 0.5)';
      this.ctx.font = '7px Georgia';
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle + Math.PI / 2);
      this.ctx.fillText(entry.text, 8, 0);
      this.ctx.restore();
      this.ctx.font = '10px Georgia';
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
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const x = this.centerX + Math.cos(angle) * (radius - 15);
      const y = this.centerY + Math.sin(angle) * (radius - 15);
      
      // Zodiac symbol
      this.ctx.fillText(this.zodiacSigns[i].symbol, x, y);
      
      // Major division lines (30° boundaries)
      this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX + Math.cos(angle) * (radius - 30), this.centerY + Math.sin(angle) * (radius - 30));
      this.ctx.lineTo(this.centerX + Math.cos(angle) * (radius + 10), this.centerY + Math.sin(angle) * (radius + 10));
      this.ctx.stroke();
    }
  }
  
  drawZodiacNames() {
    // Draw Greek zodiac names
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
      this.ctx.fillText(this.zodiacSigns[i].name, 0, 0);
      this.ctx.restore();
    }
  }
  
  drawDegreeScale() {
    // Fine degree markings (every 5 degrees)
    const outerR = this.maxRadius - 110;
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
    
    Object.entries(this.orbits).forEach(([body, ratio]) => {
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
    // Title in Greek style
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 20px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ΠΡΟΣΟΨΙΣ', this.centerX, 25); // "FRONT FACE" in Greek
    
    // Current zodiac sign and detailed info
    if (data.zodiac) {
      this.ctx.font = '14px Georgia';
      this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
      const signIndex = data.zodiac.signIndex;
      this.ctx.fillText(
        `${this.zodiacSigns[signIndex].name} ${data.zodiac.degreeInSign.toFixed(1)}°`,
        this.centerX,
        this.canvas.height - 40
      );
    }
    
    // Egyptian month and day
    if (data.egyptianCalendar) {
      this.ctx.font = '12px Georgia';
      this.ctx.fillStyle = 'rgba(240, 230, 210, 0.8)';
      const monthIdx = Math.min(data.egyptianCalendar.month - 1, 11);
      this.ctx.fillText(
        `${this.monthNames[monthIdx]} ${data.egyptianCalendar.day}`,
        this.centerX,
        this.canvas.height - 20
      );
    }
  }
}
