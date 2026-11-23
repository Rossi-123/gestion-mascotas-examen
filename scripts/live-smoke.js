// Prueba real de API y MongoDB. Ejecutar con el servidor iniciado y MONGO_URI configurada.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");

const base = process.env.LIVE_BASE_URL || "http://127.0.0.1:3000";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6K0sAAAAASUVORK5CYII=", "base64");
const datos = {
  nombre: `Prueba temporal ${randomBytes(4).toString("hex")}`,
  especie: "Perro", raza: "Mestizo", edadMeses: 18, tamano: "Mediano",
  descripcion: "Registro temporal para verificar la API.", ubicacion: "Bogotá", estado: "Disponible"
};
let id;

async function request(ruta, options = {}, expected) {
  const response = await fetch(`${base}${ruta}`, options);
  if (expected !== undefined) assert.equal(response.status, expected, `${options.method || "GET"} ${ruta}: HTTP ${response.status}`);
  return response;
}

async function json(ruta, options, expected) {
  const response = await request(ruta, options, expected);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["success", "message", "data"]);
  return body;
}

async function main() {
  try {
    await json("/api", {}, 200);
    await json("/api/mascotas/no-es-id", {}, 400);
    await json(`/api/mascotas/${randomBytes(12).toString("hex")}`, {}, 404);
    const headers = { "Content-Type": "application/json" };
    await json("/api/mascotas", { method: "POST", headers, body: JSON.stringify({ ...datos, edadMeses: -1 }) }, 400);
    await json("/api/mascotas", { method: "POST", headers, body: JSON.stringify({ ...datos, imagenUrl: "/uploads/no.jpg" }) }, 400);

    const created = await json("/api/mascotas", { method: "POST", headers, body: JSON.stringify(datos) }, 201);
    id = created.data._id;
    assert.ok(id);
    const listed = await json("/api/mascotas", {}, 200);
    assert.ok(listed.data.some((item) => item._id === id));
    assert.equal((await json(`/api/mascotas/${id}`, {}, 200)).data.nombre, datos.nombre);
    assert.equal((await json(`/api/mascotas/${id}`, { method: "PUT", headers, body: JSON.stringify({ estado: "En proceso" }) }, 200)).data.estado, "En proceso");

    await json(`/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "foto" }, 415);
    await json(`/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: "archivo falso" }, 400);
    await json(`/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: Buffer.alloc(5 * 1024 * 1024 + 1) }, 413);

    const first = (await json(`/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: png }, 200)).data.imagenUrl;
    assert.match(first, /^\/uploads\/[a-f\d-]{36}\.png$/);
    const image = await request(first, {}, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);

    const second = (await json(`/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: png }, 200)).data.imagenUrl;
    assert.notEqual(second, first);
    await request(first, {}, 404);
    assert.equal((await json(`/api/mascotas/${id}/imagen`, { method: "DELETE" }, 200)).data.imagenUrl, "");
    await request(second, {}, 404);

    const third = (await json(`/api/mascotas/${id}/imagen`, { method: "POST", headers: { "Content-Type": "image/png" }, body: png }, 200)).data.imagenUrl;
    await json(`/api/mascotas/${id}`, { method: "DELETE" }, 200);
    id = null;
    await request(third, {}, 404);

    await connectDatabase();
    assert.equal(mongoose.connection.db.databaseName, "gestion_mascotas");
    const collections = await mongoose.connection.db.listCollections({ name: "mascotas" }).toArray();
    assert.equal(collections.length, 1);
    console.log("CRUD, imágenes, errores HTTP y colección gestion_mascotas.mascotas: correctos. Registro temporal retirado.");
  } finally {
    if (id) await fetch(`${base}/api/mascotas/${id}`, { method: "DELETE" }).catch(() => {});
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.name === "AssertionError" ? error.message : "La prueba real no pudo completarse. Revisa API y MongoDB.");
  process.exitCode = 1;
});
