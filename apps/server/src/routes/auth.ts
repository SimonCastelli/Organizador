import { Router } from "express";
import { NOMBRE_COOKIE } from "../middleware/auth";

/** Login de un solo usuario: manda el token y listo, sin registro. Queda
 * guardado en una cookie httpOnly para que el front no tenga que manejarlo
 * a mano en cada request (aunque también acepta `Authorization: Bearer`). */
export function crearRouterAuth() {
  const router = Router();

  router.post("/login", (req, res) => {
    const { token } = (req.body ?? {}) as { token?: string };
    const tokenEsperado = process.env.AUTH_TOKEN;

    if (!tokenEsperado) {
      res.status(500).json({ error: "AUTH_TOKEN no está configurado en el servidor" });
      return;
    }
    if (!token || token !== tokenEsperado) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    res.cookie(NOMBRE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
    res.status(204).end();
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie(NOMBRE_COOKIE);
    res.status(204).end();
  });

  return router;
}
