const KEYS = { materiales: 'materiales-list', plantillas: 'plantillas-list', presupuestos: 'presupuestos-list', inventario: 'inventario-datos' };

async function storageSet(key, value){
  try{
    await db.collection('taller-datos').doc(key).set({ items: value });
    return true;
  }catch(e){ console.error(e); showToast('Error guardando datos (revisá la conexión a Firebase)'); return false; }
}

let _loadedCount = 0;
function checkAllLoaded(){
  _loadedCount++;
  if(_loadedCount >= 4 && !state.loaded){ state.loaded = true; }
  render();
}

function loadAll(){
  db.collection('taller-datos').doc(KEYS.materiales).onSnapshot(doc => {
    state.materiales = doc.exists ? (doc.data().items || []) : [];
    checkAllLoaded();
  }, err => { console.error(err); showToast('No se pudo conectar a Firebase'); });

  db.collection('taller-datos').doc(KEYS.plantillas).onSnapshot(doc => {
    state.plantillas = doc.exists ? (doc.data().items || []) : [];
    checkAllLoaded();
  }, err => console.error(err));

  db.collection('taller-datos').doc(KEYS.presupuestos).onSnapshot(doc => {
    state.presupuestos = doc.exists ? (doc.data().items || []) : [];
    checkAllLoaded();
  }, err => console.error(err));

  db.collection('taller-datos').doc(KEYS.inventario).onSnapshot(doc => {
    state.inventario = doc.exists ? (doc.data().items || { stockPiezas:{}, stockContinuo:{}, retazos:[] }) : { stockPiezas:{}, stockContinuo:{}, retazos:[] };
    checkAllLoaded();
  }, err => console.error(err));
}

// Numeración automática de presupuestos, atómica (segura si dos personas guardan a la vez)
async function obtenerProximoNumero(){
  const ref = db.collection('taller-datos').doc('contador-presupuestos');
  try{
    const nuevoNumero = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const actual = doc.exists ? (doc.data().ultimo || 0) : 0;
      const siguiente = actual + 1;
      tx.set(ref, { ultimo: siguiente });
      return siguiente;
    });
    return nuevoNumero;
  }catch(e){
    console.error(e);
    return (state.presupuestos.length || 0) + 1; // respaldo si falla la transacción
  }
}
function formatearNumero(n){ return String(n).padStart(5, '0'); }
