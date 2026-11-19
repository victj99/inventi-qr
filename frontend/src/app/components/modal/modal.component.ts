import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'ui-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent implements AfterViewInit {
  labelledBy = input.required<string>();
  /** Hoja inferior a pantalla completa (móvil) en lugar de tarjeta centrada. */
  sheet = input(false);
  /** Cierra al tocar fuera del diálogo. */
  dismissOnBackdrop = input(false);
  dismissed = output<void>();
  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ngAfterViewInit() {
    this.dialog().nativeElement.showModal();
  }

  backdrop(event: MouseEvent) {
    if (!this.dismissOnBackdrop()) return;
    // El <dialog> es la capa a pantalla completa; el cuadro visible es .modal-box.
    const box = this.dialog().nativeElement.querySelector<HTMLElement>('.modal-box');
    const rect = (box ?? this.dialog().nativeElement).getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) this.dismissed.emit();
  }
}

export { ModalComponent as Modal };
