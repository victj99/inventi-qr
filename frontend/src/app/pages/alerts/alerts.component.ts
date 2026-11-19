import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { nombreActivo } from '../../core/models/util';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
})
export class AlertsComponent {
  s = inject(StoreService);
  nombre = nombreActivo;
  filter = signal('all');
  tabs = [
    { value: 'all', label: 'Por atender' },
    { value: 'red', label: 'Prioritaria' },
    { value: 'amber', label: 'Revisar pronto' },
    { value: 'unknown', label: 'Datos incompletos' },
  ];
  list = computed(() =>
    [...this.s.alertas()].sort(
      (a, b) =>
        ['red', 'amber', 'unknown'].indexOf(this.s.atencion(a).level) -
        ['red', 'amber', 'unknown'].indexOf(this.s.atencion(b).level),
    ),
  );
  filtered = computed(() =>
    this.list().filter(
      (a) => this.filter() === 'all' || this.s.atencion(a).level === this.filter(),
    ),
  );
  count(level: string) {
    return this.list().filter(
      (a) => level === 'all' || this.s.atencion(a).level === level,
    ).length;
  }
}
