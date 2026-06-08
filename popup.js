let totalPeliculas = 0;
const titulosRegistrados = new Set();
let peliculasDatos = []; // Para las búsquedas y filtros
let todasLasEtiquetas = new Set();
let generoActivo = "TODOS";

async function cargarTodoElCatalogo() {
    document.getElementById('estado-titulo').innerText = "Cargando películas recientes...";
    await cargarBloque(1);
    document.getElementById('estado-titulo').innerText = "Cargando películas intermedias...";
    await cargarBloque(151);
    document.getElementById('estado-titulo').innerText = "Cargando películas antiguas...";
    await cargarBloque(301);
    document.getElementById('estado-titulo').innerText = `Catálogo (${totalPeliculas} películas)`;
    crearBotonesDeGeneros();
}

async function cargarBloque(startIndex) {
    const url = `https://www.classicofilm.com/feeds/posts/default?alt=json&start-index=${startIndex}&max-results=150`;
    try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (data.feed && data.feed.entry) agregarPeliculasAlCatalogo(data.feed.entry);
    } catch (e) { console.error("Error en bloque: ", e); }
}

function agregarPeliculasAlCatalogo(entradas) {
    const contenedor = document.getElementById('catalogo-tv');
    if (!entradas) return;

    entradas.forEach((entry) => {
        const titulo = entry.title.$t;
        if (titulosRegistrados.has(titulo)) return;
        titulosRegistrados.add(titulo);

        let imagenUrl = "https://via.placeholder.com/200x280?text=Cine";
        if (entry.media$thumbnail) imagenUrl = entry.media$thumbnail.url.replace('/s72-c/', '/s400/');

        let urlVideo = "";
        const contenidoPost = entry.content ? entry.content.$t : "";
        const coincidencia = contenidoPost.match(/<iframe[^>]+src="([^">]+)"/);
        if (coincidencia && coincidencia[1]) {
            urlVideo = coincidencia[1].startsWith('//') ? 'https:' + coincidencia[1] : coincidencia[1];
        }
        if (!urlVideo) return;

        // Extraer categorías/géneros de Blogger
        let generosPeli = [];
        if (entry.category) {
            generosPeli = entry.category.map(cat => cat.term.trim());
            generosPeli.forEach(g => todasLasEtiquetas.add(g));
        }

        const tarjeta = document.createElement('a');
        tarjeta.href = "#";
        tarjeta.className = 'movie-card';
        tarjeta.innerHTML = `<img src="${imagenUrl}" alt="${titulo}"><p>${titulo}</p>`;
        
        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();
            lanzarCinePantallaCompleta(urlVideo);
        });

        contenedor.appendChild(tarjeta);
        totalPeliculas++;

        // Guardar referencia para buscar/filtrar luego
        peliculasDatos.push({ elemento: tarjeta, titulo: titulo.toLowerCase(), generos: generosPeli });
    });
}

function crearBotonesDeGeneros() {
    const contenedorG = document.getElementById('lista-generos');
    contenedorG.innerHTML = "";
    
    const botonTodos = document.createElement('button');
    botonTodos.className = "btn-genero activo";
    botonTodos.innerText = "Todas las películas";
    botonTodos.addEventListener('click', () => filtrarPorGenero("TODOS", botonTodos));
    contenedorG.appendChild(botonTodos);

    // Ordenar alfabéticamente las etiquetas encontradas
    Array.from(todasLasEtiquetas).sort().forEach(genero => {
        const btn = document.createElement('button');
        btn.className = "btn-genero";
        btn.innerText = genero;
        btn.addEventListener('click', () => filtrarPorGenero(genero, btn));
        contenedorG.appendChild(btn);
    });
}

function filtrarPorGenero(genero, botonSeleccionado) {
    generoActivo = genero;
    document.querySelectorAll('.btn-genero').forEach(b => b.classList.remove('activo'));
    botonSeleccionado.classList.add('activo');
    aplicarFiltrosYBusqueda();
}

function aplicarFiltrosYBusqueda() {
    const textoBusqueda = document.getElementById('buscador-cine').value.toLowerCase();
    
    peliculasDatos.forEach(peli => {
        const cumpleBusqueda = peli.titulo.includes(textoBusqueda);
        const cumpleGenero = (generoActivo === "TODOS" || peli.generos.includes(generoActivo));

        if (cumpleBusqueda && cumpleGenero) {
            peli.elemento.style.display = "block";
        } else {
            peli.elemento.style.display = "none";
        }
    });
}

// Escuchar la barra de búsqueda en tiempo real
document.getElementById('buscador-cine').addEventListener('input', aplicarFiltrosYBusqueda);

function lanzarCinePantallaCompleta(url) {
    document.body.style.overflow = "hidden";
    document.getElementById('video-container-tv').innerHTML = `<iframe src="${url}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    document.getElementById('reproductor-pantalla-completa').style.display = "block";
}

function cerrarReproductor() {
    document.getElementById('reproductor-pantalla-completa').style.display = "none";
    document.getElementById('video-container-tv').innerHTML = ""; 
    document.body.style.overflowY = "auto";
}

document.getElementById('close-player-btn').addEventListener('click', cerrarReproductor);
window.onload = () => { cargarTodoElCatalogo(); };
