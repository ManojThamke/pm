import {
  clearSession,
  readSession,
  SESSION_STORAGE_KEY,
  validateCredentials,
  writeSession,
  type StorageLike,
} from "@/lib/auth";

const storage = (): StorageLike & { values: Record<string, string> } => {
  const values: Record<string, string> = {};
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
    removeItem: (key) => {
      delete values[key];
    },
  };
};

describe("auth model", () => {
  it("accepts only the MVP credentials", () => {
    expect(validateCredentials("user", "password")).toEqual({ username: "user" });
    expect(validateCredentials("User", "password")).toBeNull();
    expect(validateCredentials("user", "wrong")).toBeNull();
  });

  it("reads no session when storage is unavailable or empty", () => {
    expect(readSession(undefined)).toBeNull();
    expect(readSession(storage())).toBeNull();
  });

  it("writes, reads, and clears a session", () => {
    const sessionStorage = storage();
    const user = { username: "user" };
    writeSession(sessionStorage, user);
    expect(sessionStorage.values[SESSION_STORAGE_KEY]).toBe("user");
    expect(readSession(sessionStorage)).toEqual(user);
    clearSession(sessionStorage);
    expect(readSession(sessionStorage)).toBeNull();
  });
});
