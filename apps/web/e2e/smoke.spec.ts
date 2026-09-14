import { expect, test } from "@playwright/test";

// Smoke de las seis vistas + la paleta de comandos. Usa los datos de arranque
// de seed.ts (localStorage vacío en cada contexto nuevo de Playwright).

test("navega por las seis vistas y ve los datos de arranque", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".topbar__titulo")).toHaveText("Hoy");
  await expect(page.getByRole("button", { name: "Gimnasio" })).toBeVisible();

  await page.locator(".sidebar__link", { hasText: "Semana" }).click();
  await expect(page.locator(".grilla-semana")).toBeVisible();

  await page.locator(".sidebar__link", { hasText: "Mes" }).click();
  await expect(page.locator(".grilla-mes")).toBeVisible();

  await page.locator(".sidebar__link", { hasText: "Tareas" }).click();
  await expect(page.getByText("Preparar informe de laboratorio")).toBeVisible();

  await page.locator(".sidebar__link", { hasText: "Facultad" }).click();
  await expect(page.getByText("Análisis de Sistemas")).toBeVisible();
  await expect(page.getByText("Bases de Datos Aplicadas")).toBeVisible();

  await page.locator(".sidebar__link", { hasText: "Mails" }).click();
  await expect(page.getByText("Abrir en Gmail").first()).toBeVisible();
});

test("marca una tarea como hecha", async ({ page }) => {
  await page.goto("/");
  await page.locator(".sidebar__link", { hasText: "Tareas" }).click();

  const fila = page.locator(".tarea", { hasText: "Repasar unidad 3" });
  await fila.locator(".tarea__check").click();

  await expect(page.getByText("Hechas")).toBeVisible();
});

test("la paleta ⌘K crea un evento a partir de lenguaje natural", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".topbar__titulo")).toHaveText("Hoy");
  await page.keyboard.press("Meta+k");

  const input = page.locator(".cmdk input");
  await expect(input).toBeVisible();
  await input.fill("mañana 15hs junta de práctica");

  await expect(page.getByRole("button", { name: /Crear evento/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toBeHidden();
});

test("los datos persisten en IndexedDB después de recargar la página", async ({ page }) => {
  await page.goto("/");
  await page.locator(".sidebar__link", { hasText: "Tareas" }).click();

  const texto = `Tarea de prueba ${Date.now()}`;
  await page.locator('input[placeholder^="Nueva tarea"]').fill(texto);
  await page.keyboard.press("Enter");
  await expect(page.getByText(texto)).toBeVisible();

  await page.reload();
  await page.locator(".sidebar__link", { hasText: "Tareas" }).click();
  await expect(page.getByText(texto)).toBeVisible();
});

test("eliminar un evento ofrece deshacer por toast", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Gimnasio" }).click();
  await page.getByRole("button", { name: "Eliminar" }).click();

  await expect(page.getByText('Evento "Gimnasio" eliminado')).toBeVisible();
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByRole("button", { name: "Gimnasio" })).toBeVisible();
});
