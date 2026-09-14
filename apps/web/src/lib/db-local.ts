// Wrapper mínimo sobre IndexedDB nativo (sin librerías) — reemplaza al
// localStorage de la Fase 0. Los "object stores" espejan 1:1 las tablas del
// servidor: eventos, tareas, materias, calendarios, settings (fila única
// "singleton"), más `cola` (mutaciones encoladas para /sync) y `meta`
// (el cursor de la última sincronización exitosa).

const NOMBRE_DB = "organizador";
const VERSION_DB = 1;

export const STORES = ["eventos", "tareas", "materias", "calendarios", "mails", "settings", "cola", "meta"] as const;
export type NombreStore = (typeof STORES)[number];

export interface MutacionCola {
  clientId?: number;
  entidad: "evento" | "tarea" | "materia" | "calendario" | "settings";
  id?: string;
  patch: Record<string, unknown>;
  timestamp: string;
}

let promesaDb: Promise<IDBDatabase> | null = null;

function abrirDbLocal(): Promise<IDBDatabase> {
  if (promesaDb) return promesaDb;
  promesaDb = new Promise((resolve, reject) => {
    const request = indexedDB.open(NOMBRE_DB, VERSION_DB);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (db.objectStoreNames.contains(store)) continue;
        if (store === "cola") {
          db.createObjectStore(store, { keyPath: "clientId", autoIncrement: true });
        } else if (store === "meta") {
          db.createObjectStore(store, { keyPath: "clave" });
        } else {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return promesaDb;
}

async function transaccion<T>(
  store: NombreStore,
  modo: IDBTransactionMode,
  ejecutar: (almacen: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await abrirDbLocal();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, modo);
    const almacen = tx.objectStore(store);
    const request = ejecutar(almacen);
    tx.oncomplete = () => resolve(request ? request.result : (undefined as T));
    tx.onerror = () => reject(tx.error);
  });
}

export async function leerTodo<T>(store: NombreStore): Promise<T[]> {
  return transaccion<T[]>(store, "readonly", (almacen) => almacen.getAll() as IDBRequest<T[]>);
}

export async function guardarUno<T>(store: NombreStore, valor: T): Promise<void> {
  await transaccion(store, "readwrite", (almacen) => almacen.put(valor));
}

export async function guardarTodos<T>(store: NombreStore, valores: T[]): Promise<void> {
  const db = await abrirDbLocal();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const almacen = tx.objectStore(store);
    for (const valor of valores) almacen.put(valor);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function borrarUno(store: NombreStore, id: string): Promise<void> {
  await transaccion(store, "readwrite", (almacen) => almacen.delete(id));
}

export async function leerMeta(clave: string): Promise<string | null> {
  const fila = await transaccion<{ clave: string; valor: string } | undefined>(
    "meta",
    "readonly",
    (almacen) => almacen.get(clave) as IDBRequest<{ clave: string; valor: string } | undefined>,
  );
  return fila?.valor ?? null;
}

export async function escribirMeta(clave: string, valor: string): Promise<void> {
  await guardarUno("meta", { clave, valor });
}

export async function encolarMutacion(mutacion: Omit<MutacionCola, "clientId">): Promise<void> {
  await guardarUno("cola", mutacion as MutacionCola);
}

export async function leerCola(): Promise<MutacionCola[]> {
  return leerTodo<MutacionCola>("cola");
}

export async function quitarDeCola(clientIds: number[]): Promise<void> {
  const db = await abrirDbLocal();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("cola", "readwrite");
    const almacen = tx.objectStore("cola");
    for (const id of clientIds) almacen.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function contarCola(): Promise<number> {
  return (await leerCola()).length;
}
