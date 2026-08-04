function render(){
  const tabsEl = document.getElementById('tabs');
  const mainEl = document.getElementById('main');
  const tabs = [
    ['dashboard','Dashboard'], ['materiales','Materiales'], ['plantillas','Plantillas'], ['inventario','Inventario'], ['presupuesto','Presupuesto'], ['historial','Historial']
  ];
  tabsEl.innerHTML = tabs.map(([id,label]) => `<button class="${state.tab===id?'active':''}" onclick="setTab('${id}')">${label}</button>`).join('');

  if(!state.loaded){ mainEl.innerHTML = '<div class="panel"><div class="empty">Cargando datos...</div></div>'; return; }

  if(state.tab==='dashboard') mainEl.innerHTML = renderDashboard();
  else if(state.tab==='materiales') mainEl.innerHTML = renderMateriales();
  else if(state.tab==='plantillas') mainEl.innerHTML = renderPlantillas();
  else if(state.tab==='inventario') mainEl.innerHTML = renderInventario();
  else if(state.tab==='presupuesto') mainEl.innerHTML = renderPresupuesto();
  else if(state.tab==='historial') mainEl.innerHTML = renderHistorial();
}

function iniciarApp(){
  if(!FIREBASE_CONFIGURADO){
    render();
    document.getElementById('main').innerHTML = `
      <div class="panel">
        <h2>Falta configurar Firebase</h2>
        <p style="line-height:1.6;">Todavía no completaste los datos de tu proyecto de Firebase en <code>js/config.js</code> (la constante <code>firebaseConfig</code>). Sin eso, la app no puede guardar ni sincronizar datos.</p>
      </div>`;
  } else {
    loadAll();
  }
}

// Atajo de teclado: Enter guarda el presupuesto, una vez que ya está calculado (el ticket visible).
// No actúa dentro de textareas (ahí Enter tiene que seguir agregando renglones normalmente).
document.addEventListener('keydown', (e) => {
  if(e.key !== 'Enter') return;
  if(e.target && e.target.tagName === 'TEXTAREA') return;
  if(state.tab === 'presupuesto' && state.presupuestoActual && typeof guardarPresupuesto === 'function'){
    const dentroDelForm = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT');
    if(dentroDelForm){
      e.preventDefault();
      const t = calcularTotalesPDF ? calcularTotalesPDF(state.presupuestoActual) : null;
      if(t) guardarPresupuesto(t.subtotalMateriales, t.manoObra, t.impuestos, t.total);
    }
  }
});

iniciarApp();
