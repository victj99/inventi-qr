import {
  booleanAttribute,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

let instancias = 0;

/**
 * Campo de texto con panel de sugerencias propio. Reemplaza al `<datalist>`
 * nativo, que el navegador dibuja igual que su propio autocompletado (datos
 * guardados de formularios) y con el que los usuarios se confundían: aquí el
 * panel lleva encabezado con el origen de los datos («Ubicaciones registradas»),
 * estilo del sistema de diseño, contador, aviso de valor nuevo y teclado
 * (↑/↓, Enter, Escape). El input declara `autocomplete="off"` para que el
 * navegador no compita con su menú.
 */
@Component({
  selector: 'ui-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.css',
  host: {
    '(document:click)': 'clicFuera($event)',
    '(document:scroll)': 'reposicionar()',
    '(window:resize)': 'reposicionar()',
  },
})
export class AutocompleteComponent {
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  label = input.required<string>();
  suggestions = input.required<string[]>();
  /** Título del panel: dice de dónde salen las sugerencias. */
  header = input('Sugerencias');
  /** Palabra del aviso de valor nuevo («Se creará como …»). */
  nuevaEtiqueta = input('valor nuevo');
  placeholder = input('');
  name = input('');
  required = input(false, { transform: booleanAttribute });

  /** Valor del campo (two-way con el modelo del formulario). */
  value = model('');

  uid = `ac-${++instancias}`;
  abierta = signal(false);
  activa = signal(-1);
  pos = signal({ left: 0, top: 0, width: 0, arriba: false });

  private norm(s: string): string {
    return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** Sugerencias que contienen lo escrito (sin mayúsculas ni tildes); vacío muestra todas. */
  filtradas = computed(() => {
    const q = this.norm(this.value());
    if (!q) return this.suggestions();
    return this.suggestions().filter((s) => this.norm(s).includes(q));
  });

  /** Texto escrito que aún no existe en las sugerencias (para el aviso de valor nuevo). */
  nueva = computed(() => {
    const v = (this.value() ?? '').trim();
    if (!v) return '';
    return this.suggestions().some((s) => this.norm(s) === this.norm(v)) ? '' : v;
  });

  abrir() {
    if (!this.suggestions().length) return;
    this.activa.set(-1);
    if (!this.abierta()) this.abierta.set(true);
    this.reposicionar();
  }

  escribir(valor: string) {
    this.value.set(valor);
    this.activa.set(-1);
    if (!this.abierta() && this.suggestions().length) this.abierta.set(true);
    this.reposicionar();
  }

  elegir(opcion: string) {
    this.value.set(opcion);
    this.cerrar();
  }

  cerrar() {
    this.abierta.set(false);
    this.activa.set(-1);
  }

  teclas(evento: KeyboardEvent) {
    const lista = this.filtradas();
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (!this.abierta()) {
          this.abrir();
          return;
        }
        this.activa.set(Math.min(this.activa() + 1, lista.length - 1));
        this.verActiva();
        break;
      case 'ArrowUp':
        if (!this.abierta()) return;
        evento.preventDefault();
        this.activa.set(this.activa() <= 0 ? lista.length - 1 : this.activa() - 1);
        this.verActiva();
        break;
      case 'Enter':
        // Con opción marcada la elige; si no, cierra y deja que el formulario siga su curso.
        if (this.abierta() && this.activa() >= 0 && lista.length) {
          evento.preventDefault();
          this.elegir(lista[this.activa()]);
        } else {
          this.cerrar();
        }
        break;
      case 'Escape':
        if (this.abierta()) {
          evento.preventDefault();
          evento.stopPropagation(); // no cerrar un ui-modal contenedor
          this.cerrar();
        }
        break;
      case 'Tab':
        this.cerrar();
        break;
    }
  }

  clicFuera(evento: MouseEvent) {
    if (this.abierta() && !this.host.nativeElement.contains(evento.target as Node)) this.cerrar();
  }

  reposicionar() {
    if (!this.abierta()) return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const altoEstimado = Math.min(
      264,
      46 + Math.min(this.filtradas().length, 6) * 37 + (this.nueva() ? 31 : 0),
    );
    const espacioAbajo = window.innerHeight - rect.bottom;
    const arriba = espacioAbajo < altoEstimado + 16 && rect.top > altoEstimado + 16;
    this.pos.set({
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      top: Math.round(arriba ? rect.top - 4 : rect.bottom + 4),
      arriba,
    });
  }

  private verActiva() {
    const panel = this.host.nativeElement.querySelector('.ac-panel');
    panel?.querySelector(`[data-i="${this.activa()}"]`)?.scrollIntoView({ block: 'nearest' });
  }
}
