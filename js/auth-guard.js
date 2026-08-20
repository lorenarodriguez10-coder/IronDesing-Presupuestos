// auth-guard.js
// Oculta el contenido hasta confirmar que hay sesión iniciada.

(function () {
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      // Hay sesión confirmada: recién ahora mostramos el contenido
      document.body.style.display = "";
    }
  });
})();
