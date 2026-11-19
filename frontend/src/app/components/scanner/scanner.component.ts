import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'qr-scanner',
  standalone: true,
  imports: [IconComponent, FormsModule],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.css',
})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  decoded = output<string>();
  dismissed = output<void>();
  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  running = signal(false);
  busy = signal(false);
  message = signal('');
  cameras = signal<{ id: string; label: string }[]>([]);
  cameraId = signal('');
  private reader?: Html5Qrcode;
  private alive = true;
  private handled = false;

  ngAfterViewInit() {
    this.dialog().nativeElement.showModal();
  }

  async start() {
    this.busy.set(true);
    this.message.set('');
    this.running.set(true);
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!this.alive) return;
      this.cameras.set(cameras);
      if (!cameras.length) throw Error('Sin cámara');
      if (!this.cameraId()) this.cameraId.set(cameras[0].id);
      this.reader ??= new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      this.handled = false;
      await this.reader.start(
        this.cameraId(),
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (!this.handled) {
            this.handled = true;
            this.decoded.emit(text);
          }
        },
        () => {},
      );
      if (!this.alive) {
        await this.reader.stop();
        return;
      }
    } catch {
      if (this.alive) {
        this.running.set(false);
        this.message.set('Sin acceso a la cámara. Revisa el permiso o carga una imagen QR.');
      }
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }

  async stop() {
    this.running.set(false);
    if (this.reader?.isScanning) {
      try {
        await this.reader.stop();
      } catch {}
    }
  }

  async changeCamera(id: string) {
    await this.stop();
    this.cameraId.set(id);
    await this.start();
  }

  async readImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.message.set('');
    try {
      await this.stop();
      this.reader ??= new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      const result = await this.reader.scanFile(file, false);
      if (this.alive) this.decoded.emit(result);
    } catch {
      this.message.set('QR no legible. Usa otra imagen.');
    } finally {
      if (this.alive) {
        this.busy.set(false);
        input.value = '';
      }
    }
  }

  ngOnDestroy() {
    this.alive = false;
    if (this.reader?.isScanning) void this.reader.stop().catch(() => {});
  }
}

export { ScannerComponent as Scanner };
