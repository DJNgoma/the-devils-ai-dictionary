class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    const normalizedKey = String(key);
    return this.values.has(normalizedKey) ? this.values.get(normalizedKey)! : null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(String(key));
  }

  setItem(key: string, value: string) {
    this.values.set(String(key), String(value));
  }
}

function installStorage(target: Window & typeof globalThis) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();

  Object.defineProperty(target, "localStorage", {
    value: localStorage,
    configurable: true,
  });
  Object.defineProperty(target, "sessionStorage", {
    value: sessionStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "Storage", {
    value: MemoryStorage,
    configurable: true,
  });
}

if (typeof window !== "undefined") {
  installStorage(window as Window & typeof globalThis);
}
