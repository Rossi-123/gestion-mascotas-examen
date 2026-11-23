const mongoose = require("mongoose");

const textoObligatorio = (nombre, maximo) => ({
  type: String,
  required: [true, `${nombre} es obligatorio`],
  trim: true,
  maxlength: [maximo, `${nombre} no puede superar ${maximo} caracteres`],
  validate: { validator: (valor) => Boolean(valor && valor.trim()), message: `${nombre} es obligatorio` }
});

const mascotaSchema = new mongoose.Schema({
  nombre: textoObligatorio("El nombre", 120),
  especie: { type: String, required: [true, "La especie es obligatoria"], enum: ["Perro", "Gato", "Otro"] },
  raza: textoObligatorio("La raza", 120),
  edadMeses: {
    type: Number, required: [true, "La edad es obligatoria"], min: [0, "La edad no puede ser negativa"],
    validate: { validator: Number.isInteger, message: "La edad debe ser un número entero de meses" }
  },
  tamano: { type: String, required: [true, "El tamaño es obligatorio"], enum: ["Pequeño", "Mediano", "Grande"] },
  descripcion: textoObligatorio("La descripción", 1000),
  ubicacion: textoObligatorio("La ubicación", 120),
  estado: { type: String, enum: ["Disponible", "En proceso", "Adoptada"], default: "Disponible" },
  imagenUrl: { type: String, default: "", select: true }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Mascota", mascotaSchema);
