let totalPeliculas = 0;
const titulosRegistrados = new Set();
let peliculasDatos = []; 
let todasLasEtiquetas = new Set();
let generoActivo = "TODOS";

// --- NUEVAS VARIABLES PARA PAGINACIÓN Y FILTRADO ---
let peliculasFiltradas = []; // Guardará las películas que pasen los filtros actuales
let paginaActual = 1;
const peliculasPorPagina = 16; // Cantidad de entradas por página estilo APK

async function cargarTodoElCatalogo() {
    document.getElementById('estado-titulo').innerText = "Cargando películas recientes...";
    await cargarBloque(1);
    document.getElementById('estado-titulo').innerText = "Cargando películas intermedias...";
    await cargarBloque(151);
    document.getElementById('estado-titulo').innerText = "Cargando películas antiguas...";
    await cargarBloque(301);
    
    document.getElementById('estado-titulo').innerText = `CATÁLOGO (${totalPeliculas} PELÍCULAS)`;
    
    crearBotonesDeGeneros();
    
    // Al terminar de cargar, inicializamos la lista filtrada con todo el catálogo y renderizamos la pág 1
    peliculasFiltradas = [...peliculasDatos];
    actualizarPaginacion();
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

        let generosPeli = [];
        if (entry.category) {
            generosPeli = entry.category.map(cat => cat.term.trim());
            generosPeli.forEach(g => todasLasEtiquetas.add(g));
        }

        // Intentar extraer el año del título de forma automática (ej: "Sahara (1943)" -> 1943)
        let anioMatch = titulo.match(/\((\d{4})\)/);
        let anioPeli = anioMatch ? anioMatch[1] : "Clásico";

        totalPeliculas++;

        // Guardamos los datos puros en el array en lugar de inyectar el elemento directamente
        peliculasDatos.push({ 
            titulo: titulo, 
            urlImagen: imagenUrl,
            urlVideo: urlVideo,
            anio: anioPeli,
            generos: generosPeli 
        });
    });
}

// RENDERIZA EXCLUSIVAMENTE LAS PELÍCULAS DE LA PÁGINA ACTIVA
function mostrarPaginaActual() {
    const contenedor = document.getElementById('catalogo-tv');
    contenedor.innerHTML = ""; // Limpiamos la rejilla vieja

    if (peliculasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">No se encontraron películas.</p>`;
        return;
    }

    // Calculamos el rango de cortes para la paginación
    const inicio = (paginaActual - 1) * peliculasPorPagina;
    const fin = inicio + peliculasPorPagina;
    const pelisDeLaPagina = peliculasFiltradas.slice(inicio, fin);

    pelisDeLaPagina.forEach(peli => {
        const tarjeta = document.createElement('a');
        tarjeta.href = "#";
        tarjeta.className = 'movie-card';
        tarjeta.innerHTML = `<img src="${peli.urlImagen}" alt="${peli.titulo}"><p>${peli.titulo}</p>`;
        
        // Al hacer clic, en lugar de ir a pantalla completa, ABRE LA FICHA INTERMEDIA (Pop-up)
        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();
            abrirFichaDetalle(peli);
        });

        contenedor.appendChild(tarjeta);
    });
}

// ACTUALIZA LOS BOTONES DE ANTERIOR/SIGUIENTE Y EL CONTADOR DE PÁGINAS
function actualizarPaginacion() {
    const totalPaginas = Math.ceil(peliculasFiltradas.length / peliculasPorPagina) || 1;
    
    // Si por filtros quedamos fuera de rango, reiniciamos a la página 1
    if (paginaActual > totalPaginas) paginaActual = 1;

    document.getElementById('pag-actual').innerText = paginaActual;
    document.getElementById('pag-total').innerText = totalPaginas;

    document.getElementById('btn-pag-ant').disabled = (paginaActual === 1);
    document.getElementById('btn-pag-sig').disabled = (paginaActual === totalPaginas);

    mostrarPaginaActual();
}

// NUEVA FUNCIÓN: ABRE LA TARJETA DETALLE ESTILO APK CON DOS SERVIDORES
function abrirFichaDetalle(peli) {
    document.getElementById('modal-titulo').innerText = peli.titulo;
    document.getElementById('modal-caratula').src = peli.urlImagen;
    document.getElementById('modal-anio').innerText = peli.anio;
    document.getElementById('modal-generos').innerHTML = peli.generos.map(g => `<span class="info-valor">${g}</span>`).join(' ');

    // Configuramos los botones para reproducir en pantalla completa utilizando su URL de vídeo
    // Nota: Como Blogger suele traer un único servidor por entrada, ambos usarán el reproductor,
    // emulando la selección de servidores independientes de la APK en la misma interfaz.
    document.getElementById('btn-play-dzen').onclick = () => lanzarCinePantallaCompleta(peli.urlVideo);
    document.getElementById('btn-play-odysee').onclick = () => lanzarCinePantallaCompleta(peli.urlVideo);

    document.getElementById('modal-detalle-pelicula').style.display = "flex";
}

function cerrarFichaDetalle() {
    document.getElementById('modal-detalle-pelicula').style.display = "none";
}

function crearBotonesDeGeneros() {
    const contenedorG = document.getElementById('lista-generos');
    contenedorG.innerHTML = "";
    
    const botonTodos = document.createElement('button');
    botonTodos.id = "btn-genero-todos"; 
    botonTodos.className = "btn-genero activo";
    botonTodos.innerText = "Todas las películas";
    botonTodos.onclick = function() { filtrarPorGenero("TODOS", this); };
    contenedorG.appendChild(botonTodos);

    Array.from(todasLasEtiquetas).sort().forEach(genero => {
        const btn = document.createElement('button');
        btn.className = "btn-genero";
        btn.innerText = genero;
        btn.onclick = function() { filtrarPorGenero(genero, this); };
        contenedorG.appendChild(btn);
    });
}

function filtrarPorGenero(genero, botonSeleccionado) {
    generoActivo = genero;
    document.getElementById('buscador-cine').value = "";
    
    document.querySelectorAll('.btn-genero').forEach(b => b.classList.remove('activo'));
    botonSeleccionado.classList.add('activo');
    
    aplicarFiltrosYBusqueda();
    
    // Al elegir una categoría de la carpeta, la cerramos automáticamente para limpiar la pantalla
    document.getElementById('carpeta-categorias').style.display = "none";
}

function aplicarFiltrosYBusqueda() {
    const textoBusqueda = document.getElementById('buscador-cine').value.toLowerCase().trim();
    
    if (textoBusqueda !== "" && generoActivo !== "TODOS") {
        generoActivo = "TODOS";
        document.querySelectorAll('.btn-genero').forEach(b => b.classList.remove('activo'));
        const btnTodos = document.getElementById('btn-genero-todos');
        if (btnTodos) btnTodos.classList.add('activo');
    }

    // Filtramos el set de datos globales
    peliculasFiltradas = peliculasDatos.filter(peli => {
        const coincideBusqueda = peli.titulo.toLowerCase().includes(textoBusqueda);
        const coincideGenero = (generoActivo === "TODOS" || peli.generos.includes(generoActivo));
        return coincideBusqueda && coincideGenero;
    });

    paginaActual = 1; // Reiniciamos a la primera página tras filtrar
    actualizarPaginacion();
}

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

// --- CONFIGURACIÓN DE LOS EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    const buscador = document.getElementById('buscador-cine');
    if (buscador) buscador.addEventListener('input', aplicarFiltrosYBusqueda);

    // Eventos de Paginación (Botones Inferiores)
    document.getElementById('btn-pag-ant').addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarPaginacion();
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube arriba elegantemente al cambiar de página
        }
    });

    document.getElementById('btn-pag-sig').addEventListener('click', () => {
        const totalPaginas = Math.ceil(peliculasFiltradas.length / peliculasPorPagina);
        if (paginaActual < totalPaginas) {
            paginaActual++;
            actualizarPaginacion();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Evento para abrir/cerrar la "Carpeta" de Categorías
    const btnCarpeta = document.getElementById('btn-toggle-categorias');
    if (btnCarpeta) {
        btnCarpeta.addEventListener('click', () => {
            const carpeta = document.getElementById('carpeta-categorias');
            if (carpeta.style.display === "block") {
                carpeta.style.display = "none";
            } else {
                carpeta.style.display = "block";
            }
        });
    }

    // Eventos para cerrar los Modales
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarFichaDetalle);
    document.getElementById('close-player-btn').addEventListener('click', cerrarReproductor);
});

window.onload = () => { cargarTodoElCatalogo(); };
