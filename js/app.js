function render(){
  const tabsEl = document.getElementById('tabs');
  const mainEl = document.getElementById('main');
  const tabs = [
    ['materiales','Materiales'], ['plantillas','Plantillas'], ['presupuesto','Presupuesto'], ['historial','Historial']
  ];
  tabsEl.innerHTML = tabs.map(([id,label]) => `<button class="${state.tab===id?'active':''}" onclick="setTab('${id}')">${label}</button>`).join('');

  if(!state.loaded){ mainEl.innerHTML = '<div class="panel"><div class="empty">Cargando datos...</div></div>'; return; }

  if(state.tab==='materiales') mainEl.innerHTML = renderMateriales();
  else if(state.tab==='plantillas') mainEl.innerHTML = renderPlantillas();
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

iniciarApp();
