import "dotenv/config";
import { crearApp } from "./app";
import { abrirDb } from "./db";

const PUERTO = Number(process.env.PORT ?? 3001);
const RUTA_DB = process.env.RUTA_DB ?? "./datos/organizador.sqlite3";

if (!process.env.AUTH_TOKEN) {
  console.warn(
    "⚠ AUTH_TOKEN no está configurado (ver .env.example) — todas las rutas de /api van a devolver 401/500.",
  );
}

const db = abrirDb(RUTA_DB);
const app = crearApp(db);

app.listen(PUERTO, () => {
  console.log(`Organizador server escuchando en :${PUERTO} (db: ${RUTA_DB})`);
});
