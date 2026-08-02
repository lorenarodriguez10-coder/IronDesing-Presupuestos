const UNIDADES = ['m', 'm2', 'm3', 'kg', 'unidad', 'litro', 'hora'];
const TIPOS_MUEBLE = ['Mesa', 'Silla', 'Estantería', 'Placard', 'Otro'];
const CALCULOS = [
  { v:'largo', label:'Lineal (largo)' },
  { v:'ancho', label:'Lineal (ancho)' },
  { v:'alto', label:'Lineal (alto)' },
  { v:'area', label:'Área (largo × ancho)' },
  { v:'volumen', label:'Volumen (largo × ancho × alto)' },
  { v:'fijo', label:'Cantidad fija (manual)' },
];

let state = {
  tab: 'dashboard',
  materiales: [],
  plantillas: [],
  presupuestos: [],
  loaded: false,
  editingMaterialId: null,
  plantillaBuilder: { nombre:'', tipo:'Mesa', items: [] },
  editingPlantillaId: null,
  presupuestoActual: null,
  presupuestoItemsEdit: [], // copia editable (solo para este presupuesto) de los factores de la plantilla elegida
  presupuestoDraft: { nombre:'', cliente:{nombre:'',telefono:'',direccion:'',email:''}, tiempoFabricacion:'', observaciones:'' },
  historialFiltros: { texto:'', estado:'todos', fechaDesde:'', fechaHasta:'' },
  viewingHistorial: null,
};

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function money(n){ return '$' + (Math.round((n||0)*100)/100).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent = s||''; return d.innerHTML; }
function fechaHoy(){ return new Date().toISOString().slice(0,10); }
function fechaLegible(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}

function showConfirm(message, onYes){
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p>${escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button class="ghost action" id="conf-cancel">Cancelar</button>
        <button class="danger action" id="conf-yes">Eliminar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) overlay.remove(); });
  overlay.querySelector('#conf-cancel').onclick = ()=> overlay.remove();
  overlay.querySelector('#conf-yes').onclick = ()=> { overlay.remove(); onYes(); };
}

function setTab(tab){ state.tab = tab; state.editingMaterialId = null; render(); }

function shapeKey(calculo){
  if(calculo==='largo'||calculo==='ancho'||calculo==='alto') return 'lineal';
  if(calculo==='area') return 'area';
  if(calculo==='volumen') return 'volumen';
  return null; // 'fijo' no se agrupa
}
