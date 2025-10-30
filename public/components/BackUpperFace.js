class BackUpperFace {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.maxRadius = Math.min(canvas.width, canvas.height) / 2 - 60;
    this.spiralTurns = 4.75; // 19 years in ~5 turns looks good
  }
  
  render(data) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawTitle();
    this.drawSpiral();
    this.drawYearMarkers();
    this.drawCurrentPosition(data);
    this.drawSubDials(data);
    this.drawInfo(data);
  }
  
  drawTitle() {
    this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
    this.ctx.font = 'bold 18px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(languageManager.t('back_upper_face.title'), this.centerX, 30);
    //this.ctx.font = '14px Georgia';
    //this.ctx.fillText(languageManager.t('back_upper_face.title'), this.centerX, 50);
  }
  
  drawSpiral() {
    // Main Archimedean spiral
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
  
  drawYearMarkers() {
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.font = '12px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Mark each year
    for (let year = 1; year <= 19; year++) {
      const t = year / 19;
      const angle = t * this.spiralTurns * Math.PI * 2;
      const r = t * this.maxRadius;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      
      // Year dot
      this.ctx.fillStyle = 'var(--color-accent, #d4af37)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Label every year
      if (year % 2 === 1 || year === 19) {
        this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
        const labelAngle = angle + Math.PI / 2; // Perpendicular to spiral
        const labelOffset = 20;
        const labelX = x + Math.cos(labelAngle) * labelOffset;
        const labelY = y + Math.sin(labelAngle) * labelOffset;
        this.ctx.fillText(year.toString(), labelX, labelY);
      }
    }
  }
  
  drawCurrentPosition(data) {
    if (!data.metonicCycle) return;
    
    const progress = data.metonicCycle.progress;
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
    // Callippic sub-dial (76-year cycle = 4 Metonic cycles)
    // Draw small dial in upper right
    const subDialX = this.canvas.width - 80;
    const subDialY = 100;
    const subDialRadius = 50;
    
    this.ctx.strokeStyle = 'var(--color-accent, #d4af37)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(subDialX, subDialY, subDialRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Callippic position (4 Metonic cycles)
    if (data.metonicCycle) {
      const callippicProgress = (data.metonicCycle.year % 76) / 76;
      const angle = callippicProgress * Math.PI * 2 - Math.PI / 2;
      
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
