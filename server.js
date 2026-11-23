require("dotenv").config({ quiet: true });
const app = require("./app");
const connectDatabase = require("./config/database");

const port = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await connectDatabase();
    app.listen(port, "127.0.0.1", () => console.log(`Servidor disponible en http://localhost:${port}`));
  } catch (error) {
    console.error("No se pudo conectar a MongoDB. Verifica MONGO_URI y vuelve a intentar.");
    process.exitCode = 1;
  }
}

iniciarServidor();
