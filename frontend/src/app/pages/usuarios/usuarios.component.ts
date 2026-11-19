import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { api } from '../../core/services/api.service';
import { IconComponent } from '../../components/icon/icon.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { Usuario } from '../../core/models/tipos';
import { ROL_LABELS } from '../../core/models/permisos';

type Rol = Usuario['rol'];
type EstadoFiltro = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, IconComponent, ModalComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  s = inject(StoreService);
  readonly selfId = computed(() => this.s.usuario()?.id ?? '');

  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);
  q = signal('');
  rolFiltro = signal<Rol | ''>('');
  estadoFiltro = signal<EstadoFiltro>('todos');

  formAbierto = signal(false);
  nuevo = { nombre: '', email: '', rol: 'tecnico' as Rol, password: '', confirmar: '' };
  mostrarNuevoPassword = false;

  editando = signal<Usuario | null>(null);
  editModel: { nombre: string; email: string; rol: Rol; activo: boolean } = {
    nombre: '',
    email: '',
    rol: 'tecnico',
    activo: true,
  };
  editError = signal('');

  passwordForm = signal<Usuario | null>(null);
  passwordNueva = '';
  passwordConfirmar = '';
  passwordError = signal('');
  mostrarPassword = false;

  confirmarDesactivar = signal<Usuario | null>(null);

  roles: { value: Rol; label: string }[] = (Object.keys(ROL_LABELS) as Rol[]).map((value) => ({
    value,
    label: ROL_LABELS[value],
  }));

  readonly resumen = computed(() => {
    const lista = this.usuarios();
    return {
      total: lista.length,
      activos: lista.filter((u) => u.activo !== false).length,
      admins: lista.filter((u) => u.rol === 'administrador' && u.activo !== false).length,
    };
  });

  readonly filtrados = computed(() => {
    const q = this.q().trim().toLocaleLowerCase();
    const rol = this.rolFiltro();
    const estado = this.estadoFiltro();
    return this.usuarios().filter((u) => {
      const coincide =
        !q || u.nombre.toLocaleLowerCase().includes(q) || u.email.toLocaleLowerCase().includes(q);
      const rolOk = !rol || u.rol === rol;
      const activo = u.activo !== false;
      const estadoOk = estado === 'todos' || (estado === 'activos' ? activo : !activo);
      return coincide && rolOk && estadoOk;
    });
  });

  ngOnInit() {
    void this.cargar();
  }

  private async cargar() {
    this.cargando.set(true);
    try {
      this.usuarios.set(await api.get<Usuario[]>('/usuarios'));
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    } finally {
      this.cargando.set(false);
    }
  }

  esYo(u: Usuario) {
    return u.id === this.selfId();
  }

  iniciales(u: Usuario) {
    const partes = u.nombre.trim().split(/\s+/);
    const iniciales = (partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '');
    return (iniciales || u.email.slice(0, 2)).toUpperCase();
  }

  rolLabel(rol: Rol) {
    return ROL_LABELS[rol] ?? rol;
  }

  setRolFiltro(valor: string) {
    this.rolFiltro.set((valor || '') as Rol | '');
  }

  setEstadoFiltro(valor: string) {
    this.estadoFiltro.set(valor as EstadoFiltro);
  }

  limpiarFiltros() {
    this.q.set('');
    this.rolFiltro.set('');
    this.estadoFiltro.set('todos');
  }

  abrirForm() {
    this.nuevo = { nombre: '', email: '', rol: 'tecnico', password: '', confirmar: '' };
    this.mostrarNuevoPassword = false;
    this.formAbierto.set(true);
  }

  puedeCrear() {
    return (
      !!this.nuevo.nombre.trim() &&
      !!this.nuevo.email.trim() &&
      this.nuevo.password.length >= 8 &&
      this.nuevo.password === this.nuevo.confirmar
    );
  }

  async crear() {
    if (!this.puedeCrear()) return;
    try {
      await api.post('/usuarios', {
        nombre: this.nuevo.nombre.trim(),
        email: this.nuevo.email.trim(),
        rol: this.nuevo.rol,
        password: this.nuevo.password,
      });
      this.s.notify('Usuario creado.');
      await this.cargar();
      this.formAbierto.set(false);
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    }
  }

  abrirEditar(u: Usuario) {
    this.editando.set(u);
    this.editModel = {
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      activo: u.activo !== false,
    };
    this.editError.set('');
  }

  cerrarEditar() {
    this.editando.set(null);
    this.editError.set('');
  }

  puedeGuardarEdicion() {
    return !!this.editModel.nombre.trim() && !!this.editModel.email.trim();
  }

  async guardarEdicion() {
    const u = this.editando();
    if (!u || !this.puedeGuardarEdicion()) return;
    const body: Record<string, unknown> = this.esYo(u)
      ? { nombre: this.editModel.nombre.trim() }
      : {
          nombre: this.editModel.nombre.trim(),
          email: this.editModel.email.trim(),
          rol: this.editModel.rol,
          activo: this.editModel.activo,
        };
    try {
      const actualizado = await api.patch<Usuario>(`/usuarios/${u.id}`, body);
      if (this.esYo(u)) this.s.actualizarUsuario(actualizado);
      this.s.notify('Usuario actualizado.');
      this.cerrarEditar();
      await this.cargar();
    } catch (e) {
      this.editError.set((e as Error).message);
    }
  }

  abrirPassword(u: Usuario) {
    this.editando.set(null);
    this.passwordForm.set(u);
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.passwordError.set('');
    this.mostrarPassword = false;
  }

  cerrarPassword() {
    this.passwordForm.set(null);
    this.passwordError.set('');
  }

  puedeGuardarPassword() {
    return this.passwordNueva.length >= 8 && this.passwordNueva === this.passwordConfirmar;
  }

  async guardarPassword() {
    const u = this.passwordForm();
    if (!u || !this.puedeGuardarPassword()) return;
    try {
      await api.post(`/usuarios/${u.id}/password`, { password: this.passwordNueva });
      this.s.notify(`Contraseña actualizada. ${u.nombre} deberá iniciar sesión de nuevo.`);
      this.cerrarPassword();
      await this.cargar();
    } catch (e) {
      this.passwordError.set((e as Error).message);
    }
  }

  pedirDesactivar(u: Usuario) {
    this.editando.set(null);
    this.confirmarDesactivar.set(u);
  }

  async cambiarEstado(u: Usuario, activo: boolean) {
    if (!activo) {
      this.pedirDesactivar(u);
      return;
    }
    this.editando.set(null);
    try {
      await api.patch(`/usuarios/${u.id}`, { activo: true });
      this.s.notify(`${u.nombre} puede volver a iniciar sesión.`);
      await this.cargar();
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    }
  }

  async confirmarDesactivacion() {
    const u = this.confirmarDesactivar();
    if (!u) return;
    try {
      await api.patch(`/usuarios/${u.id}`, { activo: false });
      this.s.notify(`Cuenta de ${u.nombre} desactivada.`);
      this.confirmarDesactivar.set(null);
      await this.cargar();
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
      this.confirmarDesactivar.set(null);
    }
  }

  /** Fecha legible: Hoy/Ayer/Hace N días/fecha corta. */
  hace(fecha: string | null | undefined) {
    if (!fecha) return 'Nunca';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '—';
    const ahora = new Date();
    const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === ahora.toDateString()) return `Hoy, ${hora}`;
    const ayer = new Date(ahora);
    ayer.setDate(ahora.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
    const dias = Math.floor((ahora.getTime() - d.getTime()) / 86_400_000);
    if (dias >= 0 && dias < 7) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    if (d.getFullYear() !== ahora.getFullYear()) opciones.year = 'numeric';
    return d.toLocaleDateString('es-PE', opciones);
  }
}

export { UsuariosComponent as Usuarios };
