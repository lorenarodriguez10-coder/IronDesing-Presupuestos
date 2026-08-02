function claveMes(fecha){
  const f = new Date(fecha);
  return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}`;
}
function nombreMesClave(clave){
  const [y,m] = clave.split('-').map(Number);
  const d = new Date(y, m-1, 1);
  const txt = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
function mesesDisponibles(){
  const now = new Date();
  const set = new Set([claveMes(now)]); // el mes actual siempre aparece, aunque no tenga datos
  state.presupuestos.forEach(p => set.add(claveMes(p.fecha || p.fechaGuardado)));
  return Array.from(set).sort().reverse();
}
function updateDashboardMes(valor){ state.dashboardMesSeleccionado = valor; render(); }

function renderDashboard(){
  if(state.presupuestos.length === 0){
    return `<div class="panel"><div class="empty">Todavía no hay presupuestos guardados. Las estadísticas van a aparecer acá a medida que guardes trabajos.</div></div>`;
  }

  const now = new Date();
  const claveActual = claveMes(now);
  const claveSeleccionada = state.dashboardMesSeleccionado || claveActual;

  const presupuestosMesActual = state.presupuestos.filter(p => claveMes(p.fecha || p.fechaGuardado) === claveActual);
  const aceptados = state.presupuestos.filter(p => (p.estado||'pendiente') === 'aceptado' && p.pagado !== false);
  const aceptadosMesActual = presupuestosMesActual.filter(p => (p.estado||'pendiente') === 'aceptado' && p.pagado !== false);
  const pendientes = state.presupuestos.filter(p => (p.estado||'pendiente') === 'pendiente');
  const totalAdeudado = state.presupuestos.filter(p => p.pagado === false).reduce((s,p)=> s + (p.montoAdeudado||0), 0);

  const totalTrabajos = state.presupuestos.length;
  const facturacionTotal = aceptados.reduce((s,p)=> s + (p.total||0), 0);
  const facturacionMesActual = aceptadosMesActual.reduce((s,p)=> s + (p.total||0), 0);
  const tasaConversion = totalTrabajos > 0 ? Math.round((aceptados.length / totalTrabajos) * 100) : 0;

  // Actividad del mes SELECCIONADO (puede ser distinto al actual)
  const presupuestosMesSel = state.presupuestos.filter(p => claveMes(p.fecha || p.fechaGuardado) === claveSeleccionada);
  const presupuestadoMesSel = presupuestosMesSel.filter(p => p.pagado !== false).reduce((s,p)=> s + (p.total||0), 0);
  const presupuestadoTotal = state.presupuestos.filter(p => p.pagado !== false).reduce((s,p)=> s + (p.total||0), 0);

  // Material más utilizado
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

  const opcionesMes = mesesDisponibles();

  return `
    <div class="panel">
      <h2>Facturación real (solo presupuestos Aceptados) — mes actual</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Facturación este mes</div>
          <div class="stat-value">${moneyRedondo(facturacionMesActual)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Facturación histórica</div>
          <div class="stat-value">${moneyRedondo(facturacionTotal)}</div>
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
        ${totalAdeudado > 0 ? `
        <div class="stat-card">
          <div class="stat-label">Total adeudado (por cobrar)</div>
          <div class="stat-value" style="color: var(--danger);">${moneyRedondo(totalAdeudado)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    <div class="panel">
      <div class="row" style="align-items:center; margin-bottom:18px; border-bottom:1px dashed var(--line); padding-bottom:14px;">
        <h2 style="border:none; margin:0; padding:0; flex:1;">Actividad <span class="hint" style="display:inline; font-weight:400;">(todos los presupuestos y ventas, sin importar el estado)</span></h2>
        <div class="field" style="flex:0 0 200px;">
          <select id="dash-mes" onchange="updateDashboardMes(this.value)">
            ${opcionesMes.map(m => `<option value="${m}" ${m===claveSeleccionada?'selected':''}>${nombreMesClave(m)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Presupuestos armados — ${nombreMesClave(claveSeleccionada)}</div>
          <div class="stat-value">${presupuestosMesSel.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monto — ${nombreMesClave(claveSeleccionada)}</div>
          <div class="stat-value">${moneyRedondo(presupuestadoMesSel)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total de trabajos (histórico)</div>
          <div class="stat-value">${totalTrabajos}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monto presupuestado histórico</div>
          <div class="stat-value">${moneyRedondo(presupuestadoTotal)}</div>
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
