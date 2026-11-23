const express = require("express");
const path = require("path");
const mascotaRoutes = require("./routes/mascotaRoutes");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api", (_req, res) => res.status(200).json({
  success: true, message: "API de gestión de mascotas disponible", data: null
}));
app.use("/api/mascotas", mascotaRoutes);
app.use("/api", (_req, res) => res.status(404).json({
  success: false, message: "Ruta de API no encontrada", data: null
}));

app.use((error, _req, res, _next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "El contenido supera el límite permitido", data: null });
  }
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ success: false, message: "JSON inválido", data: null });
  }
  return res.status(500).json({ success: false, message: "Error interno del servidor", data: null });
});

module.exports = app;
