import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { nombreActivo } from '../../core/models/util';
import { qrDataUrl } from '../../core/models/qr';
import { Activo } from '../../core/models/tipos';

interface Etiqueta {
  a: Activo;
  qr: string;
}

@Component({
  selector: 'app-etiquetas',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './etiquetas.component.html',
  styleUrls: ['./etiquetas.component.css'],
})
export class EtiquetasComponent {
  s = inject(StoreService);
  nombre = nombreActivo;
  ubicacion = signal('');
  cargando = signal(false);
  etiquetas = signal<Etiqueta[]>([]);
  ubicaciones = computed(() => [...new Set(this.s.activos().map((a) => a.ubicacion))]);
  private filtrados = computed(() =>
    this.s
      .activos()
      .filter(
        (a) =>
          a.estadoOp !== 'de baja' &&
          (!this.ubicacion() || a.ubicacion === this.ubicacion()),
      ),
  );

  constructor() {
    effect(() => {
      this.filtrados();
      void this.generar();
    });
  }

  private async generar() {
    this.cargando.set(true);
    const list = this.filtrados();
    const out: Etiqueta[] = [];
    for (const a of list) out.push({ a, qr: await qrDataUrl(a, 140) });
    this.etiquetas.set(out);
    this.cargando.set(false);
  }
  imprimir() {
    window.print();
  }
}
