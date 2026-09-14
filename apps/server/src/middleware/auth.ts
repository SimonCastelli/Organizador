import type { NextFunction, Request, Response } from "express";

export const NOMBRE_COOKIE = "organizador_token";

/** Usuario único, sin registro: un token largo fijo en `.env` (`AUTH_TOKEN`),
 * mandado como `Authorization: Bearer <token>` o guardado en una cookie
 * httpOnly por /api/auth/login. Sin token configurado, el server rechaza
 * todo en vez de quedar abierto por default. */
export function requiereAuth(req: Request, res: Response, next: NextFunction): void {
  const tokenEsperado = process.env.AUTH_TOKEN;
  if (!tokenEsperado) {
    res.status(500).json({ error: "AUTH_TOKEN no está configurado en el servidor" });
    return;
  }

  const delHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const delCookie = (req.cookies as Record<string, string> | undefined)?.[NOMBRE_COOKIE];

  if (delHeader === tokenEsperado || delCookie === tokenEsperado) {
    next();
    return;
  }

  res.status(401).json({ error: "No autorizado" });
}
