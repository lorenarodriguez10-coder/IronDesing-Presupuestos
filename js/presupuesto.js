function renderPresupuesto(){
  const p = state.presupuestoActual;
  const d = p || state.presupuestoDraft; // si no hay cálculo todavía, usamos lo que el usuario ya tipeó
  const plantillaId = p ? p.plantillaId : (document.getElementById('pr-plantilla') ? document.getElementById('pr-plantilla').value : '');
  return `
    <div class="panel">
      <h2>Datos del proyecto</h2>
      <div class="cols2">
        <div class="field">
          <label>Nombre del proyecto</label>
          <input id="pr-nombre" value="${escapeHtml(d.nombre||'')}" placeholder="Ej: Recibidor doble">
        </div>
        <div class="field">
          <label>Plantilla</label>
          <select id="pr-plantilla" onchange="onPlantillaChange()">
            <option value="">Elegí una plantilla</option>
            ${state.plantillas.map(pl => `<option value="${pl.id}" ${plantillaId===pl.id ? 'selected':''}>${escapeHtml(pl.nombre)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>Datos del cliente</h2>
      <div class="cols2">
        <div class="field">
          <label>Nombre y apellido</label>
          <input id="cli-nombre" value="${escapeHtml((d.cliente&&d.cliente.nombre)||'')}" placeholder="Ej: Juan Pérez">
        </div>
        <div class="field">
          <label>Teléfono</label>
          <input id="cli-telefono" value="${escapeHtml((d.cliente&&d.cliente.telefono)||'')}" placeholder="Ej: 11 2345-6789">
        </div>
      </div>
      <div class="cols2" style="margin-top:12px;">
        <div class="field">
          <label>Dirección</label>
          <input id="cli-direccion" value="${escapeHtml((d.cliente&&d.cliente.direccion)||'')}" placeholder="Ej: Av. Siempreviva 742">
        </div>
        <div class="field">
          <label>Email</label>
          <input id="cli-email" value="${escapeHtml((d.cliente&&d.cliente.email)||'')}" placeholder="Ej: juan@mail.com">
        </div>
      </div>
    </div>

    ${plantillaId ? renderItemsEditables() : ''}

    ${plantillaId ? `
    <div class="panel">
      <h2>Medidas del mueble</h2>
      <div class="row">
        <div class="field"><label>Largo (m)</label><input id="pr-largo" type="number" step="0.01" value="${p ? p.medidas.largo : ''}"></div>
        <div class="field"><label>Ancho (m)</label><input id="pr-ancho" type="number" step="0.01" value="${p ? p.medidas.ancho : ''}"></div>
        <div class="field"><label>Alto (m)</label><input id="pr-alto" type="number" step="0.01" value="${p ? p.medidas.alto : ''}"></div>
      </div>
    </div>

    <div class="panel">
      <h2>Detalles adicionales</h2>
      <div class="field">
        <label>Tiempo estimado de fabricación</label>
        <input id="pr-tiempo" value="${escapeHtml(d.tiempoFabricacion||'')}" placeholder="Ej: 10 días hábiles">
      </div>
      <div class="field" style="margin-top:12px;">
        <label>Observaciones</label>
        <textarea id="pr-observaciones" placeholder="Notas para el cliente (opcional)">${escapeHtml(d.observaciones||'')}</textarea>
      </div>
      <div class="row" style="margin-top:14px;">
        <button class="action" onclick="calcularPresupuesto()">Calcular presupuesto</button>
      </div>
    </div>
    ` : ''}

    ${p ? renderTicket(p) : ''}
  `;
}

function renderItemsEditables(){
  return `
    <div class="panel">
      <h2>Cantidades para este trabajo</h2>
      <div class="hint" style="margin-bottom:10px;">Estos valores vienen de la plantilla, pero podés ajustarlos solo para este presupuesto puntual (no modifica la plantilla guardada).</div>
      ${state.presupuestoItemsEdit.map((it,i) => `
        <div class="item-line">
          <div class="et">${escapeHtml(materialName(it.materialId))}</div>
          <span class="calc-badge">${CALCULOS.find(c=>c.v===it.calculo).label}</span>
          <input class="cant-edit" type="number" step="0.01" value="${it.factor}" onchange="updateItemEditFactor(${i}, this.value)">
        </div>
      `).join('')}
    </div>
  `;
}

function onPlantillaChange(){
  // Guardamos lo que el usuario ya escribió, para no perderlo al refrescar la pantalla
  state.presupuestoDraft = {
    nombre: document.getElementById('pr-nombre') ? document.getElementById('pr-nombre').value : state.presupuestoDraft.nombre,
    cliente: {
      nombre: document.getElementById('cli-nombre') ? document.getElementById('cli-nombre').value : state.presupuestoDraft.cliente.nombre,
      telefono: document.getElementById('cli-telefono') ? document.getElementById('cli-telefono').value : state.presupuestoDraft.cliente.telefono,
      direccion: document.getElementById('cli-direccion') ? document.getElementById('cli-direccion').value : state.presupuestoDraft.cliente.direccion,
      email: document.getElementById('cli-email') ? document.getElementById('cli-email').value : state.presupuestoDraft.cliente.email,
    },
    tiempoFabricacion: document.getElementById('pr-tiempo') ? document.getElementById('pr-tiempo').value : state.presupuestoDraft.tiempoFabricacion,
    observaciones: document.getElementById('pr-observaciones') ? document.getElementById('pr-observaciones').value : state.presupuestoDraft.observaciones,
  };

  const plantillaId = document.getElementById('pr-plantilla').value;
  const plantilla = state.plantillas.find(pl => pl.id === plantillaId);
  state.presupuestoItemsEdit = plantilla ? JSON.parse(JSON.stringify(plantilla.items)) : [];
  state.presupuestoActual = null; // limpiar cálculo anterior al cambiar de plantilla
  render();
}
function updateItemEditFactor(i, value){
  state.presupuestoItemsEdit[i].factor = parseFloat(value) || 0;
}

function calcularPresupuesto(){
  const nombre = document.getElementById('pr-nombre').value.trim() || 'Presupuesto sin nombre';
  const plantillaId = document.getElementById('pr-plantilla').value;
  const cliente = {
    nombre: document.getElementById('cli-nombre').value.trim(),
    telefono: document.getElementById('cli-telefono').value.trim(),
    direccion: document.getElementById('cli-direccion').value.trim(),
    email: document.getElementById('cli-email').value.trim(),
  };
  const tiempoFabricacion = document.getElementById('pr-tiempo').value.trim();
  const observaciones = document.getElementById('pr-observaciones').value.trim();
  const medidas = {
    largo: document.getElementById('pr-largo').value,
    ancho: document.getElementById('pr-ancho').value,
    alto: document.getElementById('pr-alto').value,
  };
  const plantilla = state.plantillas.find(pl => pl.id === plantillaId);
  let items = [];
  if(plantilla){
    const largo = parseFloat(medidas.largo)||0, ancho = parseFloat(medidas.ancho)||0, alto = parseFloat(medidas.alto)||0;
    const itemsFuente = state.presupuestoItemsEdit.length ? state.presupuestoItemsEdit : plantilla.items;
    const grupos = {};
    const sueltos = [];

    itemsFuente.forEach(it => {
      const mat = state.materiales.find(m=>m.id===it.materialId);
      const shape = shapeKey(it.calculo);
      const agrupable = mat && mat.piezaLargo && shape;

      if(agrupable){
        let base = 0;
        if(it.calculo==='largo') base = largo;
        else if(it.calculo==='ancho') base = ancho;
        else if(it.calculo==='alto') base = alto;
        else if(it.calculo==='area') base = largo*ancho;
        else if(it.calculo==='volumen') base = largo*ancho*alto;
        const necesidad = it.factor * base;
        const key = it.materialId + '|' + shape;
        if(!grupos[key]) grupos[key] = { mat, shape, necesidad: 0, detalle: [] };
        grupos[key].necesidad += necesidad;
        grupos[key].detalle.push(`${CALCULOS.find(c=>c.v===it.calculo).label} ×${it.factor} = ${necesidad.toFixed(2)}${shape==='area'?'m²':'m'}`);
      } else {
        const cantidad = calcCantidad(it.calculo, it.factor, medidas, mat);
        sueltos.push({
          materialId: it.materialId,
          nombre: mat ? mat.nombre : '⚠ MATERIAL BORRADO — revisá esta plantilla',
          unidad: mat ? mat.unidad : '',
          cantidad,
          costoUnit: mat ? mat.costo : 0,
          detalle: null,
        });
      }
    });

    const agrupados = Object.values(grupos).map(g => {
      let cobertura;
      if(g.shape === 'area') cobertura = g.mat.piezaLargo * (g.mat.piezaAncho || g.mat.piezaLargo);
      else cobertura = g.mat.piezaLargo;
      const unidadMedida = g.shape==='area' ? 'm²' : 'm';
      const piezasComprar = cobertura > 0 ? Math.ceil(g.necesidad / cobertura) : 1;
      const sobrante = cobertura > 0 ? (piezasComprar*cobertura - g.necesidad) : 0;
      const costoPorUnidad = cobertura > 0 ? g.mat.costo / cobertura : g.mat.costo;
      const cantidadReal = Math.round(g.necesidad*1000)/1000;
      return {
        materialId: g.mat.id,
        nombre: g.mat.nombre,
        unidad: unidadMedida,
        cantidad: cantidadReal,
        costoUnit: Math.round(costoPorUnidad*100)/100,
        detalle: `${g.detalle.join(' + ')} = ${g.necesidad.toFixed(2)}${unidadMedida} usados (sobran ${sobrante.toFixed(2)}${unidadMedida} para otro trabajo)`,
      };
    });

    items = [...agrupados, ...sueltos];
  }
  state.presupuestoActual = {
    nombre, plantillaId, medidas, items, cliente, tiempoFabricacion, observaciones,
    fecha: fechaHoy(),
    numero: (state.presupuestoActual && state.presupuestoActual.numero) ? state.presupuestoActual.numero : null,
    extrasNetos: state.presupuestoActual ? state.presupuestoActual.extrasNetos : [],
    manoObraPct: state.presupuestoActual ? state.presupuestoActual.manoObraPct : 100,
    impuestosPct: state.presupuestoActual ? state.presupuestoActual.impuestosPct : 34.4,
  };
  render();
}

function calcCantidad(calculo, factor, medidas, mat){
  const largo = parseFloat(medidas.largo)||0, ancho = parseFloat(medidas.ancho)||0, alto = parseFloat(medidas.alto)||0;
  let base = 0;
  if(calculo==='largo') base = largo;
  else if(calculo==='ancho') base = ancho;
  else if(calculo==='alto') base = alto;
  else if(calculo==='area') base = largo*ancho;
  else if(calculo==='volumen') base = largo*ancho*alto;
  else if(calculo==='fijo') base = 1;

  const necesidad = factor * base;
  if(calculo === 'fijo') return Math.round(necesidad*1000)/1000;

  if(mat && mat.piezaLargo){
    let cobertura;
    if(calculo === 'area') cobertura = mat.piezaLargo * (mat.piezaAncho || mat.piezaLargo);
    else cobertura = mat.piezaLargo;
    if(cobertura > 0) return Math.ceil(necesidad / cobertura);
  }
  return Math.round(necesidad*1000)/1000;
}

function renderTicket(p){
  const subtotalItems = p.items.reduce((s,it)=> s + it.cantidad*it.costoUnit, 0);
  const subtotalMateriales = subtotalItems;
  const manoObraPct = (p.manoObraPct === undefined || p.manoObraPct === null) ? 100 : p.manoObraPct;
  const impuestosPct = (p.impuestosPct === undefined || p.impuestosPct === null) ? 34.4 : p.impuestosPct;
  const manoObra = subtotalMateriales * (manoObraPct/100);
  const subtotalConManoObra = subtotalMateriales + manoObra;
  const impuestos = subtotalConManoObra * (impuestosPct/100);
  const extrasNetos = p.extrasNetos || [];
  const totalExtrasNetos = extrasNetos.reduce((s,it)=> s + it.monto, 0);
  const total = subtotalConManoObra + impuestos + totalExtrasNetos;
  return `
    <div class="ticket-perforation"></div>
    <div class="ticket">
      <div class="ticket-numero">${p.numero ? 'PRESUPUESTO Nº ' + formatearNumero(p.numero) : 'BORRADOR — se asigna un número al guardar'}</div>
      <h2 style="border:none; margin: 6px 0 4px; padding:0;">${escapeHtml(p.nombre)}</h2>
      <div class="hint" style="margin-bottom:14px;">Medidas: ${p.medidas.largo||0}m × ${p.medidas.ancho||0}m × ${p.medidas.alto||0}m ${p.cliente && p.cliente.nombre ? ' · Cliente: '+escapeHtml(p.cliente.nombre) : ''}</div>
      <table>
        <thead><tr><th>Material</th><th class="num">Cant.</th><th class="num">Costo unit.</th><th class="num">Subtotal</th></tr></thead>
        <tbody>
          ${p.items.map((it,i) => `
            <tr ${it.nombre.includes('BORRADO') ? 'style="background: rgba(193,80,46,0.12);"' : ''}>
              <td ${it.nombre.includes('BORRADO') ? 'style="color: var(--danger); font-weight:600;"' : ''}>${escapeHtml(it.nombre)} <span class="hint" style="display:inline">(${it.unidad})</span>${it.detalle ? `<div class="hint">${escapeHtml(it.detalle)}</div>` : ''}</td>
              <td class="num"><input type="number" step="0.01" value="${it.cantidad}" onchange="updateItemQty(${i}, this.value)"></td>
              <td class="num">${money(it.costoUnit)}</td>
              <td class="num">${money(it.cantidad*it.costoUnit)}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <div class="row" style="margin-top:18px; align-items:center;">
        <div class="field" style="flex:0 0 200px;">
          <label>Mano de obra (% sobre materiales)</label>
          <input id="pr-manoobra" type="number" step="0.1" value="${p.manoObraPct}" onchange="updateManoObra(this.value)">
        </div>
        <div class="field" style="flex:0 0 200px;">
          <label>Impuestos (% sobre materiales + mano de obra)</label>
          <input id="pr-impuestos" type="number" step="0.1" value="${p.impuestosPct}" onchange="updateImpuestos(this.value)">
        </div>
      </div>

      <h2 style="margin-top:20px;">Costo extra neto <span class="hint" style="display:inline; font-weight:400;">(se suma al final, sin mano de obra ni impuestos)</span></h2>
      ${extrasNetos.length === 0 ? '' : extrasNetos.map((it,i) => `
        <div class="total-line"><span>${escapeHtml(it.nombre)}</span><span class="amt">${money(it.monto)} <button class="ghost small" onclick="removeExtraNeto(${i})" style="margin-left:8px;">✕</button></span></div>
      `).join('')}
      <div class="row" style="margin-top:8px;">
        <div class="field">
          <label>Concepto</label>
          <input id="en-nombre" placeholder="Ej: Traslado especial, comisión">
        </div>
        <div class="field" style="flex:0 0 140px;">
          <label>Monto</label>
          <input id="en-monto" type="number" step="0.01" placeholder="0.00">
        </div>
        <div class="field" style="flex:0 0 auto;">
          <button class="ghost action" onclick="addExtraNeto()">+ Agregar</button>
        </div>
      </div>

      <div style="margin-top:18px; border-top:1px dashed var(--line); padding-top:10px;">
        <div class="total-line"><span>Subtotal materiales</span><span class="amt">${money(subtotalMateriales)}</span></div>
        <div class="total-line"><span>Mano de obra (${manoObraPct}%)</span><span class="amt">${money(manoObra)}</span></div>
        <div class="total-line"><span>Subtotal con mano de obra</span><span class="amt">${money(subtotalConManoObra)}</span></div>
        <div class="total-line"><span>Impuestos (${impuestosPct}%)</span><span class="amt">${money(impuestos)}</span></div>
        ${totalExtrasNetos > 0 ? `<div class="total-line"><span>Costos extra netos</span><span class="amt">${money(totalExtrasNetos)}</span></div>` : ''}
        <div class="total-line grand"><span>TOTAL</span><span class="amt">${money(total)}</span></div>
      </div>

      <div class="row" style="margin-top:18px;">
        <button class="action" onclick="guardarPresupuesto(${subtotalMateriales}, ${manoObra}, ${impuestos}, ${total})">${p.numero ? 'Guardar cambios' : 'Guardar presupuesto'}</button>
        <button class="ghost action" onclick="generarPDF()">Generar PDF</button>
      </div>
    </div>
  `;
}

function updateItemQty(i, value){
  state.presupuestoActual.items[i].cantidad = parseFloat(value) || 0;
  render();
}
function updateManoObra(value){ state.presupuestoActual.manoObraPct = parseFloat(value)||0; render(); }
function updateImpuestos(value){ state.presupuestoActual.impuestosPct = parseFloat(value)||0; render(); }
function addExtraNeto(){
  const nombre = document.getElementById('en-nombre').value.trim();
  const monto = parseFloat(document.getElementById('en-monto').value);
  if(!nombre || isNaN(monto)){ showToast('Completá concepto y monto'); return; }
  if(!state.presupuestoActual.extrasNetos) state.presupuestoActual.extrasNetos = [];
  state.presupuestoActual.extrasNetos.push({ nombre, monto });
  render();
}
function removeExtraNeto(i){ state.presupuestoActual.extrasNetos.splice(i,1); render(); }

async function guardarPresupuesto(subtotalMateriales, manoObra, impuestos, total){
  const p = state.presupuestoActual;
  let numero = p.numero;
  if(!numero){
    numero = await obtenerProximoNumero();
    state.presupuestoActual.numero = numero;
  }
  const estado = p.estado || 'pendiente';
  const registro = { id: uid(), fechaGuardado: new Date().toISOString(), ...state.presupuestoActual, numero, subtotalMateriales, manoObra, impuestos, total, estado };
  // si ya existía (se está re-guardando un editado), reemplazar; si no, agregar
  const idxExistente = state.presupuestos.findIndex(x => x.numero === numero);
  if(idxExistente > -1) state.presupuestos[idxExistente] = registro;
  else state.presupuestos.unshift(registro);
  await storageSet(KEYS.presupuestos, state.presupuestos);
  showToast(`Presupuesto Nº ${formatearNumero(numero)} guardado`);
  render();
}
