type RoleLike = string | { name?: unknown } | null | undefined;

type UserLike = {
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

export const isHostessRole = (user: UserLike) => getUserRole(user).includes("anfitriona");

export const isAdminRole = (user: UserLike) => getUserRole(user).includes("admin");

export const isCajeroRole = (user: UserLike) => {
  const role = getUserRole(user);
  return role === "cajero" || role === "cajera";
};

export const isCajeroOrAdminRole = (user: UserLike) => isCajeroRole(user) || isAdminRole(user);

export const userRoleMatches = (user: UserLike, expectedRole: string) =>
  getUserRole(user).includes(expectedRole.trim().toLowerCase());
