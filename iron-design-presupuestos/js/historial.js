function renderHistorial(){
  if(state.viewingHistorial){
    const p = state.presupuestos.find(x=>x.id===state.viewingHistorial);
    if(!p) { state.viewingHistorial = null; }
    else {
      return `
        <div class="panel">
          <button class="ghost action" onclick="volverHistorial()">← Volver al historial</button>
        </div>
        ${renderTicket(state.presupuestoActual)}
      `;
    }
  }
  return `
    <div class="panel">
      <h2>Historial de presupuestos (${state.presupuestos.length})</h2>
      ${state.presupuestos.length === 0 ? '<div class="empty">Todavía no guardaste ningún presupuesto.</div>' : state.presupuestos.map(p => `
        <div class="hist-item" onclick="verHistorial('${p.id}')">
          <div>
            <div class="nombre">${escapeHtml(p.nombre)} ${p.numero ? `<span class="numero">Nº ${formatearNumero(p.numero)}</span>` : ''}</div>
            <div class="fecha">${p.cliente && p.cliente.nombre ? escapeHtml(p.cliente.nombre) + ' · ' : ''}${fechaLegible(p.fecha || p.fechaGuardado)}</div>
          </div>
          <div class="total">${money(p.total)}</div>
        </div>
      `).join('')}
    </div>
  `;
}
function verHistorial(id){
  const registro = state.presupuestos.find(x=>x.id===id);
  if(!registro) return;
  state.viewingHistorial = id;
  state.presupuestoActual = JSON.parse(JSON.stringify(registro));
  render();
}
function volverHistorial(){
  state.viewingHistorial = null;
  state.presupuestoActual = null;
  render();
}
