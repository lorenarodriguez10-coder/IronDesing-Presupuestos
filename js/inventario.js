function renderInventario(){
  const inv = state.inventario || { stockPiezas:{}, stockContinuo:{}, retazos:[] };
  const materialesOrdenados = [...state.materiales].sort((a,b)=> a.nombre.localeCompare(b.nombre));

  return `
    <div class="panel">
      <div class="row" style="align-items:center;">
        <h2 style="border:none; margin:0; padding:0; flex:1;">Cargar stock</h2>
        <button class="ghost action" onclick="toggleCargaInventarioMasiva()">${state.cargaInventarioMasiva ? 'Cancelar' : '+ Carga rápida'}</button>
      </div>
      ${state.cargaInventarioMasiva ? `
        <div class="hint" style="margin-top:10px;">Pegá una lista, una por línea, con el nombre EXACTO del material (como está cargado en Materiales) y la cantidad de piezas/unidades que compraste. Ejemplo:</div>
        <div class="hint mono" style="margin-top:4px; background:var(--bg); padding:8px; border-radius:var(--radius);">Hierro 50-20, 5<br>Tabla de Eucalipo, 2</div>
        <div class="field" style="margin-top:12px;">
          <textarea id="inv-masivo" placeholder="Hierro 50-20, 5&#10;Tabla de Eucalipo, 2" style="min-height:120px;"></textarea>
        </div>
        <div class="row" style="margin-top:12px;">
          <button class="action" onclick="guardarInventarioMasivo()">Sumar al stock</button>
        </div>
      ` : ''}
    </div>

    <div class="panel">
      <h2>Stock por material</h2>
      ${materialesOrdenados.length === 0 ? '<div class="empty">Todavía no cargaste materiales.</div>' : `
      <div class="tag-grid">
        ${materialesOrdenados.map(m => {
          const retazosDelMaterial = inv.retazos.filter(r=>r.materialId===m.id);
          if(m.piezaLargo){
            const piezas = inv.stockPiezas[m.id] || 0;
            return `
            <div class="tag" style="cursor:default;">
              <div class="nombre">${escapeHtml(m.nombre)}</div>
              <div class="costo">${piezas} <span class="unidad">pieza${piezas===1?'':'s'} entera${piezas===1?'':'s'}</span></div>
              ${retazosDelMaterial.length > 0 ? `<div class="piezas">+ ${retazosDelMaterial.length} retazo${retazosDelMaterial.length===1?'':'s'} disponible${retazosDelMaterial.length===1?'':'s'}</div>` : ''}
              ${piezas <= 0 && retazosDelMaterial.length === 0 ? `<div class="piezas" style="color:var(--danger);">Sin stock</div>` : ''}
            </div>`;
          } else {
            const continuo = inv.stockContinuo[m.id] || 0;
            return `
            <div class="tag" style="cursor:default;">
              <div class="nombre">${escapeHtml(m.nombre)}</div>
              <div class="costo">${continuo} <span class="unidad">${m.unidad}</span></div>
              ${continuo <= 0 ? `<div class="piezas" style="color:var(--danger);">Sin stock</div>` : ''}
            </div>`;
          }
        }).join('')}
      </div>`}
    </div>

    <div class="panel">
      <h2>Retazos / sobrantes disponibles (${inv.retazos.length})</h2>
      ${inv.retazos.length === 0 ? '<div class="empty">No hay retazos guardados todavía. Se van a ir creando solos cuando marqués presupuestos como Aceptados.</div>' : `
        ${inv.retazos.map(r => {
          const mat = state.materiales.find(m=>m.id===r.materialId);
          return `
          <div class="item-line">
            <div class="et">${escapeHtml(mat ? mat.nombre : '(material eliminado)')} — ${r.medida}${r.unidad}</div>
            <span class="calc-badge">${fechaLegible(r.fecha)}</span>
            <button class="ghost small" onclick="eliminarRetazo('${r.id}')">Descartar</button>
          </div>`;
        }).join('')}
      `}
    </div>
  `;
}

function toggleCargaInventarioMasiva(){
  state.cargaInventarioMasiva = !state.cargaInventarioMasiva;
  render();
}

async function guardarInventarioMasivo(){
  const texto = document.getElementById('inv-masivo').value;
  const lineas = texto.split('\n').map(l=>l.trim()).filter(Boolean);
  if(lineas.length === 0){ showToast('Pegá al menos una línea'); return; }

  const inv = JSON.parse(JSON.stringify(state.inventario || { stockPiezas:{}, stockContinuo:{}, retazos:[] }));
  const noEncontrados = [];
  let sumados = 0;

  lineas.forEach(linea => {
    const partes = linea.split(',').map(s=>s.trim());
    if(partes.length < 2) return;
    const nombre = partes[0];
    const cantidad = parseFloat(partes[1]);
    if(!nombre || isNaN(cantidad)) return;
    const mat = state.materiales.find(m => m.nombre.toLowerCase() === nombre.toLowerCase());
    if(!mat){ noEncontrados.push(nombre); return; }
    if(mat.piezaLargo){
      inv.stockPiezas[mat.id] = (inv.stockPiezas[mat.id]||0) + cantidad;
    } else {
      inv.stockContinuo[mat.id] = (inv.stockContinuo[mat.id]||0) + cantidad;
    }
    sumados++;
  });

  state.inventario = inv;
  await storageSet(KEYS.inventario, inv);

  if(noEncontrados.length > 0){
    showToast(`Sumé ${sumados}, pero no encontré: ${noEncontrados.join(', ')}`);
  } else {
    showToast(`${sumados} material(es) sumados al stock`);
  }
  state.cargaInventarioMasiva = false;
  render();
}

function eliminarRetazo(id){
  showConfirm('¿Descartar este retazo? (por ejemplo si ya no sirve o se usó fuera del sistema)', async ()=>{
    const inv = JSON.parse(JSON.stringify(state.inventario));
    inv.retazos = inv.retazos.filter(r=>r.id!==id);
    state.inventario = inv;
    await storageSet(KEYS.inventario, inv);
    showToast('Retazo descartado');
    render();
  });
}

// ============== Consumo y reversión de stock (atado al Estado del presupuesto) ==============

async function aplicarConsumoInventario(registro){
  const inv = JSON.parse(JSON.stringify(state.inventario || { stockPiezas:{}, stockContinuo:{}, retazos:[] }));
  const movimientos = [];

  (registro.items||[]).forEach(item => {
    if(!item.materialId) return; // ítem sintético (venta manual sin material real)

    if(item.piezasComprar){
      // Material comprado en piezas de tamaño fijo
      inv.stockPiezas[item.materialId] = (inv.stockPiezas[item.materialId]||0) - item.piezasComprar;
      let retazoId = null;
      if(item.sobrante && item.sobrante > 0.001){
        retazoId = uid();
        inv.retazos.push({
          id: retazoId,
          materialId: item.materialId,
          medida: item.sobrante,
          unidad: item.unidad,
          origenPresupuestoId: registro.id,
          fecha: fechaHoy(),
        });
      }
      movimientos.push({ materialId: item.materialId, piezas: item.piezasComprar, retazoId });
    } else {
      // Material suelto (sin pieza fija): descuenta cantidad continua
      inv.stockContinuo[item.materialId] = (inv.stockContinuo[item.materialId]||0) - item.cantidad;
      movimientos.push({ materialId: item.materialId, continuo: item.cantidad });
    }
  });

  state.inventario = inv;
  await storageSet(KEYS.inventario, inv);
  registro.inventarioMovimientos = movimientos;
  registro.inventarioAplicado = true;
}

async function revertirConsumoInventario(registro){
  if(!registro.inventarioAplicado || !registro.inventarioMovimientos || registro.inventarioMovimientos.length === 0) return;
  const inv = JSON.parse(JSON.stringify(state.inventario || { stockPiezas:{}, stockContinuo:{}, retazos:[] }));

  registro.inventarioMovimientos.forEach(mov => {
    if(mov.piezas){
      inv.stockPiezas[mov.materialId] = (inv.stockPiezas[mov.materialId]||0) + mov.piezas;
    }
    if(mov.retazoId){
      inv.retazos = inv.retazos.filter(r=>r.id !== mov.retazoId);
    }
    if(mov.continuo){
      inv.stockContinuo[mov.materialId] = (inv.stockContinuo[mov.materialId]||0) + mov.continuo;
    }
  });

  state.inventario = inv;
  await storageSet(KEYS.inventario, inv);
  registro.inventarioMovimientos = [];
  registro.inventarioAplicado = false;
}
