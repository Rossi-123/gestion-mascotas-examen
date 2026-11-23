# Huellas de Hogar — gestión de mascotas en adopción

Aplicación web con catálogo público y panel de administración para registrar mascotas en adopción. Usa Node.js, Express, MongoDB/Mongoose y un frontend en HTML, CSS y JavaScript puro.

## Requisitos

- Node.js 20 o superior y npm.
- MongoDB local o MongoDB Atlas. La aplicación usa una base de datos independiente llamada `gestion_mascotas`.

## Instalación y ejecución

```bash
npm install
```

Copia `.env.example` a `.env` dentro de este proyecto y configura tu propia URI de MongoDB:

```env
PORT=3000
MONGO_URI=
```

En `MONGO_URI` escribe una URI válida de tu servidor o clúster. El nombre de base de datos lo fija la aplicación como `gestion_mascotas`. Nunca subas `.env` al repositorio.

```bash
npm start
# o, para desarrollo con reinicio automático:
npm run dev
```

El servidor comienza a escuchar únicamente después de conectar con MongoDB. Si falta `MONGO_URI` o falla la conexión, termina con error y no anuncia que está disponible. El puerto predeterminado es 3000 y la escucha se limita a `127.0.0.1`.

Para comprobar validaciones y respuestas HTTP usa `npm test`. Con el servidor iniciado y una URI de MongoDB propia configurada, `npm run test:live` prueba el CRUD y las fotos contra la base real; crea y retira una mascota temporal.

- Catálogo público: [http://localhost:3000/](http://localhost:3000/)
- Administración: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
- Estado de la API: [http://localhost:3000/api](http://localhost:3000/api)

## API REST

Todas las respuestas JSON usan `{ "success": boolean, "message": string, "data": valor | null }`. Los errores de validación devuelven 400, los registros ausentes 404, los archivos mayores de 5 MB 413, los tipos de imagen no permitidos 415 y los errores internos 500.

| Método | Ruta | Descripción | Éxito |
| --- | --- | --- | --- |
| GET | `/api` | Comprueba que la API responde | 200 |
| GET | `/api/mascotas` | Lista todas las mascotas, de más reciente a más antigua | 200 |
| GET | `/api/mascotas/:id` | Obtiene una mascota por ID | 200 |
| POST | `/api/mascotas` | Crea una mascota con JSON | 201 |
| PUT | `/api/mascotas/:id` | Actualiza los campos enviados en JSON | 200 |
| DELETE | `/api/mascotas/:id` | Elimina una mascota y su foto local | 200 |
| POST | `/api/mascotas/:id/imagen` | Sube o reemplaza la foto con un cuerpo binario | 200 |
| DELETE | `/api/mascotas/:id/imagen` | Quita la foto de una mascota | 200 |

Ejemplo de cuerpo JSON para crear una mascota:

```json
{
  "nombre": "Luna",
  "especie": "Perro",
  "raza": "Mestizo",
  "edadMeses": 18,
  "tamano": "Mediano",
  "descripcion": "Juguetona y tranquila durante los paseos.",
  "ubicacion": "Bogotá",
  "estado": "Disponible"
}
```

`nombre`, `especie`, `raza`, `edadMeses`, `tamano`, `descripcion` y `ubicacion` son obligatorios. `estado` comienza en `Disponible` si se omite. Sus valores posibles son `Disponible`, `En proceso` y `Adoptada`. `especie` admite `Perro`, `Gato` y `Otro`; `tamano` admite `Pequeño`, `Mediano` y `Grande`. `edadMeses` debe ser un entero no negativo. `imagenUrl` se administra exclusivamente en el servidor.

Para subir una foto, envía el archivo binario como cuerpo de `POST /api/mascotas/:id/imagen` con `Content-Type: image/jpeg`, `image/png` o `image/webp`. El límite es **5 MB**. La API comprueba el tipo declarado y la firma básica del archivo. El formulario guarda primero la ficha JSON y luego envía la imagen. Si falla la subida, la ficha continúa guardada y el panel lo informa.

## Estructura

- `app.js`: Express, archivos estáticos, rutas y manejo de errores.
- `server.js` y `config/database.js`: inicio y conexión a `gestion_mascotas`.
- `models/Mascota.js`: esquema y validaciones de Mongoose.
- `controllers/mascotaController.js` y `routes/mascotaRoutes.js`: CRUD y gestión de imágenes.
- `public/index.html` y `public/js/catalogo.js`: búsqueda, filtros y detalle del catálogo.
- `public/admin.html` y `public/js/admin.js`: formulario, vista previa y gestión de registros.
- `public/css/styles.css` y `public/assets/companeros.svg`: diseño adaptable e ilustración original.
- `public/uploads/`: imágenes locales, excluidas de Git salvo `.gitkeep`.

 
## Trabajo realizado por

### SHEYLA ROSSI ORTIZ GARCIA
