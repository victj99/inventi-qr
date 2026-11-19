import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { AutocompleteComponent } from '../../components/autocomplete/autocomplete.component';
import { Activo, ASIGNACIONES, ESTADOS_OP } from '../../core/models/tipos';
import { humano } from '../../core/models/util';

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent, AutocompleteComponent],
  templateUrl: './asset-form.component.html',
  styleUrls: ['./asset-form.component.css'],
})
export class AssetFormComponent {
  s = inject(StoreService);
  router = inject(Router);
  private params = toSignal(inject(ActivatedRoute).paramMap);
  editando = computed(() => !!this.params()?.get('id'));
  estadosOp = ESTADOS_OP;
  asignaciones = ASIGNACIONES;
  humano = humano;
  busy = signal(false);
  error = signal('');
  model: Partial<Activo> & { tipo: string; ubicacion: string } = {
    codigo: '', tipo: 'Laptop', marca: '', modelo: '', serie: '',
    compra: '', garantiaHasta: '', ubicacion: '', responsable: '',
    estadoOp: 'operativo', asignacion: 'disponible',
  };
  ubicaciones = computed(() => [...new Set(this.s.activos().map((a) => a.ubicacion))]);
  tipos = computed(() => {
    const base = ['Laptop', 'Monitor', 'Impresora', 'Router', 'Lector de mano', 'Periférico'];
    return [...new Set([...base, ...this.s.activos().map((a) => a.tipo)])];
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    if (id) {
      const a = this.s.asset(id);
      if (a) this.model = { ...a, compra: a.compra ?? '', garantiaHasta: a.garantiaHasta ?? '', serie: a.serie ?? '' };
    }
  }

  async guardar() {
    this.busy.set(true);
    this.error.set('');
    try {
      const id = this.params()?.get('id');
      if (id) {
        await this.s.editarActivo(id, this.model as Record<string, unknown>);
        await this.router.navigate(['/activo', id]);
      } else {
        const a = await this.s.crearActivo(this.model);
        await this.router.navigate(['/activo', a.id]);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
