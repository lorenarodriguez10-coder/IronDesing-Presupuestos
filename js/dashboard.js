function renderDashboard(){
  if(state.presupuestos.length === 0){
    return `<div class="panel"><div class="empty">Todavía no hay presupuestos guardados. Las estadísticas van a aparecer acá a medida que guardes trabajos.</div></div>`;
  }

  const now = new Date();
  const mesActual = now.getMonth(), anioActual = now.getFullYear();
  const esEsteMes = (p) => {
    const f = new Date(p.fecha || p.fechaGuardado);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  };
  const presupuestosMes = state.presupuestos.filter(esEsteMes);
  const aceptados = state.presupuestos.filter(p => (p.estado||'pendiente') === 'aceptado');
  const aceptadosMes = presupuestosMes.filter(p => (p.estado||'pendiente') === 'aceptado');
  const pendientes = state.presupuestos.filter(p => (p.estado||'pendiente') === 'pendiente');

  const totalTrabajos = state.presupuestos.length;
  const presupuestadoTotal = state.presupuestos.reduce((s,p)=> s + (p.total||0), 0);
  const presupuestadoMes = presupuestosMes.reduce((s,p)=> s + (p.total||0), 0);
  const facturacionTotal = aceptados.reduce((s,p)=> s + (p.total||0), 0);
  const facturacionMes = aceptadosMes.reduce((s,p)=> s + (p.total||0), 0);
  const tasaConversion = totalTrabajos > 0 ? Math.round((aceptados.length / totalTrabajos) * 100) : 0;

  // Material más utilizado: en cuántos presupuestos distintos aparece
  const materialCount = {};
  state.presupuestos.forEach(p => {
    (p.items||[]).forEach(it => {
      const key = it.nombre || 'Desconocido';
      materialCount[key] = (materialCount[key]||0) + 1;
    });
  });
  let materialTop = '—', materialTopCount = 0;
  Object.entries(materialCount).forEach(([k,v]) => { if(v > materialTopCount){ materialTopCount = v; materialTop = k; } });

  // Plantilla más utilizada
  const plantillaCount = {};
  state.presupuestos.forEach(p => {
    if(!p.plantillaId) return;
    plantillaCount[p.plantillaId] = (plantillaCount[p.plantillaId]||0) + 1;
  });
  let plantillaTopId = null, plantillaTopCount = 0;
  Object.entries(plantillaCount).forEach(([k,v]) => { if(v > plantillaTopCount){ plantillaTopCount = v; plantillaTopId = k; } });
  const plantillaTop = plantillaTopId
    ? (state.plantillas.find(pl => pl.id === plantillaTopId)?.nombre || '(plantilla eliminada)')
    : '—';

  const nombreMes = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return `
    <div class="panel">
      <h2>Facturación real (solo presupuestos Aceptados)</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Facturación este mes</div>
          <div class="stat-value">${money(facturacionMes)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Facturación histórica</div>
          <div class="stat-value">${money(facturacionTotal)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tasa de conversión</div>
          <div class="stat-value">${tasaConversion}%</div>
          <div class="hint">${aceptados.length} de ${totalTrabajos} presupuestos aceptados</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pendientes de respuesta</div>
          <div class="stat-value">${pendientes.length}</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <h2>Actividad — ${nombreMes} <span class="hint" style="display:inline; font-weight:400;">(todos los presupuestos, sin importar el estado)</span></h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Presupuestos armados este mes</div>
          <div class="stat-value">${presupuestosMes.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monto presupuestado este mes</div>
          <div class="stat-value">${money(presupuestadoMes)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total de trabajos (histórico)</div>
          <div class="stat-value">${totalTrabajos}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monto presupuestado histórico</div>
          <div class="stat-value">${money(presupuestadoTotal)}</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <h2>Lo más usado</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Material más utilizado</div>
          <div class="stat-value stat-value-text">${escapeHtml(materialTop)}</div>
          <div class="hint">en ${materialTopCount} presupuesto${materialTopCount===1?'':'s'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Plantilla más utilizada</div>
          <div class="stat-value stat-value-text">${escapeHtml(plantillaTop)}</div>
          <div class="hint">en ${plantillaTopCount} presupuesto${plantillaTopCount===1?'':'s'}</div>
        </div>
      </div>
    </div>
  `;
}
