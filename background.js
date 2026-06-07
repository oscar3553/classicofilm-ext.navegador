// Escucha cuando el usuario hace clic en el icono de la extensión
chrome.action.onClicked.addListener((tab) => {
  // Abre una pestaña nueva cargando nuestro index.html
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html")
  });
});
