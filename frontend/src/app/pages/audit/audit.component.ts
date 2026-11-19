import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { ScannerComponent } from '../../components/scanner/scanner.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { humano, nombreActivo, tipoIcon } from '../../core/models/util';
import { descargarReporte } from '../../core/services/api.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    IconComponent,
    ScannerComponent,
    ModalComponent,
  ],
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.css'],
})
export class AuditComponent {
  s = inject(StoreService);
  nombre = nombreActivo;
  icon = tipoIcon;
  humano = humano;
  scanner = signal(false);
  confirmandoDescarte = signal(false);
  code = '';
  reviewed = false;
  ubicacion = signal('');
  ubicaciones = computed(() => [
    ...new Set(
      this.s
        .activos()
        .filter((a) => a.estadoOp !== 'de baja')
        .map((a) => a.ubicacion),
    ),
  ]);
  esperadosPreview = computed(() =>
    this.s
      .activos()
      .filter((a) => a.ubicacion === this.ubicacion() && a.estadoOp !== 'de baja'),
  );
  esperados = computed(() => {
    const aud = this.s.auditoria();
    return aud ? this.s.activos().filter((a) => aud.esperados.includes(a.id)) : [];
  });
  lectura(id: string) {
    return (this.s.auditoria()?.lecturas ?? []).find((r) => r.activoId === id);
  }
  pendientes = computed(() => this.esperados().filter((a) => !this.lectura(a.id)));

  async iniciar() {
    try {
      await this.s.iniciarAuditoria(this.ubicacion());
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    }
  }
  async manual() {
    await this.s.scan(this.code);
    this.code = '';
  }
  async scanned(value: string) {
    this.scanner.set(false);
    await this.s.scan(value, 'Cámara');
  }
  async pdf(id: string, ubicacion: string) {
    try {
      await descargarReporte(
        '/reportes/auditoria-' + id + '.pdf',
        'auditoria-' + ubicacion + '.pdf',
      );
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    }
  }
  async confirmarDescarte() {
    this.confirmandoDescarte.set(false);
    await this.s.reiniciarAuditoria();
  }
}
