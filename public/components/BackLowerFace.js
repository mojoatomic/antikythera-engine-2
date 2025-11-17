class BackLowerFace {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Initial scale factor based on a 600x600 logical coordinate system.
    // This value is recalculated on each render to follow dynamic canvas resizing.
    this.scale = canvas.width / 600;
    
    // Use original 600x600 coordinate system, not scaled canvas size
    this.centerX = 600 / 2;
    this.centerY = 600 / 2;
    this.maxRadius = Math.min(600, 600) / 2 - 60;
    this.spiralTurns = 4.5; // 223 months in ~4.5 turns
  }
  
  // Helper to replace placeholders in translated strings
  format(template, values) {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  
  render(data) {
    // Recompute scale in case the canvas was resized (hi-DPI / responsive layout)
    this.scale = this.canvas.width / 600;

    const rotate = (data && data.settings && data.settings.rotate) || (window.appSettings && window.appSettings.rotate) || 'none';
    const angle = rotate === 'ccw90' ? -Math.PI / 2 : (rotate === 'cw90' ? Math.PI / 2 : 0);

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply scale for high-resolution rendering
    this.ctx.scale(this.scale, this.scale);
    
    if (angle !== 0) {
      this.ctx.translate(300, 300);
      this.ctx.rotate(angle);
      this.ctx.translate(-300, -300);
    }

    this.drawTitle();
    this.drawSpiral();
    this.drawMonthMarkers();
    this.drawEclipseGlyphs();
    this.drawCurrentPosition(data);
    this.drawSubDials(data);
    this.drawInfo(data);

    this.ctx.restore();
  }
  
  drawTitle() {
    this.ctx.fillStyle = '#d4af37';
    this.ctx.font = 'bold 18px Georgia';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(languageManager.t('back_lower_face.title'), this.centerX, 30);
    //this.ctx.font = '14px Georgia';
    //this.ctx.fillText(languageManager.t('back_lower_face.title'), this.centerX, 50);
  }
  
  drawSpiral() {
    // Main Archimedean spiral (223 synodic months)
    this.ctx.strokeStyle = '#d4af37';
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
    this.ctx.fillStyle = '#d4af37';
    
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
    this.ctx.fillStyle = '#f0e6d2';
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
    this.ctx.strokeStyle = '#ffaa00';
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
    const subDialX = 600 - 80;
    const subDialY = 100;
    const subDialRadius = 50;
    
    this.ctx.strokeStyle = '#d4af37';
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
    this.ctx.fillText(languageManager.t('back_lower_face.exeligmos'), subDialX, subDialY + subDialRadius + 15);
    this.ctx.fillText(languageManager.t('back_lower_face.years_54'), subDialX, subDialY + subDialRadius + 28);
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
      this.format(languageManager.t('back_lower_face.saros_month'), {
        cycle: saros.cycle,
        month: monthsInCycle
      }),
      this.centerX,
      600 - 65
    );
    
    this.ctx.font = '12px Georgia';
    this.ctx.fillStyle = 'var(--color-text, #f0e6d2)';
    this.ctx.fillText(
      this.format(languageManager.t('back_lower_face.cycle_ends'), {
        years: yearsRemaining,
        days: daysInYearRemaining
      }),
      this.centerX,
      600 - 45
    );
    
    // Next eclipse info
    this.ctx.font = 'bold 14px Georgia';
    this.ctx.fillStyle = 'var(--color-pointer, #ffaa00)';
    
    const daysUntil = Math.floor(nextEclipse.daysUntil || 0);
    const eclipseKey = nextEclipse.type === 'lunar' ? 'next_eclipse_lunar' : 'next_eclipse_solar';
    
    this.ctx.fillText(
      this.format(languageManager.t(`back_lower_face.${eclipseKey}`), {
        days: daysUntil
      }),
      this.centerX,
      600 - 25
    );
    
    // Progress percentage
    this.ctx.font = '11px Georgia';
    this.ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
    const progressPercent = (saros.progress * 100).toFixed(1);
    this.ctx.fillText(
      this.format(languageManager.t('back_lower_face.progress'), {
        percent: progressPercent
      }),
      this.centerX,
      600 - 8
    );
  }
}
