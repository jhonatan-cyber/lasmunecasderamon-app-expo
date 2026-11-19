export type RoleLike = string | { name?: unknown } | null | undefined;

export type UserLike = {
  role?: RoleLike;
} | null | undefined;

export const getRoleName = (role: RoleLike) => {
  if (typeof role === "string") {
    return role;
  }

  if (role && typeof role === "object" && typeof role.name === "string") {
    return role.name;
  }

  return "";
};

export const getUserRoleName = (user: UserLike) => getRoleName(user?.role);

export const getUserRole = (user: UserLike) => getUserRoleName(user).trim().toLowerCase();

export const isGarzonRole = (user: UserLike) => getUserRole(user).includes("garzon");

export const isBarmanRole = (user: UserLike) => getUserRole(user).includes("barman");

export const isHostessRole = (user: UserLike) => getUserRole(user).includes("anfitriona");

export const isAdminRole = (user: UserLike) => getUserRole(user).includes("admin");

export const isCajeroRole = (user: UserLike) => {
  const role = getUserRole(user);
  return role === "cajero" || role === "cajera";
};

export const isCajeroOrAdminRole = (user: UserLike) => isCajeroRole(user) || isAdminRole(user);

export const userRoleMatches = (user: UserLike, expectedRole: string) =>
  getUserRole(user).includes(expectedRole.trim().toLowerCase());

/**
 * Etiqueta legible de un rol: sin espacios sobrantes, con mayúscula inicial y
 * con los acentos de los roles conocidos ("garzon" → "Garzón"). Un rol vacío
 * se muestra como "Sin rol", para que un registro sin rol no se pierda del
 * historial ni se mezcle con otro.
 */
export function nombreRolLegible(rol?: string | null): string {
  const limpio = (rol ?? '').trim();
  if (!limpio) return 'Sin rol';
  const base = limpio.toLowerCase() === 'garzon' ? 'garzón' : limpio.toLowerCase();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Devuelve la ruta de navegación principal según el rol del usuario.
 * Se usa para evitar redirecciones intermedias que causan recargas en nativo.
 */
export function getHomeRouteByRole(user: UserLike): '/(app)/garzon/(tabs)' | '/(app)/anfitriona/(tabs)' | '/(app)/barman/(tabs)' | '/(app)/cajero/(tabs)' {
  if (isGarzonRole(user)) {
    return '/(app)/garzon/(tabs)';
  } else if (isHostessRole(user)) {
    return '/(app)/anfitriona/(tabs)';
  } else if (isBarmanRole(user)) {
    return '/(app)/barman/(tabs)';
  } else if (isCajeroRole(user) || isAdminRole(user)) {
    return '/(app)/cajero/(tabs)';
  }
  // Fallback por defecto
  return '/(app)/garzon/(tabs)';
}
