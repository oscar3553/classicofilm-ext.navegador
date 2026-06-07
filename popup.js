let totalPeliculas = 0;
const titulosRegistrados = new Set();
let indiceEnFoco = 0;
let peliculasElementos = [];
let estadoActual = "CATALOGO"; 
const columnasFijas = 4;

// 1. Cargar las películas procesando el Feed público de tu Blogger mediante fetch estándar
async function cargarBloque(startIndex) {
    const url = `https://www.classicofilm.com/feeds/posts/default?alt=json&start-index=${startIndex}&max-results=150`;
    try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (data.feed && data.feed.entry) {
            agregarPeliculasAlCatalogo(data.feed.entry);
        }
    } catch (error) {
        console.error("Error cargando bloque: ", error);
    }
}

function agregarPeliculasAlCatalogo(entradas) {
    const contenedor = document.getElementById('catalogo-tv');
    if (!entradas) return;

    entradas.forEach((entry) => {
        const titulo = entry.title.$t;
        if (titulosRegistrados.has(titulo)) return;
        titulosRegistrados.add(titulo);

        let imagenUrl = "https://via.placeholder.com/200x280?text=Cine";
        if (entry.media$thumbnail) {
            // Ampliar miniatura para mejor calidad visual
            imagenUrl = entry.media$thumbnail.url.replace('/s72-c/', '/s400/');
        }

        const contenidoPost = entry.content ? entry.content.$t : "";
        let urlVideo = "";
        
        // Extraer iframe del post de Blogger
        const coincidencia = contenidoPost.match(/<iframe[^>]+src="([^">]+)"/);
        if (coincidencia && coincidencia[1]) {
            urlVideo = coincidencia[1];
            if (urlVideo.startsWith('//')) urlVideo = 'https:' + urlVideo;
        }

        // Si no tiene vídeo reproducible, saltar o marcar (podemos filtrarlo opcionalmente)
        if (!urlVideo) return; 

        const tarjeta = document.createElement('a');
        tarjeta.href = "#";
        tarjeta.className = 'movie-card';
        tarjeta.innerHTML = `<img src="${imagenUrl}" alt="${titulo}"><p>${titulo}</p>`;
        tarjeta.dataset.video = urlVideo;

        // ACCIÓN: Al hacer clic con el ratón
        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();
            lanzarCinePantallaCompleta(urlVideo);
        });

        contenedor.appendChild(tarjeta);
        peliculasElementos.push(tarjeta);
        totalPeliculas++;
    });

    document.getElementById('estado-titulo').innerText = `Catálogo (${totalPeliculas} películas)`;
}

// 2. Controladores de visualización y reproducción
function lanzarCinePantallaCompleta(url) {
    estadoActual = "REPRODUCTOR";
    const contenedorVideo = document.getElementById('video-container-tv');
    
    // Cambiar dinámicamente las dimensiones del body para que el reproductor ocupe toda la pantalla
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";
    document.body.style.overflow = "hidden";

    // Inyectar el Iframe limpio
    contenedorVideo.innerHTML = `
        <iframe id="player-iframe" src="${url}" allow="autoplay; fullscreen" allowfullscreen></iframe>
    `;
    document.getElementById('reproductor-pantalla-completa').style.display = "block";
}

function cerrarReproductor() {
    estadoActual = "CATALOGO";
    document.getElementById('reproductor-pantalla-completa').style.display = "none";
    document.getElementById('video-container-tv').innerHTML = ""; 
    
    // Devolver el popup a sus dimensiones cómodas normales
    document.body.style.width = "800px";
    document.body.style.height = "600px";
    document.body.style.overflowY = "auto";
}

// 3. Soporte opcional para Teclado (Flechas / Enter / Esc)
document.addEventListener('keydown', function(e) {
    if (estadoActual === "REPRODUCTOR") {
        if (e.key === "Escape") {
            cerrarReproductor();
        }
        return;
    }

    if (peliculasElementos.length === 0) return;

    if (e.key === "ArrowRight") {
        if (indiceEnFoco < peliculasElementos.length - 1) indiceEnFoco++;
        actualizarFocoTeclado();
    } else if (e.key === "ArrowLeft") {
        if (indiceEnFoco > 0) indiceEnFoco--;
        actualizarFocoTeclado();
    } else if (e.key === "ArrowDown") {
        if (indiceEnFoco + columnasFijas < peliculasElementos.length) indiceEnFoco += columnasFijas;
        actualizarFocoTeclado();
    } else if (e.key === "ArrowUp") {
        if (indiceEnFoco - columnasFijas >= 0) indiceEnFoco -= columnasFijas;
        actualizarFocoTeclado();
    } else if (e.key === "Enter") {
        e.preventDefault();
        peliculasElementos[indiceEnFoco].click();
    }
});

function actualizarFocoTeclado() {
    peliculasElementos.forEach(el => el.classList.remove('focused'));
    const elemento = peliculasElementos[indiceEnFoco];
    if (elemento) {
        elemento.classList.add('focused');
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Asignar evento al botón de cierre
document.getElementById('close-player-btn').addEventListener('click', cerrarReproductor);

// Ejecutar carga al abrir la extensión
window.onload = function() {
    // Lanza las peticiones en paralelo (hasta 450 posts)
    cargarBloque(1);
    cargarBloque(151);
    cargarBloque(301);
};
