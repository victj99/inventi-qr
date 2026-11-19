import { computed, inject, Injectable, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private sw = inject(SwUpdate);
  /** El service worker solo existe en compilaciones de producción. */
  readonly enabled = this.sw.isEnabled;
  readonly cached = signal(false);
  readonly failed = signal(false);
  readonly update = signal(false);
  readonly installed = signal(matchMedia('(display-mode: standalone)').matches);
  readonly installEvent = signal<InstallEvent | null>(null);
  readonly canInstall = computed(() => !!this.installEvent() && !this.installed());
  readonly offlineTone = computed(() =>
    !this.enabled || this.failed() ? 'idle' : this.cached() ? 'green' : 'unknown',
  );
  readonly offlineLabel = computed(() => {
    if (!this.enabled) return 'Modo offline no disponible en desarrollo';
    if (this.cached()) return 'Modo offline listo';
    if (this.failed()) return 'Modo offline no disponible';
    return 'Preparando modo offline…';
  });

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvent.set(e as InstallEvent);
    });
    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.installEvent.set(null);
    });
    if (this.sw.isEnabled) {
      this.sw.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') this.update.set(true);
      });
      // Si la instalación del service worker no termina, no dejamos el aviso en «preparando».
      const timer = setTimeout(() => {
        if (!this.cached()) this.failed.set(true);
      }, 10000);
      void navigator.serviceWorker.ready.then(async (registration) => {
        // A ready worker has completed installation of the prefetched application resources.
        if (registration.active) {
          this.cached.set(true);
          this.failed.set(false);
          clearTimeout(timer);
        }
      });
    }
  }

  async install() {
    const event = this.installEvent();
    if (event) {
      await event.prompt();
      await event.userChoice;
      this.installEvent.set(null);
    }
  }

  reload() {
    location.reload();
  }
}

export { PwaService as Pwa };
