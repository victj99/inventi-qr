import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  s = inject(StoreService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  email = '';
  password = '';
  busy = signal(false);
  error = signal('');
  private readonly demoPassword = 'InvenTI2026!';
  demo = [
    { rol: 'Administrador', detalle: 'Acceso total', email: 'admin@inventi.pe', icon: 'grid' },
    { rol: 'Técnico', detalle: 'Operación y auditoría', email: 'tecnico@inventi.pe', icon: 'camera' },
    { rol: 'Colaborador', detalle: 'Consulta y fallas', email: 'colaborador@inventi.pe', icon: 'box' },
    { rol: 'Consulta', detalle: 'Solo lectura', email: 'consulta@inventi.pe', icon: 'search' },
  ];

  async entrar() {
    await this.ingresar(this.email.trim(), this.password);
  }

  async entrarDemo(email: string) {
    await this.ingresar(email, this.demoPassword);
  }

  private async ingresar(email: string, password: string) {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.s.login(email, password);
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next && next.startsWith('/') ? next : '/inicio');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}

export { LoginComponent as Login };
