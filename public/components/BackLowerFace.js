class BackLowerFace {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.maxRadius = Math.min(canvas.width, canvas.height) / 2 - 60;
    this.spiralTurns = 4.5; // 223 months in ~4.5 turns
  }
  
  render(data) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawTitle();
    this.drawSpiral();
    this.drawMonthMarkers();
    this.drawEclipseGlyphs();
    this.drawCurrentPosition(data);
    this.drawSubDials(data);
    this.drawInfo(data);
  }
  
  drawTitle() {
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 18px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(languageManager.t('back_lower_face.title'), this.centerX, 30);
    //this.ctx.font = '14px Georgia';
    //this.ctx.fillText(languageManager.t('back_lower_face.title'), this.centerX, 50);
  }
  
  drawSpiral() {
    // Main Archimedean spiral (223 synodic months)
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 10;
    this.ctx.beginPath();
    
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const angle = t * this.spiralTurns * Math.PI * 2;
      const r = t * this.maxRadius;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
    
    // Inner spiral decoration
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const angle = t * this.spiralTurns * Math.PI * 2;
      const r = t * this.maxRadius - 10;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }
  
  drawMonthMarkers() {
    // Mark every 10 months along the spiral
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    
    for (let month = 0; month <= 223; month += 10) {
      const t = month / 223;
      const angle = t * this.spiralTurns * Math.PI * 2;
      const r = t * this.maxRadius;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  drawEclipseGlyphs() {
    // Draw eclipse symbols at key positions
    // Solar eclipses = ☉, Lunar eclipses = ☽
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Sample eclipse positions (simplified)
    const eclipsePositions = [0, 30, 60, 90, 120, 150, 180, 210]; // months
    
    eclipsePositions.forEach((month, idx) => {
      const t = month / 223;
      const angle = t * this.spiralTurns * Math.PI * 2;
      const r = t * this.maxRadius;
      
      // Offset perpendicular to spiral
      const offsetAngle = angle + Math.PI / 2;
      const x = this.centerX + Math.cos(angle) * r + Math.cos(offsetAngle) * 15;
      const y = this.centerY + Math.sin(angle) * r + Math.sin(offsetAngle) * 15;
      
      // Alternate solar and lunar
      const symbol = idx % 2 === 0 ? '☉' : '☽';
      this.ctx.fillText(symbol, x, y);
    });
  }
  
  drawCurrentPosition(data) {
    if (!data.sarosCycle) return;
    
    const progress = data.sarosCycle.progress;
    const angle = progress * this.spiralTurns * Math.PI * 2;
    const r = progress * this.maxRadius;
    const x = this.centerX + Math.cos(angle) * r;
    const y = this.centerY + Math.sin(angle) * r;
    
    // Pointer from center
    this.ctx.strokeStyle = 'var(--color-pointer, #ffaa00)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    
    // Current position marker
    this.ctx.fillStyle = '#ff6b35';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Outer ring
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Inner dot
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawSubDials(data) {
    // Exeligmos sub-dial (triple Saros = 54 years)
    const subDialX = this.canvas.width - 80;
    const subDialY = 100;
    const subDialRadius = 50;
    
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(subDialX, subDialY, subDialRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Three divisions for triple Saros
    for (let i = 0; i < 3; i++) {
      const angle = (i * 120 - 90) * Math.PI / 180;
      this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(subDialX, subDialY);
      this.ctx.lineTo(
        subDialX + Math.cos(angle) * subDialRadius,
        subDialY + Math.sin(angle) * subDialRadius
      );
      this.ctx.stroke();
    }
    
    // Exeligmos position (3 Saros cycles)
    if (data.sarosCycle) {
      const exeligmosProgress = (data.sarosCycle.cycle % 3) / 3;
      const angle = exeligmosProgress * Math.PI * 2 - Math.PI / 2;
      
      this.ctx.strokeStyle = 'var(--color-pointer, #ffaa00)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(subDialX, subDialY);
      this.ctx.lineTo(
        subDialX + Math.cos(angle) * (subDialRadius - 10),
        subDialY + Math.sin(angle) * (subDialRadius - 10)
      );
      this.ctx.stroke();
      
      // Marker
      this.ctx.fillStyle = '#ff6b35';
      this.ctx.beginPath();
      this.ctx.arc(
        subDialX + Math.cos(angle) * (subDialRadius - 10),
        subDialY + Math.sin(angle) * (subDialRadius - 10),
        5,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
    
    // Label
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.font = '11px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Exeligmos', subDialX, subDialY + subDialRadius + 15);
    this.ctx.fillText('54 years', subDialX, subDialY + subDialRadius + 28);
  }
  
  drawInfo(data) {
    if (!data.sarosCycle || !data.nextEclipse) return;
    
    const saros = data.sarosCycle;
    const nextEclipse = data.nextEclipse;
    
    // Calculate months into current Saros cycle (0-223)
    const monthsInCycle = Math.round(saros.progress * 223);
    const monthsRemaining = 223 - monthsInCycle;
    
    // Calculate years and days from cycle completion
    const daysPerSaros = 223 * 29.53059; // 223 synodic months
    const daysRemaining = (monthsRemaining / 223) * daysPerSaros;
    const yearsRemaining = Math.floor(daysRemaining / 365.25);
    const daysInYearRemaining = Math.round(daysRemaining % 365.25);
    
    // Info panel at bottom
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 16px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `Saros Cycle ${saros.cycle} — Month ${monthsInCycle}/223`,
      this.centerX,
      this.canvas.height - 65
    );
    
    this.ctx.font = '12px Georgia';
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.fillText(
      `Cycle ends in ${yearsRemaining}y ${daysInYearRemaining}d (≈ 6586.3 days total)`,
      this.centerX,
      this.canvas.height - 45
    );
    
    // Next eclipse info
    this.ctx.font = 'bold 14px Georgia';
    this.ctx.fillStyle = 'var(--color-pointer, #ffaa00)';
    
    const eclipseType = nextEclipse.type === 'lunar' ? 'Lunar ☽' : 'Solar ☉';
    const daysUntil = Math.floor(nextEclipse.daysUntil || 0);
    
    this.ctx.fillText(
      `Next Eclipse: ${eclipseType} in ${daysUntil} days`,
      this.centerX,
      this.canvas.height - 25
    );
    
    // Progress percentage
    this.ctx.font = '11px Georgia';
    this.ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
    const progressPercent = (saros.progress * 100).toFixed(1);
    this.ctx.fillText(
      `Progress: ${progressPercent}%`,
      this.centerX,
      this.canvas.height - 8
    );
  }
}
