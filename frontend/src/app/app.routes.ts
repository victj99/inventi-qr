import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { AssetFormComponent } from './pages/asset-form/asset-form.component';
import { AssetDetailComponent } from './pages/asset-detail/asset-detail.component';
import { AuditComponent } from './pages/audit/audit.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { EtiquetasComponent } from './pages/etiquetas/etiquetas.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { authGuard, loginGuard, permisoGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
    title: 'Iniciar sesión · InvenTI QR',
  },
  {
    path: 'inicio',
    component: DashboardComponent,
    canActivate: [authGuard],
    title: 'Inicio · InvenTI QR',
  },
  {
    path: 'inventario',
    component: InventoryComponent,
    canActivate: [authGuard],
    title: 'Inventario · InvenTI QR',
  },
  {
    path: 'activo-nuevo',
    component: AssetFormComponent,
    canActivate: [authGuard],
    title: 'Nuevo activo · InvenTI QR',
  },
  {
    path: 'activo-editar/:id',
    component: AssetFormComponent,
    canActivate: [authGuard],
    title: 'Editar activo · InvenTI QR',
  },
  {
    path: 'activo/:id',
    component: AssetDetailComponent,
    canActivate: [authGuard],
    title: 'Ficha del equipo · InvenTI QR',
  },
  {
    path: 'auditoria',
    component: AuditComponent,
    canActivate: [authGuard, permisoGuard('auditar')],
    title: 'Auditoría · InvenTI QR',
  },
  {
    path: 'alertas',
    component: AlertsComponent,
    canActivate: [authGuard],
    title: 'Alertas · InvenTI QR',
  },
  {
    path: 'etiquetas',
    component: EtiquetasComponent,
    canActivate: [authGuard, permisoGuard('etiquetas')],
    title: 'Etiquetas QR · InvenTI QR',
  },
  {
    path: 'reportes',
    component: ReportsComponent,
    canActivate: [authGuard],
    title: 'Reportes · InvenTI QR',
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, permisoGuard('usuarios')],
    title: 'Usuarios · InvenTI QR',
  },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];
