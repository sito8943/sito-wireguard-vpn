/**
 * Rutas centralizadas (ARCHITECTURE_RULES §8).
 * Excepción documentada: app de una sola vista, sin react-router;
 * las constantes existen para cuando se agreguen más pantallas.
 */
export const Routes = {
  HOME: "/",
} as const;

export type RouteKey = keyof typeof Routes;
