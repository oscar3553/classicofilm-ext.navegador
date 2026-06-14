let totalPeliculas = 0;
const titulosRegistrados = new Set();
let peliculasDatos = []; 
let todasLasEtiquetas = new Set();
let generoActivo = "TODOS";

let peliculasFiltradas = []; 
let paginaActual = 1;
const peliculasPorPagina = 16; 

async function cargarTodoElCatalogo() {
    document.getElementById('estado-titulo').innerText = "Cargando películas recientes...";
    await cargarBloque(1);
    document.getElementById('estado-titulo').innerText = "Cargando películas intermedias...";
    await cargarBloque(151);
    document.getElementById('estado-titulo').innerText = "Cargando películas antiguas...";
    await cargarBloque(301);
    
    document.getElementById('estado-titulo').innerText = `CATÁLOGO (${totalPeliculas} PELÍCULAS)`;
    
    crearBotonesDeGeneros();
    
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

        // DETECTOR INTELIGENTE DE MÚLTIPLES SERVIDORES (Dzen vs Odysee)
        let urlDzen = "";
        let urlOdysee = "";
        const contenidoPost = entry.content ? entry.content.$t : "";
        
        // Buscamos todos los iframes del post
        const matchesIframe = [...contenidoPost.matchAll(/<iframe[^>]+src="([^">]+)"/g)];
        
        if (matchesIframe.length > 0) {
            matchesIframe.forEach(match => {
                let urlEncontrada = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
                if (urlEncontrada.includes("dzen") || urlEncontrada.includes("yandex") || urlDzen === "") {
                    if (!urlDzen) urlDzen = urlEncontrada;
                }
                if (urlEncontrada.includes("odysee") || urlEncontrada.includes("lbry")) {
                    urlOdysee = urlEncontrada;
                }
            });
        }

        // Si no se detectó nada mediante iframe, intentamos buscar enlaces directos en el contenido del post
        if (!urlOdysee) {
            const matchLinkOdysee = contenidoPost.match(/href="([^">]*odysee[^">]*)"/);
            if (matchLinkOdysee) urlOdysee = matchLinkOdysee[1];
        }

        // Si no hay reproductor disponible de ningún tipo, saltamos la entrada
        if (!urlDzen && !urlOdysee) return;

        let generosPeli = [];
        if (entry.category) {
            generosPeli = entry.category.map(cat => cat.term.trim());
            generosPeli.forEach(g => todasLasEtiquetas.add(g));
        }

        let anioMatch = titulo.match(/\((\d{4})\)/);
        let anioPeli = anioMatch ? anioMatch[1] : "Clásico";

        totalPeliculas++;

        peliculasDatos.push({ 
            titulo: titulo, 
            urlImagen: imagenUrl,
            urlDzen: urlDzen,
            urlOdysee: urlOdysee,
            anio: anioPeli,
            generos: generosPeli 
        });
    });
}

function mostrarPaginaActual() {
    const contenedor = document.getElementById('catalogo-tv');
    contenedor.innerHTML = ""; 

    if (peliculasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">No se encontraron películas.</p>`;
        return;
    }

    const inicio = (paginaActual - 1) * peliculasPorPagina;
    const fin = inicio + peliculasPorPagina;
    const pelisDeLaPagina = pelisDeLaPagina = peliculasFiltradas.slice(inicio, fin);

    pelisDeLaPagina.forEach(peli => {
        const tarjeta = document.createElement('a');
        tarjeta.href = "#";
        tarjeta.className = 'movie-card';
        tarjeta.innerHTML = `<img src="${peli.urlImagen}" alt="${peli.titulo}"><p>${peli.titulo}</p>`;
        
        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();
            abrirFichaDetalle(peli);
        });

        contenedor.appendChild(tarjeta);
    });
}

function actualizarPaginacion() {
    const totalPaginas = Math.ceil(peliculasFiltradas.length / peliculasPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = 1;

    document.getElementById('pag-actual').innerText = paginaActual;
    document.getElementById('pag-total').innerText = totalPaginas;

    document.getElementById('btn-pag-ant').disabled = (paginaActual === 1);
    document.getElementById('btn-pag-sig').disabled = (paginaActual === totalPaginas);

    // CONTROL DEL BOTÓN VOLVER/RESET: Si estamos filtrando, aparece el botón dinámico de regreso rápido
    const btnReset = document.getElementById('btn-reset-menu');
    if (generoActivo !== "TODOS" || document.getElementById('buscador-cine').value.trim() !== "") {
        btnReset.style.display = "inline-block";
    } else {
        btnReset.style.display = "none";
    }

    mostrarPaginaActual();
}

function abrirFichaDetalle(peli) {
    document.getElementById('modal-titulo').innerText = peli.titulo;
    document.getElementById('modal-caratula').src = peli.urlImagen;
    document.getElementById('modal-anio').innerText = peli.anio;
    document.getElementById('modal-generos').innerHTML = peli.generos.map(g => `<span class="info-valor">${g}</span>`).join(' ');

    const btnDzen = document.getElementById('btn-play-dzen');
    const btnOdysee = document.getElementById('btn-play-odysee');
    const txtErrorOdysee = document.getElementById('error-odysee-text');

    // Configurar Dzen
    if (peli.urlDzen) {
        btnDzen.disabled = false;
        btnDzen.onclick = () => lanzarCinePantallaCompleta(peli.urlDzen);
    } else {
        btnDzen.disabled = true;
    }

    // Configurar Odysee (Evitamos que reproduzca Dzen si no existe)
    if (peli.urlOdysee) {
        btnOdysee.disabled = false;
        txtErrorOdysee.style.display = "none";
        btnOdysee.onclick = () => lanzarCinePantallaCompleta(peli.urlOdysee);
    } else {
        btnOdysee.disabled = true;
        txtErrorOdysee.style.display = "block"; // Muestra un aviso limpio al usuario
    }

    document.getElementById('modal-detalle-pelicula').style.display = "flex";
}

function resetearFiltrosYVolverAlMenu() {
    document.getElementById('buscador-cine').value = "";
    generoActivo = "TODOS";
    document.querySelectorAll('.btn-genero').forEach(b => b.classList.remove('activo'));
    const btnTodos = document.getElementById('btn-genero-todos');
    if (btnTodos) btnTodos.classList.add('activo');
    
    peliculasFiltradas = [...peliculasDatos];
    paginaActual = 1;
    actualizarPaginacion();
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

    peliculasFiltradas = peliculasDatos.filter(peli => {
        const coincideBusqueda = peli.titulo.toLowerCase().includes(textoBusqueda);
        const coincideGenero = (generoActivo === "TODOS" || peli.generos.includes(generoActivo));
        return coincideBusqueda && coincideGenero;
    });

    paginaActual = 1; 
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

document.addEventListener('DOMContentLoaded', () => {
    const buscador = document.getElementById('buscador-cine');
    if (buscador) buscador.addEventListener('input', aplicarFiltrosYBusqueda);

    document.getElementById('btn-pag-ant').addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarPaginacion();
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const btnCarpeta = document.getElementById('btn-toggle-categorias');
    if (btnCarpeta) {
        btnCarpeta.addEventListener('click', () => {
            const carpeta = document.getElementById('carpeta-categorias');
            carpeta.style.display = (carpeta.style.display === "block") ? "none" : "block";
        });
    }

    // Evento del nuevo botón "Volver al menú inicial" integrado en la cabecera
    document.getElementById('btn-reset-menu').addEventListener('click', resetearFiltrosYVolverAlMenu);

    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarFichaDetalle);
    document.getElementById('close-player-btn').addEventListener('click', cerrarReproductor);
});

window.onload = () => { cargarTodoElCatalogo(); };
