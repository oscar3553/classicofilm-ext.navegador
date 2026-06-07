let totalPeliculas = 0;
const titulosRegistrados = new Set();
let indiceEnFoco = 0;
let peliculasElementos = [];
let estadoActual = "CATALOGO"; 

// Cargar los bloques en orden secuencial estricto para evitar que se desordenen
async function cargarTodoElCatalogo() {
    document.getElementById('estado-titulo').innerText = "Cargando películas recientes...";
    await cargarBloque(1);
    
    document.getElementById('estado-titulo').innerText = "Cargando películas intermedias...";
    await cargarBloque(151);
    
    document.getElementById('estado-titulo').innerText = "Cargando películas antiguas...";
    await cargarBloque(301);
    
    document.getElementById('estado-titulo').innerText = `Catálogo (${totalPeliculas} películas)`;
}

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
            imagenUrl = entry.media$thumbnail.url.replace('/s72-c/', '/s400/');
        }

        const contenidoPost = entry.content ? entry.content.$t : "";
        let urlVideo = "";
        
        const coincidencia = contenidoPost.match(/<iframe[^>]+src="([^">]+)"/);
        if (coincidencia && coincidencia[1]) {
            urlVideo = coincidencia[1];
            if (urlVideo.startsWith('//')) urlVideo = 'https:' + urlVideo;
        }

        if (!urlVideo) return; 

        const tarjeta = document.createElement('a');
        tarjeta.href = "#";
        tarjeta.className = 'movie-card';
        tarjeta.innerHTML = `<img src="${imagenUrl}" alt="${titulo}"><p>${titulo}</p>`;
        tarjeta.dataset.video = urlVideo;

        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();
            lanzarCinePantallaCompleta(urlVideo);
        });

        contenedor.appendChild(tarjeta);
        peliculasElementos.push(tarjeta);
        totalPeliculas++;
    });
}

function lanzarCinePantallaCompleta(url) {
    estadoActual = "REPRODUCTOR";
    const contenedorVideo = document.getElementById('video-container-tv');
    
    document.body.style.overflow = "hidden";
    contenedorVideo.innerHTML = `<iframe id="player-iframe" src="${url}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    document.getElementById('reproductor-pantalla-completa').style.display = "block";
}

function cerrarReproductor() {
    estadoActual = "CATALOGO";
    document.getElementById('reproductor-pantalla-completa').style.display = "none";
    document.getElementById('video-container-tv').innerHTML = ""; 
    document.body.style.overflowY = "auto"; // Mantiene el tamaño completo de la pestaña
}

// Asignar evento al botón de cierre
document.getElementById('close-player-btn').addEventListener('click', cerrarReproductor);

// Ejecutar la carga ordenada al abrir
window.onload = function() {
    cargarTodoElCatalogo();
};
