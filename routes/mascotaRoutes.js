const express = require("express");
const controller = require("../controllers/mascotaController");

const router = express.Router();
const leerImagen = express.raw({ type: () => true, limit: "5mb" });

router.get("/", controller.listar);
router.post("/", controller.crear);
router.post("/:id/imagen", leerImagen, controller.subirImagen);
router.delete("/:id/imagen", controller.quitarImagen);
router.get("/:id", controller.obtener);
router.put("/:id", controller.actualizar);
router.delete("/:id", controller.eliminar);

module.exports = router;
