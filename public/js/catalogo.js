const API_URL = "/api/mascotas";
const grid = document.getElementById("catalog-grid");
const count = document.getElementById("catalog-count");
const message = document.getElementById("catalog-message");
const search = document.getElementById("catalog-search");
const species = document.getElementById("species-filter");
const status = document.getElementById("status-filter");
const dialog = document.getElementById("detail-dialog");
const detailContent = document.getElementById("detail-content");
let mascotas = [];

function elemento(tag, clase = "", texto) {
  const node = document.createElement(tag);
  if (clase) node.className = clase;
  if (texto !== undefined) node.textContent = texto;
  return node;
}

function edad(meses) {
  const anos = Math.floor(meses / 12);
  const restantes = meses % 12;
  if (!anos) return `${meses} mes${meses === 1 ? "" : "es"}`;
  return `${anos} año${anos === 1 ? "" : "s"}${restantes ? ` y ${restantes} mes${restantes === 1 ? "" : "es"}` : ""}`;
}

function foto(mascota, clase) {
  const wrapper = elemento("div", clase);
  const reemplazo = () => wrapper.replaceChildren(elemento("span", "image-fallback", "✿"));
  if (!mascota.imagenUrl) reemplazo();
  else {
    const img = elemento("img", "pet-image");
    img.src = mascota.imagenUrl;
    img.alt = `Foto de ${mascota.nombre}`;
    img.loading = "lazy";
    img.addEventListener("error", reemplazo, { once: true });
    wrapper.append(img);
  }
  return wrapper;
}

async function pedirJSON(url) {
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "No se pudo cargar la información");
  return result.data;
}

function renderizar() {
  const termino = search.value.trim().toLocaleLowerCase("es");
  const visibles = mascotas.filter((mascota) =>
    (!species.value || mascota.especie === species.value) &&
    (!status.value || mascota.estado === status.value) &&
    `${mascota.nombre} ${mascota.raza} ${mascota.ubicacion}`.toLocaleLowerCase("es").includes(termino)
  );
  count.textContent = `${visibles.length} mascota${visibles.length === 1 ? "" : "s"} en esta vista`;
  grid.replaceChildren();
  if (!visibles.length) {
    const empty = elemento("div", "empty-state");
    empty.append(elemento("span", "empty-icon", "✿"));
    empty.append(elemento("h3", "", mascotas.length ? "No hay coincidencias" : "Todavía no hay mascotas registradas"));
    empty.append(elemento("p", "", mascotas.length ? "Prueba otra búsqueda o cambia los filtros." : "Los perfiles aparecerán aquí cuando se agreguen desde Administración."));
    grid.append(empty);
    return;
  }
  for (const mascota of visibles) {
    const card = elemento("article", "pet-card");
    card.append(foto(mascota, "card-image"));
    const body = elemento("div", "card-body");
    body.append(elemento("span", `status-badge ${mascota.estado === "Disponible" ? "available" : mascota.estado === "En proceso" ? "pending" : "adopted"}`, mascota.estado));
    body.append(elemento("h3", "card-title", mascota.nombre));
    body.append(elemento("p", "card-meta", `${mascota.especie} · ${edad(mascota.edadMeses)}`));
    body.append(elemento("p", "card-location", `⌖ ${mascota.ubicacion}`));
    const button = elemento("button", "button button-dark card-button", "Ver detalles ↗");
    button.type = "button";
    button.setAttribute("aria-label", `Ver detalles de ${mascota.nombre}`);
    button.addEventListener("click", () => verDetalle(mascota._id));
    body.append(button);
    card.append(body);
    grid.append(card);
  }
}

async function verDetalle(id) {
  message.textContent = "";
  message.className = "feedback";
  try {
    const mascota = await pedirJSON(`${API_URL}/${encodeURIComponent(id)}`);
    const layout = elemento("div", "detail-layout");
    layout.append(foto(mascota, "detail-image"));
    const info = elemento("div", "detail-info");
    info.append(elemento("span", "eyebrow", mascota.especie));
    const title = elemento("h2", "", mascota.nombre);
    title.id = "detail-title";
    info.append(title);
    info.append(elemento("span", `status-badge ${mascota.estado === "Disponible" ? "available" : mascota.estado === "En proceso" ? "pending" : "adopted"}`, mascota.estado));
    const facts = elemento("dl", "detail-facts");
    for (const [label, value] of [["Raza", mascota.raza], ["Edad", edad(mascota.edadMeses)], ["Tamaño", mascota.tamano], ["Ubicación", mascota.ubicacion]]) {
      facts.append(elemento("dt", "", label), elemento("dd", "", value));
    }
    info.append(facts, elemento("p", "detail-description", mascota.descripcion));
    layout.append(info);
    detailContent.replaceChildren(layout);
    dialog.showModal();
  } catch (error) {
    message.textContent = error.message;
    message.className = "feedback error";
  }
}

async function cargar() {
  message.textContent = "Cargando mascotas…";
  message.className = "feedback";
  try {
    mascotas = await pedirJSON(API_URL);
    message.textContent = "";
    renderizar();
  } catch (error) {
    mascotas = [];
    grid.replaceChildren();
    count.textContent = "No se pudo cargar el catálogo";
    message.textContent = error.message;
    message.className = "feedback error";
  }
}

for (const control of [search, species, status]) control.addEventListener(control === search ? "input" : "change", renderizar);
document.getElementById("close-detail").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
cargar();
