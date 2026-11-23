const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const Mascota = require("../models/Mascota");

const camposEditables = ["nombre", "especie", "raza", "edadMeses", "tamano", "descripcion", "ubicacion", "estado"];
const carpetaImagenes = path.join(__dirname, "..", "public", "uploads");
const tipos = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const respuesta = (res, status, success, message, data = null) => res.status(status).json({ success, message, data });
const errorInterno = (res) => respuesta(res, 500, false, "Error interno del servidor");
const idValido = (id) => mongoose.isValidObjectId(id) && /^[a-f\d]{24}$/i.test(id);
const comprobarId = (req, res) => idValido(req.params.id) || (respuesta(res, 400, false, "ID de mascota inválido"), false);
const validacion = (error) => Object.values(error.errors || {}).map((item) => item.message).join(" | ") || "Datos inválidos";

function leerCampos(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Buffer.isBuffer(body)) {
    throw new Error("Envía un objeto JSON con los datos de la mascota");
  }
  const extra = Object.keys(body).find((campo) => !camposEditables.includes(campo));
  if (extra) throw new Error(`El campo ${extra} no se puede modificar`);
  if (!Object.keys(body).length) throw new Error("Envía al menos un campo editable");
  const datos = {};
  for (const campo of camposEditables) {
    if (Object.hasOwn(body, campo)) datos[campo] = body[campo];
  }
  return datos;
}

function rutaImagenLocal(imagenUrl) {
  const nombre = imagenUrl?.startsWith("/uploads/") ? imagenUrl.slice(9) : "";
  return /^[a-f\d-]{36}\.(jpg|png|webp)$/.test(nombre) ? path.join(carpetaImagenes, nombre) : null;
}

async function borrarImagenLocal(imagenUrl) {
  const ruta = rutaImagenLocal(imagenUrl);
  if (!ruta) return;
  try { await fs.unlink(ruta); }
  catch (error) { if (error.code !== "ENOENT") console.error("No se pudo retirar una imagen local"); }
}

function firmaValida(buffer, tipo) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (tipo === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (tipo === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (tipo === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

async function listar(_req, res) {
  try { return respuesta(res, 200, true, "Mascotas obtenidas", await Mascota.find().sort({ createdAt: -1 })); }
  catch (_error) { return errorInterno(res); }
}

async function obtener(req, res) {
  if (!comprobarId(req, res)) return;
  try {
    const mascota = await Mascota.findById(req.params.id);
    return mascota ? respuesta(res, 200, true, "Mascota obtenida", mascota) : respuesta(res, 404, false, "Mascota no encontrada");
  } catch (_error) { return errorInterno(res); }
}

async function crear(req, res) {
  let datos;
  try { datos = leerCampos(req.body); }
  catch (error) { return respuesta(res, 400, false, error.message); }
  try { return respuesta(res, 201, true, "Mascota creada", await Mascota.create(datos)); }
  catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return respuesta(res, 400, false, validacion(error));
    return errorInterno(res);
  }
}

async function actualizar(req, res) {
  if (!comprobarId(req, res)) return;
  let datos;
  try { datos = leerCampos(req.body); }
  catch (error) { return respuesta(res, 400, false, error.message); }
  try {
    const mascota = await Mascota.findById(req.params.id);
    if (!mascota) return respuesta(res, 404, false, "Mascota no encontrada");
    Object.assign(mascota, datos);
    await mascota.save();
    return respuesta(res, 200, true, "Mascota actualizada", mascota);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return respuesta(res, 400, false, validacion(error));
    return errorInterno(res);
  }
}

async function eliminar(req, res) {
  if (!comprobarId(req, res)) return;
  try {
    const mascota = await Mascota.findByIdAndDelete(req.params.id);
    if (!mascota) return respuesta(res, 404, false, "Mascota no encontrada");
    await borrarImagenLocal(mascota.imagenUrl);
    return respuesta(res, 200, true, "Mascota eliminada", mascota);
  } catch (_error) { return errorInterno(res); }
}

async function subirImagen(req, res) {
  if (!comprobarId(req, res)) return;
  const tipo = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  if (!tipos[tipo]) return respuesta(res, 415, false, "Usa una imagen JPG, PNG o WEBP");
  if (!firmaValida(req.body, tipo)) return respuesta(res, 400, false, "La firma de la imagen no corresponde al tipo declarado");
  let rutaNueva;
  try {
    const mascota = await Mascota.findById(req.params.id);
    if (!mascota) return respuesta(res, 404, false, "Mascota no encontrada");
    await fs.mkdir(carpetaImagenes, { recursive: true });
    const nombre = `${randomUUID()}.${tipos[tipo]}`;
    rutaNueva = path.join(carpetaImagenes, nombre);
    await fs.writeFile(rutaNueva, req.body, { flag: "wx" });
    const imagenAnterior = mascota.imagenUrl;
    mascota.imagenUrl = `/uploads/${nombre}`;
    await mascota.save();
    await borrarImagenLocal(imagenAnterior);
    return respuesta(res, 200, true, "Imagen guardada", mascota);
  } catch (_error) {
    if (rutaNueva) await fs.unlink(rutaNueva).catch(() => {});
    return errorInterno(res);
  }
}

async function quitarImagen(req, res) {
  if (!comprobarId(req, res)) return;
  try {
    const mascota = await Mascota.findById(req.params.id);
    if (!mascota) return respuesta(res, 404, false, "Mascota no encontrada");
    const anterior = mascota.imagenUrl;
    mascota.imagenUrl = "";
    await mascota.save();
    await borrarImagenLocal(anterior);
    return respuesta(res, 200, true, "Imagen retirada", mascota);
  } catch (_error) { return errorInterno(res); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, subirImagen, quitarImagen };
