const ESTADOS = {
  pendiente: { label: 'Pendiente', clase: 'estado-pendiente' },
  aceptado: { label: 'Aceptado', clase: 'estado-aceptado' },
  cancelado: { label: 'Cancelado', clase: 'estado-cancelado' },
};
const ORIGENES = {
  presupuestador: 'Presupuestador',
  mercadolibre: 'Mercado Libre',
  particular: 'Venta particular',
  otro: 'Otro',
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
      const esVentaManual = !p.plantillaId && (!p.items || p.items.length <= 1);
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
        ${esVentaManual ? `
        <div class="panel">
          <h2>Editar datos de la venta</h2>
          <div class="row">
            <div class="field">
              <label>Fecha</label>
              <input id="ve-fecha" type="date" value="${p.fecha ? p.fecha.slice(0,10) : ''}">
            </div>
            <div class="field" style="flex:2 1 220px;">
              <label>Nombre / descripción</label>
              <input id="ve-nombre" value="${escapeHtml(p.nombre||'')}">
            </div>
            <div class="field">
              <label>Origen</label>
              <select id="ve-origen">
                <option value="mercadolibre" ${p.origen==='mercadolibre'?'selected':''}>Mercado Libre</option>
                <option value="particular" ${p.origen==='particular'?'selected':''}>Venta particular</option>
                <option value="presupuestador" ${p.origen==='presupuestador'?'selected':''}>Presupuestador</option>
                <option value="otro" ${p.origen==='otro'?'selected':''}>Otro</option>
              </select>
            </div>
          </div>
          <div class="row" style="margin-top:12px;">
            <div class="field">
              <label>Cliente (opcional)</label>
              <input id="ve-cliente" value="${escapeHtml((p.cliente&&p.cliente.nombre)||'')}">
            </div>
            <div class="field" style="flex:0 0 120px;">
              <label>Cantidad</label>
              <input id="ve-cantidad" type="number" step="1" min="1" value="${(p.items&&p.items[0]&&p.items[0].cantidad) || 1}">
            </div>
            <div class="field" style="flex:0 0 180px;">
              <label>Precio por unidad</label>
              <input id="ve-monto" type="number" step="0.01" value="${(p.items&&p.items[0]&&p.items[0].costoUnit) || p.total || 0}">
            </div>
          </div>
          <div class="row" style="margin-top:12px; align-items:center;">
            <div class="field" style="flex:0 0 auto; flex-direction:row; align-items:center; gap:8px;">
              <input id="ve-pagado" type="checkbox" ${p.pagado===false?'':'checked'} style="width:auto;">
              <label style="text-transform:none; font-size:13px; color:var(--text);">Pagado en su totalidad</label>
            </div>
            <div class="field" style="flex:0 0 180px;">
              <label>Monto adeudado (si no pagó todo)</label>
              <input id="ve-adeudado" type="number" step="0.01" value="${p.montoAdeudado || 0}">
            </div>
          </div>
          <div class="field" style="margin-top:12px;">
            <label>Observaciones</label>
            <textarea id="ve-observaciones">${escapeHtml(p.observaciones||'')}</textarea>
          </div>
          <div class="row" style="margin-top:14px;">
            <button class="action" onclick="guardarEdicionVenta('${p.id}')">Guardar cambios</button>
          </div>
        </div>
        ` : ''}
        ${renderTicket(state.presupuestoActual)}
      `;
    }
  }

  const f = state.historialFiltros;
  const filtrados = presupuestosFiltrados();
  const hayFiltrosActivos = f.texto || f.estado !== 'todos' || f.fechaDesde || f.fechaHasta;

  return `
    <div class="panel">
      <div class="row" style="align-items:center;">
        <h2 style="border:none; margin:0; padding:0; flex:1;">Ventas y presupuestos</h2>
        <button class="ghost action" onclick="toggleCargaVentaAntigua()">${state.cargandoVentaAntigua ? 'Cancelar' : '+ Cargar venta antigua'}</button>
      </div>
      ${state.cargandoVentaAntigua ? `
        <div class="hint" style="margin-top:10px;">Para registrar una venta que no pasó por el presupuestador (ej. Mercado Libre) o un presupuesto viejo que ya tenías en papel.</div>
        <div class="row" style="margin-top:14px;">
          <div class="field">
            <label>Fecha</label>
            <input id="va-fecha" type="date" value="${fechaHoy()}">
          </div>
          <div class="field" style="flex:2 1 220px;">
            <label>Nombre / descripción</label>
            <input id="va-nombre" placeholder="Ej: Mesa ratona vendida por ML">
          </div>
          <div class="field">
            <label>Origen</label>
            <select id="va-origen">
              <option value="mercadolibre">Mercado Libre</option>
              <option value="particular">Venta particular</option>
              <option value="presupuestador">Presupuestador</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div class="row" style="margin-top:12px;">
          <div class="field">
            <label>Cliente (opcional)</label>
            <input id="va-cliente" placeholder="Nombre del comprador">
          </div>
          <div class="field" style="flex:0 0 120px;">
            <label>Cantidad</label>
            <input id="va-cantidad" type="number" step="1" min="1" value="1">
          </div>
          <div class="field" style="flex:0 0 180px;">
            <label>Precio por unidad</label>
            <input id="va-monto" type="number" step="0.01" placeholder="0.00">
          </div>
        </div>
        <div class="row" style="margin-top:12px; align-items:center;">
          <div class="field" style="flex:0 0 auto; flex-direction:row; align-items:center; gap:8px;">
            <input id="va-pagado" type="checkbox" checked style="width:auto;">
            <label style="text-transform:none; font-size:13px; color:var(--text);">Pagado en su totalidad</label>
          </div>
          <div class="field" style="flex:0 0 180px;">
            <label>Monto adeudado (si no pagó todo)</label>
            <input id="va-adeudado" type="number" step="0.01" value="0">
          </div>
        </div>
        <div class="field" style="margin-top:12px;">
          <label>Observaciones (opcional)</label>
          <textarea id="va-observaciones" placeholder="Detalles de la venta, condiciones, lo que sea útil recordar..."></textarea>
        </div>
        <div class="row" style="margin-top:14px;">
          <div class="field" style="flex:0 0 auto;">
            <button class="action" onclick="guardarVentaAntigua()">Guardar venta</button>
          </div>
        </div>
      ` : ''}
    </div>
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
        const origenLabel = p.origen && p.origen !== 'presupuestador' ? ORIGENES[p.origen] : null;
        const tieneDeuda = p.pagado === false && (p.montoAdeudado||0) > 0;
        return `
        <div class="hist-item" onclick="verHistorial('${p.id}')">
          <div>
            <div class="nombre">${escapeHtml(p.nombre)} ${p.numero ? `<span class="numero">Nº ${formatearNumero(p.numero)}</span>` : ''} <span class="estado-badge ${estado.clase}">${estado.label}</span> ${origenLabel ? `<span class="calc-badge">${origenLabel}</span>` : ''} ${tieneDeuda ? `<span class="estado-badge estado-cancelado">Debe ${money(p.montoAdeudado)}</span>` : ''}</div>
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

async function guardarEdicionVenta(id){
  const idx = state.presupuestos.findIndex(x=>x.id===id);
  if(idx === -1) return;
  const fecha = document.getElementById('ve-fecha').value;
  const nombre = document.getElementById('ve-nombre').value.trim();
  const origen = document.getElementById('ve-origen').value;
  const clienteNombre = document.getElementById('ve-cliente').value.trim();
  const cantidad = parseFloat(document.getElementById('ve-cantidad').value) || 1;
  const monto = parseFloat(document.getElementById('ve-monto').value);
  const pagado = document.getElementById('ve-pagado').checked;
  const montoAdeudado = pagado ? 0 : (parseFloat(document.getElementById('ve-adeudado').value) || 0);
  const observaciones = document.getElementById('ve-observaciones').value.trim();

  if(!fecha){ showToast('Elegí una fecha'); return; }
  if(!nombre){ showToast('Cargá un nombre o descripción'); return; }
  if(isNaN(monto) || monto <= 0){ showToast('Cargá un precio por unidad válido'); return; }

  const registro = state.presupuestos[idx];
  registro.fecha = fecha;
  registro.nombre = nombre;
  registro.origen = origen;
  registro.pagado = pagado;
  registro.montoAdeudado = montoAdeudado;
  registro.cliente = { ...(registro.cliente||{}), nombre: clienteNombre };
  registro.observaciones = observaciones;
  registro.items = [{ materialId: null, nombre: 'Venta registrada', unidad: 'unidad', cantidad, costoUnit: monto }];
  const subtotal = cantidad * monto;
  registro.subtotalMateriales = subtotal;
  registro.manoObra = subtotal * ((registro.manoObraPct||0)/100);
  const subtotalConManoObra = subtotal + registro.manoObra;
  registro.impuestos = subtotalConManoObra * ((registro.impuestosPct||0)/100);
  const extrasNetos = (registro.extrasNetos||[]).reduce((s,e)=>s+e.monto,0);
  registro.total = subtotalConManoObra + registro.impuestos + extrasNetos;

  state.presupuestos[idx] = registro;
  if(state.presupuestoActual && state.presupuestoActual.id === id){
    state.presupuestoActual = JSON.parse(JSON.stringify(registro));
  }
  await storageSet(KEYS.presupuestos, state.presupuestos);
  showToast('Venta actualizada');
  render();
}

function toggleCargaVentaAntigua(){
  state.cargandoVentaAntigua = !state.cargandoVentaAntigua;
  render();
}
async function guardarVentaAntigua(){
  const fecha = document.getElementById('va-fecha').value;
  const nombre = document.getElementById('va-nombre').value.trim();
  const origen = document.getElementById('va-origen').value;
  const clienteNombre = document.getElementById('va-cliente').value.trim();
  const cantidad = parseFloat(document.getElementById('va-cantidad').value) || 1;
  const monto = parseFloat(document.getElementById('va-monto').value);
  const pagado = document.getElementById('va-pagado').checked;
  const montoAdeudado = pagado ? 0 : (parseFloat(document.getElementById('va-adeudado').value) || 0);
  const observaciones = document.getElementById('va-observaciones').value.trim();

  if(!fecha){ showToast('Elegí una fecha'); return; }
  if(!nombre){ showToast('Cargá un nombre o descripción'); return; }
  if(isNaN(monto) || monto <= 0){ showToast('Cargá un precio por unidad válido'); return; }

  const total = monto * cantidad;
  const numero = await obtenerProximoNumero();
  const registro = {
    id: uid(),
    numero,
    nombre,
    fecha,
    fechaGuardado: new Date().toISOString(),
    cliente: { nombre: clienteNombre, telefono:'', direccion:'', email:'' },
    medidas: { largo:'', ancho:'', alto:'' },
    items: [{ materialId: null, nombre: 'Venta registrada', unidad: 'unidad', cantidad, costoUnit: monto }],
    extrasNetos: [],
    manoObraPct: 0,
    impuestosPct: 0,
    subtotalMateriales: total,
    manoObra: 0,
    impuestos: 0,
    total,
    estado: 'aceptado', // una venta ya realizada se considera aceptada de entrada
    origen,
    pagado,
    montoAdeudado,
    tiempoFabricacion: '',
    observaciones,
  };
  state.presupuestos.unshift(registro);
  await storageSet(KEYS.presupuestos, state.presupuestos);
  showToast('Venta cargada');
  state.cargandoVentaAntigua = false;
  render();
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
