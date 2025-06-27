let miembros = [];
let indexEditando = null;
let miembroParaActualizar = null;
let miembrosConEntradaHoy = [];
let indiceEntradaActual = -1;
let miembroEnEdicion = null;


function convertirABase64(archivo, callback) {
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsDataURL(archivo);
}

async function guardarDatos() {
    for (const miembro of miembros) {
        await window.firestore.setDoc(
            window.firestore.doc(window.db, "miembros", miembro.id),
            miembro
        );
    }
    console.log("✅ Datos guardados en Firestore");
}

async function cargarDatos() {
    const snapshot = await window.firestore.getDocs(
        window.firestore.collection(window.db, "miembros")
    );
    miembros = snapshot.docs.map(doc => doc.data());
    console.log("✅ Datos cargados desde Firestore");
}

function mostrarSeccion(seccion) {
    document.querySelectorAll('.container').forEach(div => div.style.display = 'none');
    document.getElementById(seccion).style.display = 'block';
    if (seccion === 'tabla') renderTabla();
}

function registrarMiembro() {
    const id = document.getElementById('idMiembro').value.trim();
    const nombre = document.getElementById('nombreMiembro').value.trim();
    const fechaPago = document.getElementById('fechaPago').value;
    const tipoUsuario = document.getElementById('tipoUsuario').value;
    const duracion = document.getElementById('duracionMembresia').value;
    const monto = parseFloat(document.getElementById('montoPago').value);
    const yaPago = document.getElementById('checkPago').checked;

    const cambiarFoto = document.getElementById('checkCambiarFoto')?.checked;
    const foto = document.getElementById('fotoMiembro').files[0];

    if (!id || !nombre || !fechaPago || !duracion || isNaN(monto)) {
        alert("Completa todos los campos obligatorios");
        return;
    }

    const nuevoMiembro = {
        id, nombre, fechaPago, tipoUsuario, duracion, monto,
        urlFoto: '', entradas: [],
        pagoConfirmado: yaPago
    };

    const procesar = (base64 = '') => {
        nuevoMiembro.urlFoto = base64;
        if (indexEditando !== null) {
            miembros[indexEditando] = nuevoMiembro;
            alert("Datos actualizados");
        } else {
            if (miembros.some(m => m.id === id)) {
                alert("Este ID ya está registrado");
                return;
            }
            miembros.push(nuevoMiembro);
            alert("Miembro registrado");
        }
        guardarDatos();
        limpiarFormulario();
        renderTabla();
        mostrarSeccion('tabla');
        indexEditando = null;
    };

    if (indexEditando !== null) {
        if (cambiarFoto && foto) {
            convertirABase64(foto, base64 => procesar(base64));
        } else {
            nuevoMiembro.urlFoto = miembros[indexEditando].urlFoto;
            procesar();
        }
    } else {
        if (foto) {
            convertirABase64(foto, base64 => procesar(base64));
        } else {
            alert("Debes seleccionar una foto para el nuevo miembro");
        }
    }
}

function renderTabla(filtrados = null) {
    const tbody = document.querySelector('#tablaMiembros tbody');
    tbody.innerHTML = '';

    // 1. Creamos una copia y la ordenamos numéricamente por ID
    const lista = (filtrados || miembros)
        .slice()
        .sort((a, b) => parseInt(a.id) - parseInt(b.id));

    // 2. Recorremos la lista ordenada
    lista.forEach((miembro, index) => {
        const estado = verificarEstado(miembro.fechaPago, miembro.duracion);
        const fechaFin = calcularFechaFin(miembro.fechaPago, miembro.duracion);
        const clase = estado === 'Activo' ? 'activo' : 'inactivo';

        tbody.innerHTML += `
            <tr>
                <td>${miembro.id}</td>
                <td><button onclick="verFicha(${index})">${miembro.nombre}</button></td>
                <td>${miembro.fechaPago}</td>
                <td>${fechaFin}</td>
                <td>${miembro.tipoUsuario}</td>
                <td>${duracionTexto(miembro.duracion)}</td>
                <td>$${miembro.monto.toFixed(2)}</td>
                <td class="${clase}">${estado}</td>
                <td>
                    <button onclick="eliminarMiembro(${index})">Eliminar</button>
                    <button onclick="modificarMiembro(${index})">Modificar</button>
                </td>
            </tr>`;
    });
}

function verificarEstado(fechaPago, duracion) {
    const fechaFin = new Date(fechaPago);
    fechaFin.setDate(fechaFin.getDate() + parseInt(duracion));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy <= fechaFin ? "Activo" : "Inactivo";
}

function calcularFechaFin(fechaPago, duracion) {
    const fechaFin = new Date(fechaPago);
    fechaFin.setDate(fechaFin.getDate() + parseInt(duracion));
    return fechaFin.toISOString().split("T")[0];
}

function duracionTexto(dias) {
    const map = {
        1: "Visita", 7: "Semanal", 30: "Mensual",
        60: "Bimestral", 180: "Semestral", 365: "Anual"
    };
    return map[dias] || `${dias} días`;
}

function verFicha(index) {
    const miembro = miembros[index];
    const estado = verificarEstado(miembro.fechaPago, miembro.duracion);
    const clase = estado === "Activo" ? "activo" : "inactivo";
    const fechaFin = calcularFechaFin(miembro.fechaPago, miembro.duracion);

    document.getElementById('detalleMiembro').innerHTML = `
        <img src="${miembro.urlFoto}" alt="Foto Miembro" />
        <h3>${miembro.nombre}</h3>
        <p>ID: ${miembro.id}</p>
        <p>Tipo: ${miembro.tipoUsuario}</p>
        <p>Duración: ${duracionTexto(miembro.duracion)}</p>
        <p>Fecha Pago: ${miembro.fechaPago}</p>
        <p>Fecha Fin: ${fechaFin}</p>
        <p>Monto: $${miembro.monto.toFixed(2)}</p>
        <p>Pago confirmado: ${miembro.pagoConfirmado ? "✅ Sí" : "❌ No"}</p>
        <p class="${clase}">Estado: ${estado}</p>
    `;
    renderTablaAsistencia(miembro);
    mostrarSeccion('fichaMiembro');
}

function modificarMiembro(index) {
    const m = miembros[index];
    indexEditando = index;

    // Rellenar los campos
    document.getElementById('idMiembro').value = m.id;
    document.getElementById('nombreMiembro').value = m.nombre;
    document.getElementById('fechaPago').value = m.fechaPago;
    document.getElementById('tipoUsuario').value = m.tipoUsuario;
    document.getElementById('duracionMembresia').value = m.duracion;
    document.getElementById('montoPago').value = m.monto;

    // ✅ IMPORTANTE: limpiar el input file (para evitar bugs)
    document.getElementById('fotoMiembro').value = '';

    // ✅ Desactivar el campo de foto
    document.getElementById('fotoMiembro').disabled = true;

    // ✅ Desmarcar el checkbox "¿Cambiar foto?"
    document.getElementById('checkCambiarFoto').checked = false;

    // Mostrar la sección de registro
    mostrarSeccion('registro');
}

function eliminarMiembro(index) {
    if (confirm("¿Eliminar este miembro?")) {
        miembros.splice(index, 1);
        guardarDatos();
        renderTabla();
    }
}

function limpiarFormulario() {
    document.getElementById('idMiembro').value = '';
    document.getElementById('nombreMiembro').value = '';
    document.getElementById('fechaPago').value = '';
    document.getElementById('tipoUsuario').value = 'estudiante';
    document.getElementById('duracionMembresia').value = '1';
    document.getElementById('montoPago').value = '';
    document.getElementById('fotoMiembro').value = '';
    indexEditando = null;
}

function registrarEntrada() {
    const idEntrada = document.getElementById('idEntrada').value.trim();
    const miembro = miembros.find(m => m.id === idEntrada);
    document.getElementById('idEntrada').value = '';

    if (!miembro) {
        alert("⚠️ ID no encontrado");
        document.getElementById('infoEntrada').innerHTML = '';
        return;
    }

    const estado = verificarEstado(miembro.fechaPago, miembro.duracion);
/*
    if (estado === "Inactivo") {
        miembroParaActualizar = miembro;
        document.getElementById('nombreActualizar').innerText = `Miembro: ${miembro.nombre}`;
        document.getElementById('nuevoTipoUsuario').value = miembro.tipoUsuario;
        document.getElementById('nuevaDuracionPago').value = miembro.duracion;
        document.getElementById('nuevaFechaPago').value = new Date().toISOString().split('T')[0];
        document.getElementById('nuevoMontoPago').value = miembro.monto;
        document.getElementById('ventanaPago').style.display = 'flex';
        return;
    }
*/
    registrarAsistenciaSinAlerta(miembro);
    actualizarListaEntradasHoy(miembro.id);

}

function actualizarListaEntradasHoy(idActual) {
    const hoy = new Date().toISOString().split('T')[0];
    miembrosConEntradaHoy = miembros.filter(m => m.entradas.includes(hoy));
    indiceEntradaActual = miembrosConEntradaHoy.findIndex(m => m.id === idActual);
}

function registrarAsistenciaSinAlerta(miembro) {
    const hoy = new Date();
    if (hoy.getDay() === 0) return; // No registra domingos

    const fechaHoy = hoy.toISOString().split('T')[0];
    if (!miembro.entradas.includes(fechaHoy)) {
        miembro.entradas.push(fechaHoy);
        guardarDatos();
    }

    mostrarInfoEntrada(miembro, verificarEstado(miembro.fechaPago, miembro.duracion));
}

function registrarAsistencia(miembro) {
    const hoy = new Date();
    if (hoy.getDay() === 0) {
        alert("No se registran entradas los domingos");
        return;
    }

    const fechaHoy = hoy.toISOString().split('T')[0];
    if (!miembro.entradas.includes(fechaHoy)) {
        miembro.entradas.push(fechaHoy);
        guardarDatos();
        alert(`Entrada registrada para ${miembro.nombre} el ${fechaHoy}`);
    } else {
        alert("Entrada ya registrada hoy");
    }

    mostrarInfoEntrada(miembro, verificarEstado(miembro.fechaPago, miembro.duracion));
}

function mostrarInfoEntrada(miembro, estado) {
    const clase = estado === "Activo" ? "activo" : "inactivo";
    const fechaFin = calcularFechaFin(miembro.fechaPago, miembro.duracion);

    document.getElementById('infoEntrada').innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <button onclick="mostrarAnterior()">⬅ Anterior</button>
            <button onclick="mostrarSiguiente()">Siguiente ➡</button>
        </div>
        <img src="${miembro.urlFoto}" alt="Foto Miembro" />
        <h3>${miembro.nombre}</h3>
        <p>ID: ${miembro.id}</p>
        <p class="${clase}">Estado: ${estado}</p>
        <p>Próximo pago: <strong>${fechaFin}</strong></p>
    `;
}

function mostrarAnterior() {
    if (indiceEntradaActual > 0) {
        const anterior = miembrosConEntradaHoy[indiceEntradaActual - 1];
        indiceEntradaActual--;
        mostrarInfoEntrada(anterior, verificarEstado(anterior.fechaPago, anterior.duracion));
    }
}

function mostrarSiguiente() {
    if (indiceEntradaActual < miembrosConEntradaHoy.length - 1) {
        const siguiente = miembrosConEntradaHoy[indiceEntradaActual + 1];
        indiceEntradaActual++;
        mostrarInfoEntrada(siguiente, verificarEstado(siguiente.fechaPago, siguiente.duracion));
    }
}

function renderTablaAsistencia(miembro) {
    const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const hoy = new Date();
    const lunes = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 1));

    let html = `<h3>Asistencia semanal</h3><table><thead><tr>`;
    dias.forEach(d => html += `<th>${d}</th>`);
    html += `</tr></thead><tbody><tr>`;

    for (let i = 0; i < 6; i++) {
        let dia = new Date(lunes);
        dia.setDate(lunes.getDate() + i);
        let fecha = dia.toISOString().split("T")[0];
        let asistio = miembro.entradas.includes(fecha) ? "✅" : "❌";
        html += `<td>${asistio}</td>`;
    }

    html += `</tr></tbody></table>`;
    document.getElementById('tablaAsistencia').innerHTML = html;
}

function confirmarPago() {
    const nuevaFecha = document.getElementById('nuevaFechaPago').value;
    const nuevoTipo = document.getElementById('nuevoTipoUsuario').value;
    const nuevaDuracion = document.getElementById('nuevaDuracionPago').value;
    const nuevoMonto = parseFloat(document.getElementById('nuevoMontoPago').value);

    if (!nuevaFecha || isNaN(nuevoMonto)) {
        alert("Por favor completa todos los campos");
        return;
    }

    miembroParaActualizar.fechaPago = nuevaFecha;
    miembroParaActualizar.tipoUsuario = nuevoTipo;
    miembroParaActualizar.duracion = nuevaDuracion;
    miembroParaActualizar.monto = nuevoMonto;

    guardarDatos();
    cerrarVentanaPago();
    registrarAsistenciaSinAlerta(miembroParaActualizar);
}

function cerrarVentanaPago() {
    document.getElementById('ventanaPago').style.display = 'none';
    miembroParaActualizar = null;
}

function exportarAExcel() {
    const hoja = XLSX.utils.json_to_sheet(miembros);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Miembros');
    XLSX.writeFile(libro, 'respaldo_miembros.xlsx');
}

function importarDesdeExcel(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = e => {
        const data = new Uint8Array(e.target.result);
        const libro = XLSX.read(data, { type: 'array' });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const registros = XLSX.utils.sheet_to_json(hoja);

        registros.forEach(reg => {
            if (reg.id && !miembros.some(m => m.id === reg.id)) {
                miembros.push({
                    id: reg.id.toString(),
                    nombre: reg.nombre || '',
                    fechaPago: reg.fechaPago || '',
                    tipoUsuario: reg.tipoUsuario || 'normal',
                    duracion: reg.duracion || '1',
                    monto: parseFloat(reg.monto || 0),
                    urlFoto: reg.urlFoto || '',
                    entradas: reg.entradas || []
                });
            }
        });

        guardarDatos();
        alert("Datos importados");
        renderTabla();
        mostrarSeccion('tabla');
    };
    lector.readAsArrayBuffer(archivo);
}

function mostrarGraficaMembresias() {
    mostrarSeccion('graficaContainer');
    const conteo = {};

    miembros.forEach(m => {
        const key = `${m.tipoUsuario} (${duracionTexto(m.duracion)})`;
        conteo[key] = (conteo[key] || 0) + 1;
    });

    const ctx = document.getElementById('graficaMembresias').getContext('2d');
    const colores = ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0', '#FF5722', '#3F51B5'];

    if (window.grafica) {
        window.grafica.data.labels = Object.keys(conteo);
        window.grafica.data.datasets[0].data = Object.values(conteo);
        window.grafica.update();
    } else {
        window.grafica = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(conteo),
                datasets: [{
                    label: 'Miembros por Membresía',
                    data: Object.values(conteo),
                    backgroundColor: colores
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    const contenedor = document.getElementById('detallesMembresias');
    contenedor.innerHTML = Object.entries(conteo).map(([tipo, total]) => `
        <div class="categoria-box">
            <h3>${tipo}</h3>
            <p>Total: ${total}</p>
        </div>
    `).join('');
}

function mostrarIngresos() {
    mostrarSeccion('tipoContainer');

    const ingresos = {};
    miembros.forEach(m => {
        const fecha = new Date(m.fechaPago);
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
        ingresos[mes] = (ingresos[mes] || 0) + m.monto;
    });

    const ctx = document.getElementById('graficaPorTipo').getContext('2d');

    if (window.graficaTipo) {
        window.graficaTipo.data.labels = Object.keys(ingresos);
        window.graficaTipo.data.datasets[0].data = Object.values(ingresos);
        window.graficaTipo.update();
    } else {
        window.graficaTipo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ingresos),
                datasets: [{
                    label: 'Ingresos Mensuales',
                    data: Object.values(ingresos),
                    backgroundColor: '#4CAF50'
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    const resumen = document.getElementById('listasPorTipo');
    resumen.innerHTML = Object.entries(ingresos).map(([mes, total]) => `
        <div class="categoria-box">
            <h3>${mes}</h3>
            <p>Ganancia: $${total.toFixed(2)}</p>
        </div>
    `).join('');
}

window.onload = async () => {
    await cargarDatos();
    limpiarEntradasSiEsLunes();
    mostrarSeccion('registro');
};

document.getElementById("idEntrada").addEventListener("keyup", function(e) {
    if (e.key === "Enter") {
        registrarEntrada();
    }
});

function limpiarEntradasSiEsLunes() {
    const hoy = new Date();
    if (hoy.getDay() === 1) {
        miembros.forEach(m => m.entradas = []);
        guardarDatos();
        console.log("Entradas reiniciadas por lunes");
    }
}

function filtrarInactivosPorFecha() {
    const fechaSeleccionada = document.getElementById("fechaInactivos").value;
    const tbody = document.querySelector("#tablaMiembrosInactivos tbody");
    tbody.innerHTML = "";

    if (!fechaSeleccionada) return;

    const filtrados = miembros.filter(m =>
        verificarEstado(m.fechaPago, m.duracion) === "Inactivo" &&
        m.fechaPago === fechaSeleccionada
    );

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">No se encontraron miembros inactivos en esa fecha</td></tr>`;
        return;
    }

    filtrados.forEach((m, i) => {
        const fechaFin = calcularFechaFin(m.fechaPago, m.duracion);
        tbody.innerHTML += `
            <tr>
                <td>${m.id}</td>
                <td>${m.nombre}</td>
                <td>${m.fechaPago}</td>
                <td>${fechaFin}</td>
                <td>${m.tipoUsuario}</td>
                <td>${duracionTexto(m.duracion)}</td>
                <td>$${m.monto.toFixed(2)}</td>
                <td class="inactivo">Inactivo</td>
                <td><button onclick="modificarDesdeInactivos('${m.id}')">Modificar</button></td>
            </tr>`;
    });
}

function modificarDesdeInactivos(id) {
    const m = miembros.find(mi => mi.id === id);
    if (!m) return;

    miembroEnEdicion = m;

    document.getElementById("nombreModificar").innerText = `Miembro: ${m.nombre}`;
    document.getElementById("modTipoUsuario").value = m.tipoUsuario;
    document.getElementById("modDuracion").value = m.duracion;
    document.getElementById("modFechaPago").value = m.fechaPago;
    document.getElementById("modMonto").value = m.monto;

    document.getElementById("ventanaModificarPago").style.display = "flex";
}

function mostrarInactivos() {
    mostrarSeccion('tablaInactivos');
    renderInactivos();
}

function renderInactivos() {
    const tbody = document.querySelector("#tablaMiembrosInactivos tbody");
    tbody.innerHTML = "";

    const inactivos = miembros
    .filter(m => verificarEstado(m.fechaPago, m.duracion) === "Inactivo")
    .sort((a, b) => parseInt(a.id) - parseInt(b.id));


    inactivos.forEach((m, i) => {
        const fechaFin = calcularFechaFin(m.fechaPago, m.duracion);
        tbody.innerHTML += `
            <tr>
                <td>${m.id}</td>
                <td>${m.nombre}</td>
                <td>${m.fechaPago}</td>
                <td>${fechaFin}</td>
                <td>${m.tipoUsuario}</td>
                <td>${duracionTexto(m.duracion)}</td>
                <td>$${m.monto.toFixed(2)}</td>
                <td class="inactivo">Inactivo</td>
                <td><button onclick="modificarDesdeInactivos('${m.id}')">Modificar</button></td>
            </tr>`;
    });
}

function exportarAExcel() {
    if (!miembros.length) {
        alert("No hay datos para exportar");
        return;
    }
    const hoja = XLSX.utils.json_to_sheet(miembros);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Miembros');
    XLSX.writeFile(libro, 'respaldo_miembros.xlsx');
}

function buscarMiembros() {
    const texto = document.getElementById('buscador').value.trim().toLowerCase();

    if (!texto) {
        renderTabla(); // Mostrar todos si está vacío
        return;
    }

    const filtrados = miembros.filter(m =>
        m.id.toLowerCase().includes(texto) || m.nombre.toLowerCase().includes(texto)
    );

    renderTabla(filtrados);
}

function volverLista() {
    mostrarSeccion('tabla');
}

function filtrarInactivosPorRango() {
    const fechaInicio = document.getElementById("fechaInicioInactivos").value;
    const fechaFin = document.getElementById("fechaFinInactivos").value;
    const tbody = document.querySelector("#tablaMiembrosInactivos tbody");
    tbody.innerHTML = "";

    if (!fechaInicio || !fechaFin) {
        alert("Selecciona ambas fechas");
        return;
    }

    const inactivos = miembros.filter(m => {
        const estado = verificarEstado(m.fechaPago, m.duracion);
        return estado === "Inactivo" &&
            m.fechaPago >= fechaInicio &&
            m.fechaPago <= fechaFin;
    });

    if (inactivos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">No se encontraron miembros inactivos en ese rango</td></tr>`;
        return;
    }

    inactivos.forEach((m, i) => {
        const fechaFin = calcularFechaFin(m.fechaPago, m.duracion);
        tbody.innerHTML += `
            <tr>
                <td>${m.id}</td>
                <td>${m.nombre}</td>
                <td>${m.fechaPago}</td>
                <td>${fechaFin}</td>
                <td>${m.tipoUsuario}</td>
                <td>${duracionTexto(m.duracion)}</td>
                <td>$${m.monto.toFixed(2)}</td>
                <td class="inactivo">Inactivo</td>
                <td><button onclick="modificarDesdeInactivos('${m.id}')">Modificar</button></td>
            </tr>`;
    });
}

function confirmarModificacion() {
    if (!miembroEnEdicion) return;

    miembroEnEdicion.tipoUsuario = document.getElementById("modTipoUsuario").value;
    miembroEnEdicion.duracion = document.getElementById("modDuracion").value;
    miembroEnEdicion.fechaPago = document.getElementById("modFechaPago").value;
    miembroEnEdicion.monto = parseFloat(document.getElementById("modMonto").value);

    guardarDatos();  // ya la tienes en tu código
    cerrarVentanaModificar();
    renderInactivos();  // vuelve a dibujar la tabla
}

function cerrarVentanaModificar() {
    document.getElementById("ventanaModificarPago").style.display = "none";
    miembroEnEdicion = null;
}

function contarAsistenciasPorDia() {
    const conteo = {};

    miembros.forEach(miembro => {
        miembro.entradas.forEach(fecha => {
            if (!conteo[fecha]) conteo[fecha] = 0;
            conteo[fecha]++;
        });
    });

    return conteo;
}

function mostrarTablaAsistenciasPorDia() {
    const asistencias = contarAsistenciasPorDia();

    // Ordenamos por fecha
    const fechas = Object.keys(asistencias).sort();
    const totales = fechas.map(f => asistencias[f]);

    // Mostramos la tabla
    const contenedor = document.getElementById("tablaAsistenciasDia");
    contenedor.innerHTML = `
        <table>
            <thead><tr><th>Fecha</th><th>Total</th></tr></thead>
            <tbody>
                ${fechas.map(fecha => `
                    <tr><td>${fecha}</td><td>${asistencias[fecha]}</td></tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Gráfica de barras
    const ctx = document.getElementById("graficaAsistenciasPorDia").getContext("2d");

    // Si ya había una gráfica, la destruimos
    if (window.graficaAsistenciaDia) {
        window.graficaAsistenciaDia.destroy();
    }

   window.graficaAsistenciaDia = new Chart(ctx, {
    type: "bar",
    data: {
        labels: fechas,
        datasets: [{
            label: "Asistencias por Día",
            data: totales,
            backgroundColor: "#4CAF50"
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // Esto permite que respete el alto fijo
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});




    mostrarSeccion("tablaAsistenciasDiaSeccion");
}

// Escucha si se marca el checkbox de "cambiar foto"
document.getElementById('checkCambiarFoto').addEventListener('change', function () {
  // Si está marcado, habilita el input de imagen; si no, lo bloquea
  document.getElementById('fotoMiembro').disabled = !this.checked;
});

document.getElementById('checkCambiarFoto').addEventListener('change', function () {
    document.getElementById('fotoMiembro').disabled = !this.checked;
});









