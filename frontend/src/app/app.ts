import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { StoreService } from './core/services/store.service';
import { PwaService } from './core/services/pwa.service';
import { IconComponent } from './components/icon/icon.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { ModalComponent } from './components/modal/modal.component';
import { PerfilModalComponent } from './components/perfil-modal/perfil-modal.component';
import { can, rolLabel } from './core/models/permisos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    ScannerComponent,
    ModalComponent,
    PerfilModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  s = inject(StoreService);
  pwa = inject(PwaService);
  router = inject(Router);
  rolLabel = rolLabel;
  scanner = signal(false);
  installHelp = signal(false);
  moreOpen = signal(false);
  perfilOpen = signal(false);
  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  nav = computed(() => {
    const rol = this.s.usuario()?.rol;
    const items = [
      { path: '/inicio', icon: 'grid', name: 'Inicio', accion: 'ver' },
      { path: '/inventario', icon: 'box', name: 'Inventario', accion: 'ver' },
      { path: '/auditoria', icon: 'scan', name: 'Auditoría', accion: 'auditar' },
      { path: '/alertas', icon: 'bell', name: 'Alertas', accion: 'ver' },
      { path: '/etiquetas', icon: 'tag', name: 'Etiquetas', accion: 'etiquetas' },
      { path: '/reportes', icon: 'report', name: 'Reportes', accion: 'exportar' },
      { path: '/usuarios', icon: 'user', name: 'Usuarios', accion: 'usuarios' },
    ];
    return items.filter((i) => can(rol, i.accion));
  });
  /** Secciones frecuentes de la barra inferior móvil. */
  primaryNav = computed(() => this.nav().slice(0, 4));
  /** Secciones secundarias que viven en la hoja «Más». */
  extraNav = computed(() => this.nav().slice(4));
  moreActive = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return this.extraNav().some((i) => path === i.path || path.startsWith(i.path + '/'));
  });
  alertCount = computed(() => this.s.alertas().length);

  constructor() {
    window.addEventListener('inventi:sesion-expirada', () => {
      this.perfilOpen.set(false);
      this.moreOpen.set(false);
    });
  }

  skip(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
  install() {
    this.moreOpen.set(false);
    if (this.pwa.canInstall()) this.pwa.install();
    else this.installHelp.set(true);
  }
  abrirPerfil() {
    this.moreOpen.set(false);
    this.perfilOpen.set(true);
  }
  async lookup(value: string) {
    this.scanner.set(false);
    const a = this.s.resolver(value);
    if (a) await this.router.navigate(['/activo', a.id]);
    else this.s.notify('QR no registrado en el inventario.', 'error');
  }
  async salir() {
    this.moreOpen.set(false);
    this.perfilOpen.set(false);
    this.s.salir();
    await this.router.navigateByUrl('/login');
  }
}

export { AppComponent as App };
