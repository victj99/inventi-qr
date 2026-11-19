import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  name = input('box');
  paths: Record<string, string> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    box: 'M3 6l9-4 9 4v12l-9 4-9-4z M3 6l9 4 9-4 M12 10v12 M7 4l10 4',
    scan: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M6 12h12 M8 8v8 M16 8v8',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    arrow: 'M5 12h14 M14 7l5 5-5 5',
    back: 'M19 12H5 M10 7l-5 5 5 5',
    check: 'M5 12l4 4L19 6',
    clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    wifi: 'M2 8a17 17 0 0 1 20 0 M5 12a12 12 0 0 1 14 0 M8 16a7 7 0 0 1 8 0 M12 20h.01',
    offline:
      'M2 2l20 20 M2 8a17 17 0 0 1 3-2 M9 4a17 17 0 0 1 13 4 M5 12a12 12 0 0 1 3-2 M13 9a12 12 0 0 1 6 3 M8 16a7 7 0 0 1 8 0 M12 20h.01',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
    upload: 'M12 21V9 M7 14l5-5 5 5 M4 3h16',
    laptop: 'M5 3h14v12H5z M2 19l3-4h14l3 4v2H2z',
    monitor: 'M3 3h18v14H3z M12 17v4 M7 21h10',
    printer: 'M6 9V3h12v6 M6 18H3V9h18v9h-3 M6 14h12v7H6z M17 12h.01',
    router: 'M3 13h18v8H3z M6 13V3 M18 13V6 M7 17h.01 M11 17h.01',
    reader: 'M7 2h10v20H7z M10 5h4 M10 9v6 M13 9v6 M10 18h4',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    warn: 'M12 3L1 21h22z M12 9v5 M12 17h.01',
    refresh: 'M20 7a9 9 0 1 0 1 9 M20 2v5h-5',
    camera: 'M8 5l1-3h6l1 3h5v16H3V5z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    close: 'M6 6l12 12 M18 6L6 18',
    play: 'M7 3l14 9-14 9z',
    help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    link: 'M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01',
    report: 'M6 2h9l5 5v15H6z M14 2v6h6 M9 13h7 M9 17h5',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    more: 'M4 7h16 M4 12h16 M4 17h10',
  };
}

export { IconComponent as Icon };
