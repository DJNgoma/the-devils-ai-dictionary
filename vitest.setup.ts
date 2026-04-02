import { beforeEach } from "vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(String(key));
  }

  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
}

function installStorage(key: "localStorage" | "sessionStorage") {
  const storage = new MemoryStorage();

  Object.defineProperty(globalThis, "Storage", {
    configurable: true,
    writable: true,
    value: MemoryStorage,
  });
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: storage,
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "Storage", {
      configurable: true,
      writable: true,
      value: MemoryStorage,
    });
    Object.defineProperty(window, key, {
      configurable: true,
      writable: true,
      value: storage,
    });
  }
}

if (typeof window !== "undefined") {
  installStorage("localStorage");
  installStorage("sessionStorage");
}

beforeEach(() => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.clear();
  sessionStorage.clear();
});
