const API_URL = "/api/mascotas";
const form = document.getElementById("pet-form");
const list = document.getElementById("pet-list");
const count = document.getElementById("list-count");
const empty = document.getElementById("list-empty");
const search = document.getElementById("admin-search");
const message = document.getElementById("admin-message");
const imageInput = document.getElementById("pet-image");
const imagePreview = document.getElementById("image-preview");
const removeImageButton = document.getElementById("remove-image");
const cancelButton = document.getElementById("cancel-edit");
const submitButton = document.getElementById("submit-pet");
let mascotas = [];
let editingId = null;
let imageToRemove = false;
let objectUrl = null;

function elemento(tag, clase = "", texto) {
  const node = document.createElement(tag);
  if (clase) node.className = clase;
  if (texto !== undefined) node.textContent = texto;
  return node;
}

function avisar(texto, tipo = "success") {
  message.textContent = texto;
  message.className = `feedback ${tipo}`;
  message.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function pedirJSON(url, options = {}) {
  const response = await fetch(url, options);
  let result;
  try { result = await response.json(); }
  catch (_error) { throw new Error("La API no devolvió una respuesta JSON válida"); }
  if (!response.ok) throw new Error(result.message || "La operación no se pudo completar");
  return result.data;
}

function campo(nombre) { return form.elements.namedItem(nombre); }

function mostrarImagen(url) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  imagePreview.replaceChildren();
  if (!url) { imagePreview.textContent = "✿"; return; }
  const img = elemento("img");
  img.src = url;
  img.alt = "";
  img.addEventListener("error", () => { imagePreview.textContent = "✿"; }, { once: true });
  imagePreview.append(img);
}

function resetearFormulario() {
  form.reset();
  editingId = null;
  imageToRemove = false;
  imageInput.value = "";
  mostrarImagen("");
  removeImageButton.hidden = true;
  cancelButton.hidden = true;
  document.getElementById("form-title").textContent = "Nueva mascota";
  document.getElementById("form-subtitle").textContent = "Completa los datos para crear un perfil.";
  submitButton.textContent = "Guardar mascota";
}

function renderizar() {
  const termino = search.value.trim().toLocaleLowerCase("es");
  const visibles = mascotas.filter((mascota) => `${mascota.nombre} ${mascota.raza} ${mascota.ubicacion}`.toLocaleLowerCase("es").includes(termino));
  count.textContent = `${mascotas.length} mascota${mascotas.length === 1 ? "" : "s"} registrada${mascotas.length === 1 ? "" : "s"}`;
  list.replaceChildren();
  empty.hidden = visibles.length > 0;
  empty.textContent = mascotas.length ? "No hay coincidencias para esta búsqueda." : "Todavía no hay mascotas registradas.";
  for (const mascota of visibles) {
    const row = elemento("article", "pet-row");
    const thumb = elemento("div", "row-thumb", "✿");
    if (mascota.imagenUrl) {
      const img = elemento("img");
      img.src = mascota.imagenUrl;
      img.alt = "";
      img.addEventListener("error", () => { thumb.textContent = "✿"; }, { once: true });
      thumb.replaceChildren(img);
    }
    const info = elemento("div", "row-info");
    info.append(elemento("strong", "", mascota.nombre), elemento("span", "", `${mascota.especie} · ${mascota.ubicacion}`));
    const badge = elemento("span", `status-badge ${mascota.estado === "Disponible" ? "available" : mascota.estado === "En proceso" ? "pending" : "adopted"}`, mascota.estado);
    const actions = elemento("div", "row-actions");
    const edit = elemento("button", "small-button", "Editar");
    edit.type = "button";
    edit.setAttribute("aria-label", `Editar ${mascota.nombre}`);
    edit.addEventListener("click", () => editar(mascota._id));
    const remove = elemento("button", "small-button delete-button", "Eliminar");
    remove.type = "button";
    remove.setAttribute("aria-label", `Eliminar ${mascota.nombre}`);
    remove.addEventListener("click", () => eliminar(mascota._id, mascota.nombre));
    actions.append(edit, remove);
    row.append(thumb, info, badge, actions);
    list.append(row);
  }
}

async function cargar() {
  try {
    mascotas = await pedirJSON(API_URL);
    renderizar();
  } catch (error) {
    mascotas = [];
    list.replaceChildren();
    empty.hidden = true;
    count.textContent = "No se pudo cargar la lista";
    avisar(error.message, "error");
  }
}

async function editar(id) {
  try {
    const mascota = await pedirJSON(`${API_URL}/${encodeURIComponent(id)}`);
    resetearFormulario();
    editingId = id;
    for (const nombre of ["nombre", "especie", "raza", "edadMeses", "tamano", "ubicacion", "estado", "descripcion"]) campo(nombre).value = mascota[nombre];
    mostrarImagen(mascota.imagenUrl);
    removeImageButton.hidden = !mascota.imagenUrl;
    cancelButton.hidden = false;
    document.getElementById("form-title").textContent = `Editar a ${mascota.nombre}`;
    document.getElementById("form-subtitle").textContent = "Actualiza la ficha y, si quieres, reemplaza la foto.";
    submitButton.textContent = "Guardar cambios";
    document.getElementById("form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    campo("nombre").focus({ preventScroll: true });
  } catch (error) { avisar(error.message, "error"); }
}

async function eliminar(id, nombre) {
  if (!window.confirm(`¿Eliminar la ficha de ${nombre}? Esta acción también retirará su foto local.`)) return;
  try {
    await pedirJSON(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (editingId === id) resetearFormulario();
    await cargar();
    avisar(`Se eliminó la ficha de ${nombre}.`);
  } catch (error) { avisar(error.message, "error"); }
}

imageInput.addEventListener("change", () => {
  const archivo = imageInput.files[0];
  if (!archivo) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
    imageInput.value = "";
    avisar("Elige una foto JPG, PNG o WEBP de hasta 5 MB.", "error");
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(archivo);
  imagePreview.replaceChildren();
  const img = elemento("img");
  img.src = objectUrl;
  img.alt = "";
  imagePreview.append(img);
  imageToRemove = false;
  removeImageButton.hidden = false;
});

removeImageButton.addEventListener("click", () => {
  imageInput.value = "";
  imageToRemove = Boolean(editingId);
  mostrarImagen("");
  removeImageButton.hidden = true;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const archivo = imageInput.files[0];
  const idAnterior = editingId;
  const datos = {
    nombre: campo("nombre").value.trim(), especie: campo("especie").value,
    raza: campo("raza").value.trim(), edadMeses: Number(campo("edadMeses").value),
    tamano: campo("tamano").value, ubicacion: campo("ubicacion").value.trim(),
    estado: campo("estado").value, descripcion: campo("descripcion").value.trim()
  };
  submitButton.disabled = true;
  try {
    const mascota = await pedirJSON(idAnterior ? `${API_URL}/${encodeURIComponent(idAnterior)}` : API_URL, {
      method: idAnterior ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
    });
    let errorFoto = null;
    try {
      if (archivo) await pedirJSON(`${API_URL}/${mascota._id}/imagen`, { method: "POST", headers: { "Content-Type": archivo.type }, body: archivo });
      else if (imageToRemove) await pedirJSON(`${API_URL}/${mascota._id}/imagen`, { method: "DELETE" });
    } catch (error) { errorFoto = error; }
    resetearFormulario();
    await cargar();
    if (errorFoto) avisar(`La ficha se guardó, pero la foto no se pudo actualizar: ${errorFoto.message}`, "error");
    else avisar(idAnterior ? "La ficha se actualizó correctamente." : "La mascota se registró correctamente.");
  } catch (error) {
    avisar(error.message, "error");
  } finally { submitButton.disabled = false; }
});

search.addEventListener("input", renderizar);
document.getElementById("new-pet").addEventListener("click", () => { resetearFormulario(); document.getElementById("form-panel").scrollIntoView({ behavior: "smooth" }); campo("nombre").focus({ preventScroll: true }); });
cancelButton.addEventListener("click", resetearFormulario);
cargar();
