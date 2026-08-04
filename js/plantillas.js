function renderPlantillas(){
  const b = state.plantillaBuilder;
  const editando = !!state.editingPlantillaId;
  return `
    <div class="panel">
      <h2>${editando ? 'Editar plantilla' : 'Nueva plantilla de mueble'}</h2>
      <div class="row">
        <div class="field">
          <label>Nombre de la plantilla</label>
          <input id="p-nombre" placeholder="Ej: Recibidor doble 1.20m" value="${escapeHtml(b.nombre)}">
        </div>
        <div class="field">
          <label>Tipo</label>
          <select id="p-tipo">
            ${TIPOS_MUEBLE.map(t => `<option value="${t}" ${b.tipo===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>

      <h2 style="margin-top:22px;">Ítems de materiales</h2>
      ${b.items.length === 0 ? '<div class="empty">Agregá materiales y cómo se calcula su cantidad según las medidas.</div>' : b.items.map((it,i) => `
        <div class="item-line">
          <div class="et">${escapeHtml(materialName(it.materialId))}</div>
          <span class="calc-badge">${CALCULOS.find(c=>c.v===it.calculo).label}</span>
          <span class="calc-badge">cantidad ${it.factor}</span>
          <button class="ghost small" onclick="removePlantillaItem(${i})">Quitar</button>
        </div>
      `).join('')}

      <div class="row" style="margin-top:14px;">
        <div class="field">
          <label>Material</label>
          <select id="pi-material">
            ${state.materiales.length === 0 ? '<option value="">Cargá materiales primero</option>' : state.materiales.map(m=>`<option value="${m.id}">${escapeHtml(m.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Cómo se calcula</label>
          <select id="pi-calculo">
            ${CALCULOS.map(c=>`<option value="${c.v}">${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Cantidad</label>
          <input id="pi-factor" type="number" step="0.01" value="1">
        </div>
        <div class="field" style="flex:0 0 auto;">
          <button class="action ghost" onclick="addPlantillaItem()">+ Agregar ítem</button>
        </div>
      </div>
      <div class="hint">Ej: para la tabla superior de una mesa elegí "Área" con cantidad 1.1 (10% de merma). Para las 4 patas, elegí "Cantidad fija" con cantidad 4. Si el material tiene cargadas las medidas de la pieza (en Materiales), acá se calculan directamente cuántas piezas enteras hacen falta.</div>

      <div class="row" style="margin-top:18px;">
        <button class="action" onclick="savePlantilla()">${editando ? 'Guardar cambios' : 'Guardar plantilla'}</button>
        ${editando ? `<button class="ghost action" onclick="cancelEditPlantilla()">Cancelar</button>` : ''}
      </div>
    </div>

    <div class="panel">
      <h2>Plantillas guardadas (${state.plantillas.length})</h2>
      ${state.plantillas.length === 0 ? '<div class="empty">Todavía no hay plantillas guardadas.</div>' : state.plantillas.map(pl => `
        <div class="plantilla-card">
          <div class="head">
            <div><span class="nombre">${escapeHtml(pl.nombre)}</span><span class="tipo">${pl.tipo}</span></div>
            <div style="display:flex; gap:8px;">
              <button class="ghost small" onclick="editPlantilla('${pl.id}')">Editar</button>
              <button class="danger small" onclick="deletePlantilla('${pl.id}')">Eliminar</button>
            </div>
          </div>
          ${pl.items.map(it => `<div class="item-line"><div class="et">${escapeHtml(materialName(it.materialId))}</div><span class="calc-badge">${CALCULOS.find(c=>c.v===it.calculo).label}</span><span class="calc-badge">cantidad ${it.factor}</span></div>`).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function addPlantillaItem(){
  const materialId = document.getElementById('pi-material').value;
  const calculo = document.getElementById('pi-calculo').value;
  const factor = parseFloat(document.getElementById('pi-factor').value);
  if(!materialId){ showToast('Elegí un material'); return; }
  if(isNaN(factor) || factor <= 0){ showToast('Cantidad inválida'); return; }
  state.plantillaBuilder.nombre = document.getElementById('p-nombre').value;
  state.plantillaBuilder.tipo = document.getElementById('p-tipo').value;
  state.plantillaBuilder.items.push({ materialId, calculo, factor });
  render();
}
function removePlantillaItem(i){ state.plantillaBuilder.items.splice(i,1); render(); }

async function savePlantilla(){
  const nombre = document.getElementById('p-nombre').value.trim();
  const tipo = document.getElementById('p-tipo').value;
  const items = state.plantillaBuilder.items;
  if(!nombre){ showToast('Ponele un nombre a la plantilla'); return; }
  if(items.length === 0){ showToast('Agregá al menos un ítem de material'); return; }
  if(state.editingPlantillaId){
    const idx = state.plantillas.findIndex(p=>p.id===state.editingPlantillaId);
    if(idx > -1) state.plantillas[idx] = { ...state.plantillas[idx], nombre, tipo, items };
    state.editingPlantillaId = null;
    showToast('Plantilla actualizada');
  } else {
    state.plantillas.push({ id: uid(), nombre, tipo, items });
    showToast('Plantilla guardada');
  }
  await storageSet(KEYS.plantillas, state.plantillas);
  state.plantillaBuilder = { nombre:'', tipo:'Mesa', items: [] };
  render();
}
function editPlantilla(id){
  const pl = state.plantillas.find(p=>p.id===id);
  if(!pl) return;
  state.editingPlantillaId = id;
  state.plantillaBuilder = { nombre: pl.nombre, tipo: pl.tipo, items: JSON.parse(JSON.stringify(pl.items)) };
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelEditPlantilla(){
  state.editingPlantillaId = null;
  state.plantillaBuilder = { nombre:'', tipo:'Mesa', items: [] };
  render();
}
function deletePlantilla(id){
  showConfirm('¿Eliminar esta plantilla?', async ()=>{
    state.plantillas = state.plantillas.filter(p=>p.id!==id);
    await storageSet(KEYS.plantillas, state.plantillas);
    showToast('Plantilla eliminada');
    render();
  });
}
