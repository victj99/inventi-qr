import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { humano, nombreActivo, tipoIcon } from '../../core/models/util';
import { can } from '../../core/models/permisos';
import { qrDataUrl } from '../../core/models/qr';
import { PRIORIDAD_MAX, prioridadRenovacion } from '../../core/models/domain';

const hoy = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, IconComponent, FormsModule],
  templateUrl: './asset-detail.component.html',
  styleUrls: ['./asset-detail.component.css'],
})
export class AssetDetailComponent {
  s = inject(StoreService);
  router = inject(Router);
  nombre = nombreActivo;
  icon = tipoIcon;
  humano = humano;
  prioridadMax = PRIORIDAD_MAX;
  private params = toSignal(inject(ActivatedRoute).paramMap);
  asset = computed(() => this.s.asset(this.params()?.get('id') || ''));
  qr = signal('');
  asignando = signal(false);
  registroForm = signal(false);
  responsable = '';
  nuevo: { tipo: 'falla' | 'mantenimiento'; descripcion: string; tecnico: string; costo: string; proxima: string } = {
    tipo: 'falla', descripcion: '', tecnico: '', costo: '', proxima: '',
  };
  registros = computed(() => {
    const a = this.asset();
    return a ? this.s.registrosDe(a.id) : [];
  });
  historial = computed(() => {
    const a = this.asset();
    return a ? this.s.historial().filter((h) => h.activoId === a.id) : [];
  });
  prioridad = computed(() => {
    const a = this.asset();
    return a ? prioridadRenovacion(a, this.s.registros(), hoy()) : { score: 0, nivel: 'baja' as const, factores: [] };
  });
  puede(accion: string) { return can(this.s.usuario()?.rol, accion); }

  constructor() {
    effect(() => {
      const a = this.asset();
      if (a) void qrDataUrl(a).then((url) => this.qr.set(url));
    });
  }

  private async run(fn: () => Promise<unknown>) {
    try { await fn(); } catch (e) { this.s.notify((e as Error).message, 'error'); }
  }
  asignar() {
    const a = this.asset();
    if (!a) return;
    void this.run(async () => { await this.s.asignar(a.id, this.responsable.trim()); this.asignando.set(false); this.responsable = ''; });
  }
  devolver() {
    const a = this.asset();
    if (a) void this.run(() => this.s.devolver(a.id));
  }
  baja() {
    const a = this.asset();
    if (a && confirm('¿Dar de baja ' + a.codigo + '? El historial se conserva.')) {
      void this.run(() => this.s.darDeBaja(a.id));
    }
  }
  registrar() {
    const a = this.asset();
    if (!a) return;
    void this.run(async () => {
      await this.s.registrar({
        activoId: a.id, tipo: this.nuevo.tipo, descripcion: this.nuevo.descripcion.trim(),
        tecnico: this.nuevo.tecnico, costo: this.nuevo.costo || null, proxima: this.nuevo.proxima || null,
      });
      this.registroForm.set(false);
      this.nuevo = { tipo: 'falla', descripcion: '', tecnico: '', costo: '', proxima: '' };
    });
  }
  cerrar(id: string) {
    void this.run(() => this.s.cerrarRegistro(id));
  }
}
