// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const DATA_PATH = path.join(__dirname, 'data');
const PRESUPUESTOS_FILE = path.join(DATA_PATH, 'presupuestos.json');
const ARTICULOS_FILE = path.join(DATA_PATH, 'articulos.json');

// Crear carpeta "data" si no existe
if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH);

// Crear archivos JSON si no existen
if (!fs.existsSync(PRESUPUESTOS_FILE)) fs.writeFileSync(PRESUPUESTOS_FILE, '[]');
if (!fs.existsSync(ARTICULOS_FILE)) fs.writeFileSync(ARTICULOS_FILE, '[]');

app.use(express.static(__dirname)); // Servir archivos de la app
app.use(express.json());

// === Presupuestos ===

// Obtener presupuestos
app.get('/api/presupuestos', (req, res) => {
  const data = fs.readFileSync(PRESUPUESTOS_FILE, 'utf-8');
  res.json(JSON.parse(data));
});

// Guardar presupuesto
app.post('/api/presupuestos', (req, res) => {
  const nuevoPresupuesto = req.body;
  const data = JSON.parse(fs.readFileSync(PRESUPUESTOS_FILE, 'utf-8'));
  data.push(nuevoPresupuesto);
  fs.writeFileSync(PRESUPUESTOS_FILE, JSON.stringify(data, null, 2));
  res.json({ status: 'ok' });
});

// === Artículos ===

// Obtener artículos
app.get('/api/articulos', (req, res) => {
  const data = fs.existsSync(ARTICULOS_FILE)
    ? fs.readFileSync(ARTICULOS_FILE, 'utf8')
    : '[]';
  res.json(JSON.parse(data));
});

// Guardar artículos
app.post('/api/articulos', (req, res) => {
  const nuevosArticulos = req.body;
  fs.writeFileSync(ARTICULOS_FILE, JSON.stringify(nuevosArticulos, null, 2), err => {
    if (err) return res.status(500).send('Error al guardar artículos');
    res.send('Artículos guardados con éxito');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
app.put('/api/articulos/:codigo/presentacion', (req, res) => {
  const codigo = req.params.codigo;
  const nueva = req.body.presentacion;

  const articulos = cargarJSON('data/articulos.json');

  const index = articulos.findIndex(a => a.Codigo === codigo);
  if (index !== -1) {
    articulos[index].Presentacion = nueva;
    guardarJSON('data/articulos.json', articulos);
    res.sendStatus(200);
  } else {
    res.status(404).send("Artículo no encontrado");
  }
});
app.post('/api/articulos', (req, res) => {
  const articulosActualizados = req.body;
  fs.writeFileSync('db/articulos.json', JSON.stringify(articulosActualizados, null, 2));
  res.sendStatus(200);
});
