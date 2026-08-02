const ESTADOS = {
  pendiente: { label: 'Pendiente', clase: 'estado-pendiente' },
  aceptado: { label: 'Aceptado', clase: 'estado-aceptado' },
  cancelado: { label: 'Cancelado', clase: 'estado-cancelado' },
};

function renderHistorial(){
  if(state.viewingHistorial){
    const p = state.presupuestos.find(x=>x.id===state.viewingHistorial);
    if(!p) { state.viewingHistorial = null; }
    else {
      const estadoActual = p.estado || 'pendiente';
      return `
        <div class="panel">
          <button class="ghost action" onclick="volverHistorial()">← Volver al historial</button>
        </div>
        <div class="panel">
          <h2>Estado del presupuesto</h2>
          <div class="row" style="align-items:center;">
            <span class="estado-badge ${ESTADOS[estadoActual].clase}">${ESTADOS[estadoActual].label}</span>
            <div style="flex:1;"></div>
            <button class="ghost small" onclick="cambiarEstado('${p.id}','pendiente')">Marcar Pendiente</button>
            <button class="ghost small" onclick="cambiarEstado('${p.id}','aceptado')">Marcar Aceptado</button>
            <button class="ghost small" onclick="cambiarEstado('${p.id}','cancelado')">Marcar Cancelado</button>
          </div>
        </div>
        ${renderTicket(state.presupuestoActual)}
      `;
    }
  }
  return `
    <div class="panel">
      <h2>Historial de presupuestos (${state.presupuestos.length})</h2>
      ${state.presupuestos.length === 0 ? '<div class="empty">Todavía no guardaste ningún presupuesto.</div>' : state.presupuestos.map(p => {
        const estado = ESTADOS[p.estado || 'pendiente'];
        return `
        <div class="hist-item" onclick="verHistorial('${p.id}')">
          <div>
            <div class="nombre">${escapeHtml(p.nombre)} ${p.numero ? `<span class="numero">Nº ${formatearNumero(p.numero)}</span>` : ''} <span class="estado-badge ${estado.clase}">${estado.label}</span></div>
            <div class="fecha">${p.cliente && p.cliente.nombre ? escapeHtml(p.cliente.nombre) + ' · ' : ''}${fechaLegible(p.fecha || p.fechaGuardado)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:14px;">
            <div class="total">${money(p.total)}</div>
            <button class="danger small" onclick="event.stopPropagation(); deletePresupuesto('${p.id}')">✕</button>
          </div>
        </div>
      `;}).join('')}
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
async function cambiarEstado(id, nuevoEstado){
  const idx = state.presupuestos.findIndex(x=>x.id===id);
  if(idx === -1) return;
  state.presupuestos[idx].estado = nuevoEstado;
  if(state.presupuestoActual && state.presupuestoActual.id === id) state.presupuestoActual.estado = nuevoEstado;
  await storageSet(KEYS.presupuestos, state.presupuestos);
  showToast(`Marcado como ${ESTADOS[nuevoEstado].label}`);
  render();
}
function deletePresupuesto(id){
  showConfirm('¿Eliminar este presupuesto del historial?', async ()=>{
    state.presupuestos = state.presupuestos.filter(p=>p.id!==id);
    await storageSet(KEYS.presupuestos, state.presupuestos);
    showToast('Presupuesto eliminado');
    render();
  });
}
