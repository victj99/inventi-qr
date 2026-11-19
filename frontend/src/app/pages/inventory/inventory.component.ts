import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { humano, nombreActivo, tipoIcon, leerCSV } from '../../core/models/util';
import { can } from '../../core/models/permisos';
import { Activo, ESTADOS_OP } from '../../core/models/tipos';
import { descargarReporte } from '../../core/services/api.service';

@Component({
  selector: 'app-inventory',
  imports: [RouterLink, FormsModule, IconComponent],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css',
})
export class InventoryComponent {
  s = inject(StoreService);
  nombre = nombreActivo;
  icon = tipoIcon;
  humano = humano;
  estadosOp = ESTADOS_OP;
  search = signal('');
  ubicacion = signal('');
  tipo = signal('');
  estado = signal('');
  level = signal('');

  puede(accion: string) {
    return can(this.s.usuario()?.rol, accion);
  }

  ubicaciones = computed(() => [...new Set(this.s.activos().map((a) => a.ubicacion))]);
  tipos = computed(() => [...new Set(this.s.activos().map((a) => a.tipo))]);

  filtered = computed(() =>
    this.s
      .activos()
      .filter(
        (a) =>
          (!this.ubicacion() || a.ubicacion === this.ubicacion()) &&
          (!this.tipo() || a.tipo === this.tipo()) &&
          (!this.estado() || a.estadoOp === this.estado()) &&
          (!this.level() || this.s.atencion(a).level === this.level()) &&
          [nombreActivo(a), a.codigo, a.responsable, a.serie]
            .join(' ')
            .toLocaleLowerCase()
            .includes(this.search().toLocaleLowerCase()),
      ),
  );

  clear() {
    this.search.set('');
    this.ubicacion.set('');
    this.tipo.set('');
    this.estado.set('');
    this.level.set('');
  }

  async exportarXlsx() {
    try {
      await descargarReporte('/reportes/inventario.xlsx', 'inventario.xlsx');
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    }
  }

  async importar(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const filas = leerCSV(await file.text()) as Partial<Activo>[];
      const r = await this.s.analizarImport(filas);
      if (r.duplicados.length) {
        this.s.notify(
          `${r.duplicados.length} duplicados omitidos; ${r.nuevos.length} por importar.`,
          'info',
        );
      }
      if (r.nuevos.length) await this.s.importar(r.nuevos);
      else this.s.notify('No hay filas nuevas para importar.', 'info');
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    } finally {
      input.value = '';
    }
  }
}

export { InventoryComponent as Inventory };
