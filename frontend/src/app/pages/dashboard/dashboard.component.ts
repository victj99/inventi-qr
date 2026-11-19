import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { BaseChartComponent } from '../../components/charts/base-chart.component';
import { humano, nombreActivo, tipoIcon } from '../../core/models/util';
import { LINEA_BASE_MIN, PRIORIDAD_MAX, prioridadRenovacion } from '../../core/models/domain';
import { can } from '../../core/models/permisos';
import { ChartConfiguration } from 'chart.js';

const hoy = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IconComponent, DatePipe, BaseChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  s = inject(StoreService);
  nombre = nombreActivo;
  icon = tipoIcon;
  humano = humano;
  lineaBase = LINEA_BASE_MIN;
  prioridadMax = PRIORIDAD_MAX;
  fechaTexto = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  get puedeAuditar() {
    return can(this.s.usuario()?.rol, 'auditar');
  }
  get puedePanel() {
    return can(this.s.usuario()?.rol, 'panel');
  }

  asignados = computed(
    () => this.s.activos().filter((a) => a.asignacion === 'asignado').length,
  );
  disponibles = computed(
    () =>
      this.s
        .activos()
        .filter((a) => a.asignacion !== 'asignado' && a.estadoOp !== 'de baja').length,
  );
  alerts = computed(() =>
    this.s.activos().filter((a) => ['red', 'amber'].includes(this.s.atencion(a).level)),
  );
  alertasAltas = computed(
    () => this.s.activos().filter((a) => this.s.atencion(a).level === 'red').length,
  );
  alertasMedias = computed(
    () => this.s.activos().filter((a) => this.s.atencion(a).level === 'amber').length,
  );
  cerradas = computed(() => this.s.auditorias().filter((a) => a.estado === 'cerrada').length);
  ultimaAuditoria = computed(
    () =>
      this.s
        .auditorias()
        .filter((a) => a.estado === 'cerrada' && a.fin)
        .sort((a, b) => Date.parse(b.fin!) - Date.parse(a.fin!))[0],
  );

  ubicaciones = computed(() => {
    const m = new Map<string, number>();
    for (const a of this.s.activos()) m.set(a.ubicacion, (m.get(a.ubicacion) ?? 0) + 1);
    return [...m.entries()].map(([nombre, total]) => ({ nombre, total }));
  });
  maxUbic = computed(() => Math.max(1, ...this.ubicaciones().map((u) => u.total)));

  estados = computed(() => {
    const m = new Map<string, number>();
    for (const a of this.s.activos()) m.set(a.estadoOp, (m.get(a.estadoOp) ?? 0) + 1);
    return [...m.entries()].map(([nombre, total]) => ({ nombre, total }));
  });

  tasaOperatividad = computed(() => {
    const total = this.s.activos().length;
    if (!total) return 0;
    const op = this.s.activos().filter((a) => a.estadoOp === 'operativo').length;
    return Math.round((op / total) * 100);
  });

  tonoEstado(estado: string) {
    if (estado === 'averiado') return 'red';
    if (estado === 'en mantenimiento') return 'amber';
    if (estado === 'de baja') return 'unknown';
    return 'green';
  }

  // --- Gráficos Chart.js ---

  // 1. Dona de Estados Operativos
  estadoChartData = computed<ChartConfiguration['data']>(() => {
    const counts = { operativo: 0, 'en mantenimiento': 0, averiado: 0, 'de baja': 0 };
    for (const a of this.s.activos()) {
      if (a.estadoOp in counts) counts[a.estadoOp as keyof typeof counts]++;
    }
    return {
      labels: ['Operativo', 'En mantenimiento', 'Averiado', 'De baja'],
      datasets: [
        {
          data: [
            counts.operativo,
            counts['en mantenimiento'],
            counts.averiado,
            counts['de baja'],
          ],
          backgroundColor: ['#197a4e', '#966000', '#b3263a', '#8194a6'],
          hoverOffset: 6,
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  });

  estadoChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} equipos`,
        },
      },
    },
    cutout: '62%',
  };

  // 2. Barras de Activos por Categoría
  tipoChartData = computed<ChartConfiguration['data']>(() => {
    const m = new Map<string, number>();
    for (const a of this.s.activos()) m.set(a.tipo, (m.get(a.tipo) ?? 0) + 1);
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          label: 'Cantidad de equipos',
          data: sorted.map(([, v]) => v),
          backgroundColor: '#0b8b96',
          borderRadius: 6,
          maxBarThickness: 32,
        },
      ],
    };
  });

  tipoChartOptions: ChartConfiguration['options'] = {
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw} equipos registrados`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: '#edf2f7' },
      },
      y: { grid: { display: false } },
    },
  };

  // 3. Tiempos de Auditoría vs Objetivo (-60 %)
  tiempos = computed(() => {
    return this.s
      .auditorias()
      .filter((a) => a.estado === 'cerrada' && a.fin)
      .map((a) => ({
        id: a.id,
        ubicacion: a.ubicacion,
        inicio: a.inicio,
        fin: a.fin,
        minutos: Math.max(1, Math.round((Date.parse(a.fin!) - Date.parse(a.inicio)) / 60000)),
        lecturas: (a.lecturas ?? []).length,
      }))
      .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  });

  promedioMinutos = computed(() => {
    const t = this.tiempos();
    if (!t.length) return 0;
    const sum = t.reduce((acc, curr) => acc + curr.minutos, 0);
    return Math.round((sum / t.length) * 10) / 10;
  });

  reduccionPorcentaje = computed(() => {
    const prom = this.promedioMinutos();
    if (!prom) return 0;
    // La auditoría manual en Excel es la referencia interna; nunca mostrar negativos.
    return Math.max(0, Math.round(((LINEA_BASE_MIN - prom) / LINEA_BASE_MIN) * 100));
  });
  sobreLineaBase = computed(() => this.promedioMinutos() > LINEA_BASE_MIN);

  // Ahorro por auditoría frente a la línea base; nunca imprime negativos dobles («−−15 min»).
  ahorro(minutos: number) {
    const diferencia = this.lineaBase - minutos;
    if (diferencia > 0) return `−${diferencia} min ahorrados`;
    if (diferencia === 0) return 'Sin ahorro';
    return `+${-diferencia} min sobre la línea base`;
  }

  tiemposChartData = computed<ChartConfiguration['data']>(() => {
    const t = this.tiempos();
    const labels = ['Línea base (manual)', ...t.map((x) => `${x.ubicacion} (QR)`)];
    const data = [LINEA_BASE_MIN, ...t.map((x) => x.minutos)];
    const bgColors = [
      'rgba(179, 38, 58, 0.85)', // Rojo para manual
      ...t.map(() => 'rgba(11, 139, 150, 0.85)'), // Teal para QR
    ];
    return {
      labels,
      datasets: [
        {
          label: 'Duración (minutos)',
          data,
          backgroundColor: bgColors,
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    };
  });

  tiemposChartOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Duración: ${ctx.raw} minutos`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Minutos de auditoría' },
        grid: { color: '#edf2f7' },
      },
      x: { grid: { display: false } },
    },
  };

  prioridad = computed(() =>
    this.s
      .activos()
      .filter((a) => a.estadoOp !== 'de baja')
      .map((a) => ({
        activoId: a.id,
        codigo: a.codigo,
        ...prioridadRenovacion(a, this.s.registros(), hoy()),
      }))
      .sort((a, b) => b.score - a.score),
  );
}

export { DashboardComponent as Dashboard };
