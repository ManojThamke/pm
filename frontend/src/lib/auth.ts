export type AuthenticatedUser = {
  username: string;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const SESSION_STORAGE_KEY = "pm-mvp-session";
export const AUTHORIZATION_SESSION_KEY = "pm-mvp-authorization";
const MVP_USERNAME = "user";
const MVP_PASSWORD = "password";

export const validateCredentials = (
  username: string,
  password: string
): AuthenticatedUser | null =>
  username === MVP_USERNAME && password === MVP_PASSWORD
    ? { username: MVP_USERNAME }
    : null;

export const readSession = (
  storage: StorageLike | undefined
): AuthenticatedUser | null => {
  if (!storage) return null;
  const username = storage.getItem(SESSION_STORAGE_KEY);
  return username ? { username } : null;
};

export const writeSession = (
  storage: StorageLike,
  user: AuthenticatedUser
): void => {
  storage.setItem(SESSION_STORAGE_KEY, user.username);
};

export const clearSession = (storage: StorageLike): void => {
  storage.removeItem(SESSION_STORAGE_KEY);
};

export const writeAuthorization = (storage: StorageLike, authorization: string) =>
  storage.setItem(AUTHORIZATION_SESSION_KEY, authorization);

export const readAuthorization = (storage: StorageLike | undefined): string | null =>
  storage?.getItem(AUTHORIZATION_SESSION_KEY) ?? null;

export const clearAuthorization = (storage: StorageLike): void => {
  storage.removeItem(AUTHORIZATION_SESSION_KEY);
};
