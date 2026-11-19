import { computed, Injectable, signal } from '@angular/core';
import {
  actualizarUsuario as guardarUsuarioSesion,
  api,
  cerrarSesion,
  getUsuario,
  guardarSesion,
} from './api.service';
import { Activo, Auditoria, Historial, Lectura, Registro, Usuario } from '../models/tipos';
import { addReading, attention, resolveCode, tally } from '../models/domain';

const hoy = () => new Date().toISOString().slice(0, 10);

@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly usuario = signal<Usuario | null>(getUsuario());
  readonly activos = signal<Activo[]>([]);
  readonly registros = signal<Registro[]>([]);
  readonly historial = signal<Historial[]>([]);
  readonly auditorias = signal<Auditoria[]>([]);
  readonly auditoria = signal<Auditoria | null>(null);
  readonly ready = signal(false);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly online = signal(navigator.onLine);
  readonly offline = computed(() => !this.online());
  readonly toast = signal<{ text: string; kind: string } | null>(null);
  /** Equipos que requieren atención: la misma lista que muestra Alertas. */
  readonly alertas = computed(() =>
    this.activos().filter((a) => this.atencion(a).level !== 'green'),
  );
  readonly totales = computed(() =>
    this.auditoria()
      ? tally(this.auditoria()!)
      : { expectedFound: [], missing: [], unexpected: [], pending: 0 },
  );
  private db!: IDBDatabase;
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    window.addEventListener('online', () => {
      this.online.set(true);
      void this.sincronizar(true);
    });
    window.addEventListener('offline', () => this.online.set(false));
    window.addEventListener('inventi:sesion-expirada', () => this.salir());
    void this.init();
  }

  private async init() {
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('inventi-inventario-v2', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('state');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const cache = await this.idbGet<{
        activos: Activo[];
        registros: Registro[];
        historial: Historial[];
        auditorias: Auditoria[];
      }>('cache');
      if (cache) {
        this.activos.set(cache.activos ?? []);
        this.registros.set(cache.registros ?? []);
        this.historial.set(cache.historial ?? []);
        this.auditorias.set(cache.auditorias ?? []);
      }
      const local = await this.idbGet<Auditoria>('auditoria');
      if (local && local.estado === 'abierta') this.auditoria.set(local);
      this.ready.set(true);
      if (this.usuario()) {
        await this.refrescarPerfil();
        if (!this.usuario()) return;
        await this.refrescar();
        await this.sincronizar(true);
      }
    } catch {
      this.error.set(
        'No se pudo abrir el almacenamiento local. Habilita los datos del sitio y recarga.',
      );
      this.ready.set(true);
    }
  }

  private idbGet<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const r = this.db.transaction('state').objectStore('state').get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  private idbPut(key: string, val: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('state', 'readwrite');
      tx.objectStore('state').put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  private async guardarLocal() {
    try {
      await this.idbPut('auditoria', this.auditoria());
    } catch {
      /* la auditoría vive solo en memoria si no hay almacenamiento */
    }
  }
  private async guardarCache() {
    try {
      await this.idbPut('cache', {
        activos: this.activos(),
        registros: this.registros(),
        historial: this.historial(),
        auditorias: this.auditorias(),
      });
    } catch {
      /* caché opcional */
    }
  }

  /** Refresca nombre/rol desde el servidor; si el token ya no vale, limpia la sesión. */
  async refrescarPerfil() {
    if (!this.usuario()) return;
    try {
      this.actualizarUsuario(await api.me());
    } catch {
      /* sin red o 401: el evento inventi:sesion-expirada limpia la sesión */
    }
  }

  async refrescar() {
    if (!this.usuario()) return;
    this.cargando.set(true);
    try {
      const d = await api.bootstrap();
      this.activos.set(d.activos as Activo[]);
      this.registros.set(d.registros as Registro[]);
      this.historial.set(d.historial as Historial[]);
      const auds = (d.auditorias as { auditoria: Auditoria; lecturas: Lectura[] }[]).map((x) => ({
        ...x.auditoria,
        lecturas: (x.lecturas ?? []).map((l) => ({ ...l, sincronizada: true })),
      }));
      this.auditorias.set(auds);
      this.error.set('');
      await this.guardarCache();
    } catch (e) {
      if (!this.offline()) this.notify((e as Error).message, 'error');
    } finally {
      this.cargando.set(false);
    }
  }

  async login(email: string, password: string) {
    const r = await api.login(email, password);
    guardarSesion(r.token, r.usuario);
    this.usuario.set(r.usuario);
    await this.refrescar();
    await this.sincronizar(true);
  }
  salir() {
    cerrarSesion();
    this.usuario.set(null);
    this.activos.set([]);
    this.registros.set([]);
    this.historial.set([]);
    this.auditorias.set([]);
    this.auditoria.set(null);
  }

  /** Refresca el usuario en memoria y en sessionStorage (perfil o cambio propio). */
  actualizarUsuario(usuario: Usuario) {
    this.usuario.set(usuario);
    guardarUsuarioSesion(usuario);
  }

  notify(text: string, kind = 'success') {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 5500);
  }

  asset(id: string) {
    return this.activos().find((a) => a.id === id);
  }
  atencion(a: Activo) {
    return attention(a, this.registros(), hoy());
  }
  registrosDe(id: string) {
    return this.registros().filter((r) => r.activoId === id);
  }
  resolver(input: string) {
    return resolveCode(input, this.activos());
  }

  // ---- CRUD de activos (requiere conexión) ----
  async crearActivo(datos: Partial<Activo>) {
    const a = await api.post<Activo>('/activos', datos);
    await this.refrescar();
    this.notify(`${a.codigo} registrado.`);
    return a;
  }
  async editarActivo(id: string, parche: Record<string, unknown>, accion = 'Edición') {
    await api.patch(`/activos/${id}`, { ...parche, accion });
    await this.refrescar();
    this.notify('Cambios guardados.');
  }
  async asignar(id: string, responsable: string) {
    await api.post(`/activos/${id}/asignar`, { responsable });
    await this.refrescar();
    this.notify('Equipo asignado.');
  }
  async devolver(id: string) {
    await api.post(`/activos/${id}/devolver`);
    await this.refrescar();
    this.notify('Equipo devuelto.');
  }
  async darDeBaja(id: string) {
    await api.post(`/activos/${id}/baja`);
    await this.refrescar();
    this.notify('Activo dado de baja.');
  }
  async registrar(datos: Partial<Registro>) {
    await api.post('/registros', datos);
    await this.refrescar();
    this.notify('Registro guardado.');
  }
  async cerrarRegistro(id: string) {
    await api.post(`/registros/${id}/cerrar`);
    await this.refrescar();
    this.notify('Registro cerrado.');
  }
  async analizarImport(filas: Partial<Activo>[]) {
    return api.post<{ nuevos: Activo[]; duplicados: Activo[] }>('/import/analizar', filas);
  }
  async importar(filas: Partial<Activo>[]) {
    await api.post('/import', filas);
    await this.refrescar();
    this.notify(`${filas.length} activos importados.`);
  }

  // ---- Auditoría guiada (lecturas offline-first) ----
  async iniciarAuditoria(ubicacion: string) {
    this.busy.set(true);
    try {
      const a = await api.post<Auditoria>('/auditorias', { ubicacion });
      this.auditoria.set({ ...a, lecturas: [] });
      await this.guardarLocal();
      await this.refrescar();
      this.notify('Auditoría iniciada.');
    } finally {
      this.busy.set(false);
    }
  }
  async scan(input: string, origen: Lectura['origen'] = 'Código') {
    const aud = this.auditoria();
    if (!aud || aud.estado !== 'abierta') {
      this.notify('Inicia una auditoría antes de registrar lecturas.', 'info');
      return;
    }
    const asset = this.resolver(input);
    if (!asset) {
      this.notify('Código no registrado en el inventario.', 'error');
      return;
    }
    const lectura: Lectura = {
      activoId: asset.id,
      leidaEn: new Date().toISOString(),
      origen,
      sincronizada: false,
    };
    const r = addReading(aud, lectura);
    if (r.duplicate) {
      this.notify(`${asset.codigo} ya está registrado en esta auditoría.`, 'info');
      return;
    }
    this.auditoria.set(r.audit);
    await this.guardarLocal();
    this.notify(
      aud.esperados.includes(asset.id)
        ? `${asset.codigo} guardado en este dispositivo.`
        : `${asset.codigo}: equipo de otra ubicación.`,
      aud.esperados.includes(asset.id) ? 'success' : 'info',
    );
    if (this.online()) await this.sincronizar(true);
  }
  async sincronizar(silencioso = false) {
    const aud = this.auditoria();
    if (!aud || aud.estado !== 'abierta') return;
    const pendientes = (aud.lecturas ?? []).filter((l) => !l.sincronizada);
    if (!pendientes.length) return;
    if (!this.online()) {
      if (!silencioso) this.notify('Sin conexión: las lecturas quedan pendientes.', 'info');
      return;
    }
    this.busy.set(true);
    try {
      const r = await api.post<{ nuevas: number; total: number }>('/sync', {
        auditoriaId: aud.id,
        lecturas: pendientes.map((l) => ({
          activoId: l.activoId,
          leidaEn: l.leidaEn,
          origen: l.origen,
        })),
      });
      const actual = this.auditoria();
      if (actual) {
        this.auditoria.set({
          ...actual,
          lecturas: (actual.lecturas ?? []).map((l) => ({ ...l, sincronizada: true })),
        });
        await this.guardarLocal();
      }
      if (!silencioso)
        this.notify(
          r.total === 1
            ? '1 lectura confirmada en el servidor.'
            : `${r.total} lecturas confirmadas en el servidor.`,
        );
    } catch (e) {
      if (!silencioso) this.notify((e as Error).message, 'error');
    } finally {
      this.busy.set(false);
    }
  }
  async cerrarAuditoria() {
    const aud = this.auditoria();
    if (!aud) return;
    if (this.totales().pending) {
      this.notify('Sincroniza las lecturas pendientes antes de cerrar.', 'info');
      return;
    }
    this.busy.set(true);
    try {
      await api.post(`/auditorias/${aud.id}/cerrar`);
      this.auditoria.set(null);
      await this.guardarLocal();
      await this.refrescar();
      this.notify('Auditoría cerrada.');
    } finally {
      this.busy.set(false);
    }
  }
  async reiniciarAuditoria() {
    this.auditoria.set(null);
    await this.guardarLocal();
    this.notify('Auditoría descartada.');
  }
}

export { StoreService as Store };
