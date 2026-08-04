function renderMateriales(){
  const editing = state.materiales.find(m => m.id === state.editingMaterialId);
  return `
    <div class="panel">
      <h2>${editing ? 'Editar material' : 'Nuevo material'}</h2>
      <div class="row">
        <div class="field">
          <label>Nombre</label>
          <input id="m-nombre" placeholder="Ej: Tabla de roble 2.4m" value="${editing ? escapeHtml(editing.nombre) : ''}">
        </div>
        <div class="field">
          <label>Unidad</label>
          <select id="m-unidad">
            ${UNIDADES.map(u => `<option value="${u}" ${editing && editing.unidad===u ? 'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Costo por unidad</label>
          <input id="m-costo" type="number" step="0.01" min="0" placeholder="0.00" value="${editing ? editing.costo : ''}">
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="field">
          <label>Largo de la pieza (m) — opcional</label>
          <input id="m-largo" type="number" step="0.001" min="0" placeholder="Ej: 1.20" value="${editing && editing.piezaLargo ? editing.piezaLargo : ''}">
        </div>
        <div class="field">
          <label>Ancho de la pieza (m) — opcional</label>
          <input id="m-ancho" type="number" step="0.001" min="0" placeholder="Ej: 0.60" value="${editing && editing.piezaAncho ? editing.piezaAncho : ''}">
        </div>
        <div class="field" style="flex: 0 0 auto;">
          <button class="action" onclick="saveMaterial()">${editing ? 'Guardar cambios' : 'Agregar material'}</button>
        </div>
        ${editing ? `<div class="field" style="flex:0 0 auto;"><button class="ghost action" onclick="cancelEditMaterial()">Cancelar</button></div>` : ''}
      </div>
      <div class="hint">Cargá estas medidas solo si el material se compra en piezas de tamaño fijo (una tabla, un caño, una plancha). Así el sistema calcula cuántas piezas enteras hacen falta según las medidas del mueble, en vez de solo el área o largo total.</div>
    </div>
    <div class="panel">
      <h2>Materiales cargados (${state.materiales.length})</h2>
      ${state.materiales.length === 0 ? '<div class="empty">Todavía no cargaste materiales. Sumá el primero arriba.</div>' : `
      <div class="tag-grid">
        ${state.materiales.map(m => `
          <div class="tag" onclick="editMaterial('${m.id}')">
            <button class="del" onclick="event.stopPropagation(); deleteMaterial('${m.id}')">✕</button>
            <div class="nombre">${escapeHtml(m.nombre)}</div>
            <div class="costo">${money(m.costo)}<span class="unidad"> / ${m.unidad}</span></div>
            ${m.piezaLargo ? `<div class="piezas">pieza: ${m.piezaLargo}m × ${m.piezaAncho||'-'}m</div>` : ''}
          </div>
        `).join('')}
      </div>`}
    </div>
  `;
}

async function saveMaterial(){
  const nombre = document.getElementById('m-nombre').value.trim();
  const unidad = document.getElementById('m-unidad').value;
  const costo = parseFloat(document.getElementById('m-costo').value);
  const piezaLargo = parseFloat(document.getElementById('m-largo').value) || null;
  const piezaAncho = parseFloat(document.getElementById('m-ancho').value) || null;
  if(!nombre || isNaN(costo) || costo < 0){ showToast('Completá nombre y costo válido'); return; }
  if(state.editingMaterialId){
    const idx = state.materiales.findIndex(m=>m.id===state.editingMaterialId);
    state.materiales[idx] = { ...state.materiales[idx], nombre, unidad, costo, piezaLargo, piezaAncho };
    state.editingMaterialId = null;
  } else {
    state.materiales.push({ id: uid(), nombre, unidad, costo, piezaLargo, piezaAncho });
  }
  await storageSet(KEYS.materiales, state.materiales);
  showToast('Material guardado');
  render();
}
function editMaterial(id){ state.editingMaterialId = id; render(); }
function cancelEditMaterial(){ state.editingMaterialId = null; render(); }
function deleteMaterial(id){
  showConfirm('¿Eliminar este material?', async ()=>{
    state.materiales = state.materiales.filter(m=>m.id!==id);
    await storageSet(KEYS.materiales, state.materiales);
    showToast('Material eliminado');
    render();
  });
}
function materialName(id){ const m = state.materiales.find(m=>m.id===id); return m ? m.nombre + ' (' + m.unidad + ')' : '(material eliminado)'; }
