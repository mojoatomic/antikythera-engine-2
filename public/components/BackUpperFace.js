class BackUpperFace {
  constructor(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.centerX = canvas.width / 2;
  this.centerY = canvas.height / 2;
  
  // Calculate groove parameters to fit canvas
  this.numGrooves = 19; // 19 years
  
  // Available radius (leave margin for labels and subdial)
  const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 80;
  
  // Calculate groove width to fit all 19 grooves
  this.startRadius = 40;
  const availableSpace = maxRadius - this.startRadius;
  const totalGapSpace = 18 * 4; // 4px gap between grooves
  const totalGrooveSpace = availableSpace - totalGapSpace;
  
  this.grooveWidth = Math.floor(totalGrooveSpace / this.numGrooves);
  this.grooveGap = 4;
  
  this.monthsPerGroove = 235 / 19; // ~12.37 months per year
}
  
  render(data) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawTitle();
    this.drawGroovedSpiral();
    this.drawYearMarkers();
    this.drawMonthTicks();
    this.drawCurrentPosition(data);
    this.drawSubDials(data);
    this.drawInfo(data);
  }
  
  drawTitle() {
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 18px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Metonic Cycle', this.centerX, 30);
  }
  
  drawGroovedSpiral() {
    // Draw concentric circular grooves (like vinyl records or parking garage levels)
    for (let turn = 0; turn < this.numGrooves; turn++) {
      const innerRadius = this.startRadius + (turn * (this.grooveWidth + this.grooveGap));
      const outerRadius = innerRadius + this.grooveWidth;
      const midRadius = (innerRadius + outerRadius) / 2;
      
      // Draw groove channel with 3D depth effect
      const gradient = this.ctx.createRadialGradient(
        this.centerX, this.centerY, innerRadius,
        this.centerX, this.centerY, outerRadius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.15)');
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, outerRadius, 0, Math.PI * 2);
      this.ctx.arc(this.centerX, this.centerY, innerRadius, 0, Math.PI * 2, true);
      this.ctx.fill();
      
      // Draw outer edge of groove
      this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, outerRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Draw inner edge of groove (lighter)
      this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, innerRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Draw mid-line for reference
      this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([2, 2]);
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, midRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }
  
  drawMonthTicks() {
    // Draw tick marks for months along the grooves
    const totalMonths = 235; // Metonic cycle = 235 lunar months
    
    for (let month = 0; month < totalMonths; month++) {
      const year = Math.floor(month / this.monthsPerGroove);
      const monthInYear = month % this.monthsPerGroove;
      
      if (year >= this.numGrooves) continue;
      
      const midRadius = this.startRadius + (year * (this.grooveWidth + this.grooveGap)) + this.grooveWidth / 2;
      const angle = (monthInYear / this.monthsPerGroove) * Math.PI * 2 - Math.PI / 2;
      
      // Longer tick every 12 months (roughly), shorter for others
      const isYearBoundary = (month % 12 === 0);
      const tickLength = isYearBoundary ? 10 : 5;
      const lineWidth = isYearBoundary ? 2 : 1;
      const opacity = isYearBoundary ? 0.7 : 0.4;
      
      const innerTickRadius = midRadius - tickLength / 2;
      const outerTickRadius = midRadius + tickLength / 2;
      
      const x1 = this.centerX + Math.cos(angle) * innerTickRadius;
      const y1 = this.centerY + Math.sin(angle) * innerTickRadius;
      const x2 = this.centerX + Math.cos(angle) * outerTickRadius;
      const y2 = this.centerY + Math.sin(angle) * outerTickRadius;
      
      this.ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }
  
  drawYearMarkers() {
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Label each year on the groove
    for (let year = 1; year <= 19; year++) {
      const radius = this.startRadius + ((year - 1) * (this.grooveWidth + this.grooveGap)) + this.grooveWidth / 2;
      const angle = -Math.PI / 2; // Top of circle (12 o'clock position)
      
      // Year number outside the groove
      const labelRadius = radius + this.grooveWidth + 15;
      const labelX = this.centerX + Math.cos(angle) * labelRadius;
      const labelY = this.centerY + Math.sin(angle) * labelRadius;
      
      this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
      this.ctx.font = year % 2 === 1 ? 'bold 13px Georgia' : '11px Georgia';
      this.ctx.fillText(year.toString(), labelX, labelY);
      
      // Small marker dot at year boundary
      const dotX = this.centerX + Math.cos(angle) * radius;
      const dotY = this.centerY + Math.sin(angle) * radius;
      
      this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  drawCurrentPosition(data) {
    if (!data.metonicCycle) return;
    
    const progress = data.metonicCycle.progress;
    
    // Calculate which groove and position within groove
    const totalMonths = progress * 235;
    const year = Math.floor(totalMonths / this.monthsPerGroove);
    const monthInYear = totalMonths % this.monthsPerGroove;
    
    // Calculate position on the circular groove
    const radius = this.startRadius + (year * (this.grooveWidth + this.grooveGap)) + this.grooveWidth / 2;
    const angle = (monthInYear / this.monthsPerGroove) * Math.PI * 2 - Math.PI / 2;
    
    const x = this.centerX + Math.cos(angle) * radius;
    const y = this.centerY + Math.sin(angle) * radius;
    
    // Pointer line from center to current position
    this.ctx.strokeStyle = 'var(--color-pointer, #ffaa00)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Current position marker (glowing ball)
    // Outer glow
    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 20);
    glowGradient.addColorStop(0, 'rgba(255, 107, 53, 0.8)');
    glowGradient.addColorStop(0.5, 'rgba(255, 107, 53, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Main ball
    this.ctx.fillStyle = '#ff6b35';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Outer ring
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Inner highlight dot
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawSubDials(data) {
    // Callippic sub-dial (76-year cycle = 4 Metonic cycles)
    const subDialX = this.canvas.width - 80;
    const subDialY = 100;
    const subDialRadius = 50;
    
    // Outer circle
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(subDialX, subDialY, subDialRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Inner circle for depth
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(subDialX, subDialY, subDialRadius - 5, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw 4 quadrant markers (4 Metonic cycles)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) - Math.PI / 2;
      const x = subDialX + Math.cos(angle) * subDialRadius;
      const y = subDialY + Math.sin(angle) * subDialRadius;
      
      this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Callippic position (4 Metonic cycles = 76 years)
    if (data.metonicCycle) {
      const callippicProgress = (data.metonicCycle.year % 76) / 76;
      const angle = callippicProgress * Math.PI * 2 - Math.PI / 2;
      
      const pointerLength = subDialRadius - 15;
      const tipX = subDialX + Math.cos(angle) * pointerLength;
      const tipY = subDialY + Math.sin(angle) * pointerLength;
      
      // Pointer line
      this.ctx.strokeStyle = 'var(--color-pointer, #ffaa00)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(subDialX, subDialY);
      this.ctx.lineTo(tipX, tipY);
      this.ctx.stroke();
      
      // Tip marker
      this.ctx.fillStyle = '#ff6b35';
      this.ctx.beginPath();
      this.ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
    
    // Label
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.font = '11px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Callippic', subDialX, subDialY + subDialRadius + 15);
    this.ctx.fillText('76 years', subDialX, subDialY + subDialRadius + 28);
  }
  
  drawInfo(data) {
    if (!data.metonicCycle) return;
    
    const metonic = data.metonicCycle;
    
    // Calculate months into current cycle (235 lunar months total)
    const monthsInCycle = Math.round(metonic.progress * 235);
    const monthsRemaining = 235 - monthsInCycle;
    
    // Calculate time remaining in cycle
    const daysRemaining = monthsRemaining * 29.53059; // lunar month average
    const yearsRemaining = Math.floor(daysRemaining / 365.25);
    const daysInYearRemaining = Math.round(daysRemaining % 365.25);
    
    // Info panel at bottom
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 16px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `Year ${metonic.year}/19 — Month ${monthsInCycle}/235`,
      this.centerX,
      this.canvas.height - 50
    );
    
    this.ctx.font = '12px Georgia';
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.fillText(
      `Cycle ends in ${yearsRemaining}y ${daysInYearRemaining}d (19.0 solar years)`,
      this.centerX,
      this.canvas.height - 30
    );
    
    // Progress percentage
    this.ctx.font = '11px Georgia';
    this.ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
    const progressPercent = (metonic.progress * 100).toFixed(1);
    this.ctx.fillText(
      `Progress: ${progressPercent}%`,
      this.centerX,
      this.canvas.height - 12
    );
  }
}
