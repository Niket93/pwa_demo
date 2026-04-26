const DB_NAME = "burke-offline";
const DB_VERSION = 1;
const STORE = {
  aircraft: "aircraft",
  snags: "snags",
  metadata: "metadata",
  media: "media"
};

const SnagDB = {
  db: null,

  async init() {
    if (this.db) return this.db;

    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE.aircraft)) {
          db.createObjectStore(STORE.aircraft, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORE.snags)) {
          const snagStore = db.createObjectStore(STORE.snags, { keyPath: "id" });
          snagStore.createIndex("byAircraftId", "aircraftId", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE.metadata)) {
          db.createObjectStore(STORE.metadata, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(STORE.media)) {
          const mediaStore = db.createObjectStore(STORE.media, { keyPath: "id" });
          mediaStore.createIndex("bySnagId", "snagId", { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.db;
  },

  async tx(storeName, mode, handler) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = handler(store);

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async put(storeName, value) {
    return this.tx(storeName, "readwrite", (store) => store.put(value));
  },

  async get(storeName, key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex(storeName, indexName, key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(key);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async bulkPut(storeName, values) {
    if (!values.length) return;
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      values.forEach((value) => store.put(value));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async clear(storeName) {
    return this.tx(storeName, "readwrite", (store) => store.clear());
  }
};

window.SnagDB = SnagDB;
window.DB_STORE = STORE;
