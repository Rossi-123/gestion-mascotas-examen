const { test, after, before } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Mascota = require("../models/Mascota");

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server && server.close());

test("el esquema valida edad, campos obligatorios y recorta espacios", async () => {
  const datos = { nombre: "  Luna  ", especie: "Perro", raza: "Mestizo", edadMeses: 18, tamano: "Mediano", descripcion: "Activa", ubicacion: "Bogotá" };
  const mascota = new Mascota(datos);
  await mascota.validate();
  assert.equal(mascota.nombre, "Luna");
  await assert.rejects(new Mascota({ ...datos, edadMeses: -1 }).validate());
  await assert.rejects(new Mascota({ ...datos, edadMeses: 1.5 }).validate());
  await assert.rejects(new Mascota({ ...datos, nombre: "  " }).validate());
  await assert.rejects(new Mascota({ ...datos, estado: "Desconocido" }).validate());
});

test("estado de API y respuesta JSON consistente", async () => {
  const response = await fetch(`${base}/api`);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()), ["success", "message", "data"]);
});

test("rechaza ID y escritura directa de imagenUrl", async () => {
  const invalid = await fetch(`${base}/api/mascotas/no-es-id`);
  assert.equal(invalid.status, 400);
  const direct = await fetch(`${base}/api/mascotas`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagenUrl: "/uploads/falsa.jpg" })
  });
  assert.equal(direct.status, 400);
});

test("devuelve 400 para datos inválidos y 404 para un registro ausente", async () => {
  const invalid = await fetch(`${base}/api/mascotas`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "  ", especie: "Perro", raza: "Mestizo", edadMeses: -2, tamano: "Mediano", descripcion: "Activa", ubicacion: "Bogotá" })
  });
  assert.equal(invalid.status, 400);
  const original = Mascota.findById;
  Mascota.findById = async () => null;
  try {
    const absent = await fetch(`${base}/api/mascotas/507f1f77bcf86cd799439011`);
    assert.equal(absent.status, 404);
  } finally { Mascota.findById = original; }
});

test("rechaza tipos, firmas y tamaños de imagen inválidos", async () => {
  const id = "507f1f77bcf86cd799439011";
  const wrongType = await fetch(`${base}/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "archivo" });
  assert.equal(wrongType.status, 415);
  const wrongSignature = await fetch(`${base}/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: "no es una imagen" });
  assert.equal(wrongSignature.status, 400);
  const oversized = await fetch(`${base}/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: Buffer.alloc(5 * 1024 * 1024 + 1) });
  assert.equal(oversized.status, 413);
});
