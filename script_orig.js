
let productos = JSON.parse(localStorage.getItem("productos")) || [];
let lista = [];
let productosSeleccionados = [];
let ultimoPresupuesto = null;
let esAdmin = false;

function mostrarTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';

  if (tabId === "verArticulos") mostrarProductos(); // 👉 solo carga los productos al abrir "verArticulos"
}


function agregarProducto() {
  const nombre = document.getElementById("producto").value.trim();
  const cantidadTexto = document.getElementById("cantidad").value.trim().toLowerCase();
  const descuentoTexto = document.getElementById("descuento").value.trim();
  
let agregando = false;

document.getElementById("descuento").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !agregando) {
    e.preventDefault();
    agregando = true;

    setTimeout(() => {
      agregarProducto();
      agregando = false;
      document.getElementById("producto").focus();
      document.getElementById("producto").select();
    }, 50);
  }
});

  if (!nombre || !cantidadTexto) return;

  const descuento = parseFloat(descuentoTexto) || 0;

  const encontrado = productos.find(p =>
    p.Nombre.toLowerCase().includes(nombre.toLowerCase()) ||
    p.Código?.toLowerCase().includes(nombre.toLowerCase())
  );

  if (!encontrado) {
    alert("Producto inválido o no encontrado.");
    return;
  }

  // 🧠 Lógica de interpretación de cantidad
  let cantidad;
  if (cantidadTexto.startsWith("u")) {
    cantidad = parseFloat(cantidadTexto.slice(1)); // u2 -> 2 unidades
  } else if (cantidadTexto.startsWith("c")) {
    cantidad = parseFloat(cantidadTexto.slice(1)); // c2 -> 2 cajas
    if (!isNaN(cantidad)) {
      const porCaja = parseFloat(encontrado.Presentacion) || 1;
      cantidad *= porCaja;
    }
  } else {
    cantidad = parseFloat(cantidadTexto); // sin prefijo = caja
    if (!isNaN(cantidad)) {
      const porCaja = parseFloat(encontrado.Presentacion) || 1;
      cantidad *= porCaja;
    }
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    alert("Cantidad inválida.");
    return;
  }

  const precioFinal = encontrado.Precio * cantidad * (1 - descuento / 100);
  lista.push({
    nombre: encontrado.Nombre,
    cantidad,
    precio: encontrado.Precio,
    descuento,
    total: precioFinal.toFixed(2)
  });

  productosSeleccionados.push(encontrado);
  actualizarTabla();

  // Limpiar campos
  document.getElementById("producto").value = "";
  document.getElementById("cantidad").value = "";
  document.getElementById("descuento").value = "";
  document.getElementById("producto").focus();


}


function actualizarTabla() {
  const tbody = document.querySelector("#tabla tbody");
  tbody.innerHTML = "";

  lista.forEach((item, index) => {
    const producto = productos.find(p => p.Nombre === item.nombre);
    const presentacion = parseFloat(producto?.Presentacion) || 1;
    const cantidadCajas = (item.cantidad / presentacion).toFixed(2);

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${item.nombre}</td>
      <td style="text-align:center;">${item.cantidad}</td>
      <td style="text-align:center;">${cantidadCajas}</td>
      <td style="text-align:center;">${item.descuento || 0}%</td>
      <td style="text-align:right;">$${item.total}</td>
      <td style="text-align:center;">
        <button onclick="editarProducto(${index})">✏️</button>
        <button onclick="eliminarProducto(${index})">🗑️</button>
      </td>
    `;
    tbody.appendChild(fila);
  });

  actualizarTotal();
}


function actualizarTotal() {
  let total = 0;
  lista.forEach(item => total += parseFloat(item.total) || 0);
  document.getElementById("total-presupuesto").innerHTML =
    `<span class="resaltado-total">TOTAL: $${total.toFixed(2)}</span>`;
}

function editar(index) {
  const item = lista[index];
  document.getElementById("producto").value = item.nombre;
  document.getElementById("cantidad").value = item.cantidad;
  document.getElementById("descuento").value = item.descuento;
  lista.splice(index, 1);
  actualizarTabla();
}

function borrar(index) {
  lista.splice(index, 1);
  actualizarTabla();
}

function guardarPresupuesto() {
  const cliente = document.getElementById("cliente").value.trim();
  const preventista = document.getElementById("preventista").value.trim();

  if (!cliente || lista.length === 0) {
    alert("Completá el nombre del cliente y agregá al menos un producto.");
    return;
  }

  const total = lista.reduce((acc, p) => acc + parseFloat(p.total), 0);
  const fechaHora = new Date().toLocaleString();

  const presupuesto = {
    cliente,
    preventista,
    productos: lista,
    total,
    fechaHora
  };

  fetch('/api/presupuestos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(presupuesto)
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      mostrarMensajeGuardado();
      nuevoPresupuesto();
    }
  });
  document.getElementById("cliente").focus();
}

function cerrarResumen() {
  document.getElementById("resumenOverlay").style.display = "none";
}

function cargarCSV() {
  const archivo = document.getElementById("archivoCSV").files[0];
  if (!archivo) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split('\n');
    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const partes = lines[i].split(";");
      if (partes.length >= 3) {
        const codigo = partes[0].trim();
        const nombre = partes[1].trim();
        const precio = parseFloat(partes[2].replace(",", ".").trim());
       if (!isNaN(precio)) {
  const anterior = productos.find(p => p.Código === codigo);
  nuevos.push({
    Código: codigo,
    Nombre: nombre,
    Precio: precio,
    Presentacion: anterior?.Presentacion || ""
  });
}
      }
    }
    if (nuevos.length) {
      localStorage.setItem("productos", JSON.stringify(nuevos));
      productos = nuevos;
      mostrarProductos();
      alert("Productos actualizados correctamente.");
    }
	 fetch('/api/articulos')
    .then(res => res.json())
    .then(data => {
      productos = data;
      mostrarProductos();
    })
    .catch(err => console.error("Error al cargar artículos:", err));
  };
  reader.readAsText(archivo);
  document.getElementById("contadorArticulos").textContent = `${productos.length} artículos cargados.`;

}

function mostrarProductos() {
  // MOSTRAR SPINNER antes de empezar
  document.getElementById("spinner-articulos").innerHTML = '<span class="spinner"></span>';
  document.getElementById("spinner-articulos").style.display = "inline-block";

  const tbody = document.querySelector("#tablaProductos tbody");
  tbody.innerHTML = "";

  // Hacemos una pequeña pausa para que el spinner siempre se vea (opcional)
  setTimeout(() => {
    productos.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.Código}</td>
          <td>${p.Nombre}</td>
          <td>$${parseFloat(p.Precio).toFixed(2)}</td>
          <td>
            <input type="text" value="${p.Presentacion || ''}" 
                   onchange="actualizarPresentacionLocal('${p.Código}', this.value)" 
                   placeholder="Ej: 24" style="width: 60px;" />
          </td>
        </tr>`;
    });

    // OCULTAR SPINNER cuando termina la carga
    document.getElementById("spinner-articulos").style.display = "none";
    document.getElementById("spinner-articulos").innerHTML = '';
  }, 300); // Le das unos ms para que el spinner se vea aunque la tabla cargue rápido
}

function loginVerificar() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  if (user === "charlie" && pass === "charlie") {
    esAdmin = true;
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("btn-login").style.display = "none";
    document.getElementById("admin-badge").style.display = "inline";
    document.getElementById("btn-logout").style.display = "inline-block";
    document.getElementById("login-error").textContent = "";
    mostrarPestañaArticulos(true);
  } else {
    document.getElementById("login-error").textContent = "Usuario o contraseña incorrectos";
  }
}


function mostrarPestañaArticulos(mostrar) {
  const tabArticulos = document.querySelector('button[data-tab="articulos"]');
  const tabPresupuestos = document.querySelector('button[data-tab="presupuestos"]');
  const tabArticulosView = document.querySelector('button[data-tab="articulosview"]');
  if (tabArticulos) tabArticulos.style.display = mostrar ? "inline-block" : "none";
  if (tabArticulosView) tabArticulosView.style.display = mostrar ? "inline-block" : "none";
  // Si sale el admin y estaba en esa pestaña, te manda a presupuestos
  if (!mostrar && (document.getElementById("tab-articulos").style.display === "block" || (tabArticulosView && document.getElementById("tab-articulosview").style.display === "block"))) {
    mostrarTab("presupuestos");
  }
}
mostrarPestañaArticulos(false); // Oculta al iniciar

  if (cantidadInput && descuentoInput) {
    cantidadInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        descuentoInput.focus();
      }
    });

    descuentoInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        setTimeout(() => {
          agregarProducto();
          document.getElementById("producto").focus();
          document.getElementById("producto").select();
        }, 50);
      }
    });
  } else {
    console.warn("⚠️ No se encontraron los campos de cantidad o descuento al cargar.");
  }

function filtrarProductos(e) {
  const input = e.target.value.toLowerCase();
  const sugerencias = document.getElementById("sugerencias");
  sugerencias.innerHTML = "";
  indiceSeleccionado = -1;

  if (input.length === 0) return;

  const exacto = productos.filter(p => p.Código.toLowerCase() === input);
  const empiezaCon = productos.filter(p =>
    p.Código.toLowerCase().startsWith(input) && p.Código.toLowerCase() !== input
  );
  const contiene = productos.filter(p =>
    p.Código.toLowerCase().includes(input) &&
    !exacto.includes(p) &&
    !empiezaCon.includes(p)
  );
  const porNombre = productos.filter(p =>
    p.Nombre.toLowerCase().includes(input) &&
    !exacto.includes(p) &&
    !empiezaCon.includes(p) &&
    !contiene.includes(p)
  );

  const filtrados = [...exacto, ...empiezaCon, ...contiene, ...porNombre];

  filtrados.forEach((prod) => {
    const li = document.createElement("li");
    li.textContent = `${prod.Código} - ${prod.Nombre}`;
    li.onclick = () => seleccionarProducto(prod);
    sugerencias.appendChild(li);
  });
}

function navegarLista(e) {
  const lista = document.querySelectorAll("#sugerencias li");
  if (!lista.length) return;

  if (e.key === "ArrowDown") {
    indiceSeleccionado = (indiceSeleccionado + 1) % lista.length;
  } else if (e.key === "ArrowUp") {
    indiceSeleccionado = (indiceSeleccionado - 1 + lista.length) % lista.length;
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (indiceSeleccionado === -1) {
      lista[0].click(); // 👈 Nuevo comportamiento
    } else {
      lista[indiceSeleccionado].click();
    }
    return;
  }

  lista.forEach((li, i) => {
    li.classList.toggle("active", i === indiceSeleccionado);
  });
}

function seleccionarProducto(prod) {
  document.getElementById("producto").value = prod.Nombre;
  document.getElementById("producto").setAttribute("data-codigo", prod.Código);
  document.getElementById("sugerencias").innerHTML = "";
  document.getElementById("cantidad").focus();

  // Fix mobile: cerrar y reabrir focus para evitar problemas con teclado virtual
  if ('ontouchstart' in window) {
    setTimeout(() => {
      document.getElementById("cantidad").blur();
      document.getElementById("cantidad").focus();
    }, 100);
  }
}

function mostrarUltimoResumen() {
  fetch('/api/presupuestos')
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        alert("Todavía no hay presupuestos guardados.");
        return;
      }

      const p = data[data.length - 1]; // último presupuesto guardado
	 

      let resumenHTML = `
        <div class="ticket">
          <img src="logo2.png" alt="Logo" style="width: 100px; display:block; margin: 0 auto" />
          <h3 style="text-align:center;">Resumen de Presupuesto</h3>
          <p><strong>Cliente:</strong> ${p.cliente}</p>
          <p><strong>Preventista:</strong> ${p.preventista}</p>
          <p><strong>Fecha:</strong> ${p.fechaHora}</p>
          <hr>
          <table style="width:100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr>
                <th style="text-align:left;">Producto</th>
                <th style="text-align:center;">Unid</th>
				<th style="text-align:center;">Cajas</th>
                <th style="text-align:center;">Desc</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>`;

      p.productos.forEach(prod => {
  const productoInfo = productos.find(p => p.Nombre === prod.nombre);
  const presentacion = parseFloat(productoInfo?.Presentacion) || 1;
  const cajas = (prod.cantidad / presentacion).toFixed(2);

  resumenHTML += `
    <tr>
      <td>${prod.nombre}</td>
      <td style="text-align:center;">${prod.cantidad}</td>
      <td style="text-align:center;">${cajas}</td>
      <td style="text-align:center;">${prod.descuento || 0}%</td>
      <td style="text-align:right;">$${parseFloat(prod.total).toFixed(2)}</td>
    </tr>`;
      });

      resumenHTML += `
      </tbody>
    </table>
    <hr>
    <div style="text-align:right;">
      <span class="resaltado-total">TOTAL: $${parseFloat(p.total).toFixed(2)}</span>
    </div>
  </div>`;


      // Mostrar en modal
      document.getElementById("resumenContent").innerHTML = resumenHTML;
      document.getElementById("resumenOverlay").style.display = "flex";
    });
}

function cerrarResumen() {
  document.getElementById("resumenOverlay").style.display = "none";
}

function descargarPDF() {
  const resumen = document.getElementById("resumenContent");
  const ventana = window.open('', '_blank');
  ventana.document.write(`
    <html>
      <head>
        <title>Presupuesto</title>
        <style>
          body { font-family: monospace; padding: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px dotted #aaa; padding: 4px; text-align: left; font-size: 12px; }
          th { background-color: #eee; }
          h3 { text-align: center; }
        </style>
      </head>
      <body>${resumen.innerHTML}</body>
    </html>
  `);
  ventana.document.close();
  ventana.focus();
  ventana.print(); // Esto abre la opción de guardar como PDF
}

function nuevoPresupuesto() {
  // Limpiamos campos de cliente y preventista
  document.getElementById("cliente").value = "";
  document.getElementById("preventista").value = "";

  // Limpiamos el listado visual de productos
  lista = [];
  actualizarTabla();

  // Limpiamos los inputs de producto, cantidad y descuento
  document.getElementById("producto").value = "";
  document.getElementById("cantidad").value = "";
  document.getElementById("descuento").value = "";

  // Vaciamos el contenedor de sugerencias
  document.getElementById("sugerencias").innerHTML = "";

  // Limpiamos el array de productos seleccionados si lo estás usando
  productosSeleccionados = [];

  // Enfocamos nuevamente en el input del producto
  document.getElementById("cliente").focus();
}

function verPresupuestos() {
  fetch('/api/presupuestos')
    .then(res => res.json())
    .then(data => {
      let html = `
        <html>
        <head>
          <title>Presupuestos guardados</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
            ul { list-style: none; padding: 0; }
            li { padding: 10px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
            .btn-ver { cursor: pointer; background: none; border: none; font-size: 18px; }
          </style>
        </head>
        <body>
          <h2>Presupuestos guardados</h2>
          <ul>`;

      data.forEach((p, i) => {
        html += `
          <li>
            <span><strong>${p.cliente}</strong> - ${p.fechaHora} - $${p.total}</span>
            <button class="btn-ver" onclick="window.opener.mostrarResumenDesdeLista(${i})">👁️</button>
          </li>`;
      });

      html += `
          </ul>
          <script>
            const presupuestos = ${JSON.stringify(data)};
            function mostrarResumenDesdeLista(i) {
              const p = presupuestos[i];
              let html = "<h3>Resumen de Presupuesto</h3>";
              html += "<p><strong>Cliente:</strong> " + p.cliente + "</p>";
              html += "<p><strong>Preventista:</strong> " + p.preventista + "</p>";
              html += "<p><strong>Fecha:</strong> " + p.fechaHora + "</p>";
              html += "<hr><ul>";
              p.productos.forEach(prod => {
                html += "<li>" + prod.nombre + " - " + prod.cantidad + "u - Desc: " + (prod.descuento || 0) + "% - $" + prod.total + "</li>";
              });
              html += "</ul><hr><strong>Total: $" + p.total + "</strong>";
              const nueva = window.open("", "_blank");
              nueva.document.write(html);
              nueva.document.close();
            }
          </script>
        </body>
        </html>`;

      const nuevaVentana = window.open("", "_blank");
      nuevaVentana.document.write(html);
      nuevaVentana.document.close();
    });
}

function mostrarResumenDesdeLista(indice) {
  fetch('/api/presupuestos')
    .then(res => res.json())
    .then(data => {
      const presupuesto = data[indice];
      if (presupuesto) {
        mostrarUltimoResumen(presupuesto);
      }
    });
}

function mostrarMensajeGuardado() {
  const mensaje = document.getElementById("mensajeGuardado");
  mensaje.innerText = "✅ Presupuesto guardado correctamente";
  mensaje.style.display = "block";
  mensaje.style.opacity = "1";

  mensaje.classList.remove("mensaje-ok");
  void mensaje.offsetWidth;
  mensaje.classList.add("mensaje-ok");

  setTimeout(() => {
    mensaje.style.display = "none";
  }, 3000);
}

function actualizarPresentacionLocal(codigo, nuevaPresentacion) {
  const producto = productos.find(p => p.Código === codigo);
  if (producto) {
    producto.Presentacion = nuevaPresentacion;
    localStorage.setItem("productos", JSON.stringify(productos));
  }
}

function guardarPresentacionesEnServidor() {
  fetch('/api/articulos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productos)
  })
    .then(res => res.ok ? alert("Presentaciones actualizadas correctamente.") : alert("Error al guardar presentaciones."))
    .catch(err => {
      console.error("Error al guardar presentaciones:", err);
      alert("Error al guardar presentaciones.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  mostrarTab("presupuestos");

  // Focus por enter entre campos (cliente → preventista → producto)
  document.getElementById("cliente").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("preventista").focus();
    }
  });
  document.getElementById("preventista").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("producto").focus();
    }
  });

  // Navegación de producto/cantidad/descuento por enter
  const cantidadInput = document.getElementById("cantidad");
  const descuentoInput = document.getElementById("descuento");

  if (cantidadInput && descuentoInput) {
    cantidadInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        descuentoInput.focus();
      }
    });

    descuentoInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        setTimeout(() => {
          agregarProducto();
          document.getElementById("producto").focus();
          document.getElementById("producto").select();
        }, 50);
      }
    });
  }

  // Eventos para autocompletar productos
  document.getElementById("producto").addEventListener("input", filtrarProductos);
  document.getElementById("producto").addEventListener("keydown", navegarLista);

  // Login modal lógica
  document.getElementById("btn-login").addEventListener("click", () => {
    document.getElementById("login-modal").style.display = "flex";
    document.getElementById("login-user").focus();
  });
  document.getElementById("login-cerrar").addEventListener("click", () => {
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("login-error").textContent = "";
  });
  document.getElementById("login-confirmar").addEventListener("click", loginVerificar);
  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginVerificar();
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    esAdmin = false;
    document.getElementById("btn-login").style.display = "inline-block";
    document.getElementById("admin-badge").style.display = "none";
    document.getElementById("btn-logout").style.display = "none";
    mostrarPestañaArticulos(false);
  });

  mostrarPestañaArticulos(false); // Oculta la pestaña artículos al iniciar
});
