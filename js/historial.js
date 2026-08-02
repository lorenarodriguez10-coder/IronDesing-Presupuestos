const ESTADOS = {
  pendiente: { label: 'Pendiente', clase: 'estado-pendiente' },
  aceptado: { label: 'Aceptado', clase: 'estado-aceptado' },
  cancelado: { label: 'Cancelado', clase: 'estado-cancelado' },
};

function presupuestosFiltrados(){
  const f = state.historialFiltros;
  return state.presupuestos.filter(p => {
    if(f.estado !== 'todos' && (p.estado||'pendiente') !== f.estado) return false;

    if(f.texto){
      const t = f.texto.toLowerCase();
      const numeroStr = p.numero ? formatearNumero(p.numero) : '';
      const plantilla = state.plantillas.find(pl=>pl.id===p.plantillaId);
      const campos = [p.nombre, p.cliente && p.cliente.nombre, numeroStr, plantilla && plantilla.nombre]
        .filter(Boolean).join(' ').toLowerCase();
      if(!campos.includes(t)) return false;
    }

    const fechaP = new Date(p.fecha || p.fechaGuardado);
    if(f.fechaDesde){
      if(fechaP < new Date(f.fechaDesde)) return false;
    }
    if(f.fechaHasta){
      const hasta = new Date(f.fechaHasta);
      hasta.setHours(23,59,59,999);
      if(fechaP > hasta) return false;
    }
    return true;
  });
}

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

  const f = state.historialFiltros;
  const filtrados = presupuestosFiltrados();
  const hayFiltrosActivos = f.texto || f.estado !== 'todos' || f.fechaDesde || f.fechaHasta;

  return `
    <div class="panel">
      <h2>Buscar y filtrar</h2>
      <div class="row">
        <div class="field" style="flex:2 1 220px;">
          <label>Buscar</label>
          <input id="hist-buscar" value="${escapeHtml(f.texto)}" placeholder="Nombre, cliente, número o plantilla..." oninput="updateFiltroTexto(this.value)">
        </div>
        <div class="field">
          <label>Desde</label>
          <input id="hist-desde" type="date" value="${f.fechaDesde}" onchange="updateFiltroFecha('fechaDesde', this.value)">
        </div>
        <div class="field">
          <label>Hasta</label>
          <input id="hist-hasta" type="date" value="${f.fechaHasta}" onchange="updateFiltroFecha('fechaHasta', this.value)">
        </div>
        ${hayFiltrosActivos ? `<div class="field" style="flex:0 0 auto;"><button class="ghost action" onclick="limpiarFiltrosHistorial()">Limpiar filtros</button></div>` : ''}
      </div>
      <div class="row" style="margin-top:12px;">
        <button class="small ${f.estado==='todos'?'action':'ghost'}" onclick="updateFiltroEstado('todos')">Todos</button>
        <button class="small ${f.estado==='pendiente'?'action':'ghost'}" onclick="updateFiltroEstado('pendiente')">Pendiente</button>
        <button class="small ${f.estado==='aceptado'?'action':'ghost'}" onclick="updateFiltroEstado('aceptado')">Aceptado</button>
        <button class="small ${f.estado==='cancelado'?'action':'ghost'}" onclick="updateFiltroEstado('cancelado')">Cancelado</button>
      </div>
    </div>
    <div class="panel">
      <h2>Historial de presupuestos (${filtrados.length}${filtrados.length !== state.presupuestos.length ? ` de ${state.presupuestos.length}` : ''})</h2>
      ${state.presupuestos.length === 0 ? '<div class="empty">Todavía no guardaste ningún presupuesto.</div>' :
        filtrados.length === 0 ? '<div class="empty">Ningún presupuesto coincide con esos filtros.</div>' :
        filtrados.map(p => {
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

function updateFiltroTexto(value){
  state.historialFiltros.texto = value;
  const input = document.getElementById('hist-buscar');
  const cursorPos = input ? input.selectionStart : null;
  render();
  const nuevoInput = document.getElementById('hist-buscar');
  if(nuevoInput){
    nuevoInput.focus();
    if(cursorPos !== null) nuevoInput.setSelectionRange(cursorPos, cursorPos);
  }
}
function updateFiltroFecha(campo, value){ state.historialFiltros[campo] = value; render(); }
function updateFiltroEstado(estado){ state.historialFiltros.estado = estado; render(); }
function limpiarFiltrosHistorial(){ state.historialFiltros = { texto:'', estado:'todos', fechaDesde:'', fechaHasta:'' }; render(); }

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
