const mongoose = require("mongoose");

module.exports = async function connectDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri || !uri.trim()) throw new Error("MONGO_URI no configurada");
  await mongoose.connect(uri, { dbName: "gestion_mascotas", serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB conectado a gestion_mascotas");
};
