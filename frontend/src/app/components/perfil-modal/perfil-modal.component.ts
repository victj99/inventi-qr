import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { api } from '../../core/services/api.service';
import { Usuario } from '../../core/models/tipos';
import { rolLabel } from '../../core/models/permisos';
import { IconComponent } from '../../components/icon/icon.component';
import { ModalComponent } from '../../components/modal/modal.component';

@Component({
  selector: 'app-perfil-modal',
  imports: [FormsModule, IconComponent, ModalComponent],
  templateUrl: './perfil-modal.component.html',
  styleUrl: './perfil-modal.component.css',
})
export class PerfilModalComponent {
  private readonly s = inject(StoreService);
  private readonly router = inject(Router);

  readonly dismissed = output<void>();
  readonly error = signal('');
  readonly guardando = signal(false);

  nombre = this.s.usuario()?.nombre ?? '';
  actual = '';
  nueva = '';
  confirmar = '';
  mostrar = false;

  get email() {
    return this.s.usuario()?.email ?? '';
  }

  get rol() {
    return rolLabel(this.s.usuario()?.rol);
  }

  cerrar() {
    this.dismissed.emit();
  }

  puedeCambiar() {
    return (
      !!this.actual &&
      this.nueva.length >= 8 &&
      this.nueva === this.confirmar &&
      this.nueva !== this.actual
    );
  }

  async guardarDatos() {
    const nombre = this.nombre.trim();
    if (!nombre) {
      this.error.set('El nombre no puede estar vacío.');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    try {
      const u = await api.patch<Usuario>('/auth/perfil', { nombre });
      this.s.actualizarUsuario(u);
      this.s.notify('Perfil actualizado.');
      this.cerrar();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }

  async cambiarPassword() {
    if (!this.puedeCambiar()) {
      this.error.set('Revisa la contraseña actual y la confirmación.');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    try {
      await api.post('/auth/password', { actual: this.actual, nueva: this.nueva });
      this.s.notify('Contraseña actualizada. Vuelve a iniciar sesión.', 'info');
      this.dismissed.emit();
      this.s.salir();
      await this.router.navigateByUrl('/login');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }
}

export { PerfilModalComponent as PerfilModal };
