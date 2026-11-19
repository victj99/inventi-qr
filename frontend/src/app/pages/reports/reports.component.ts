import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { IconComponent } from '../../components/icon/icon.component';
import { BaseChartComponent } from '../../components/charts/base-chart.component';
import { descargarReporte } from '../../core/services/api.service';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [IconComponent, BaseChartComponent, DecimalPipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReportsComponent {
  s = inject(StoreService);
  busy = '';

  reportes = [
    {
      ruta: '/reportes/inventario.xlsx',
      nombre: 'inventario.xlsx',
      titulo: 'Inventario completo',
      desc: 'Catálogo de todos los activos, ubicación, responsable, serie y estado.',
      formato: 'Excel (.xlsx)',
      icono: 'box',
      tipo: 'inventario',
    },
    {
      ruta: '/reportes/registros.xlsx',
      nombre: 'fallas-mantenimientos.xlsx',
      titulo: 'Fallas y mantenimientos',
      desc: 'Historial de incidencias, técnicos asignados, costos y próximas revisiones.',
      formato: 'Excel (.xlsx)',
      icono: 'warn',
      tipo: 'registros',
    },
    {
      ruta: '/reportes/garantias.xlsx',
      nombre: 'garantias.xlsx',
      titulo: 'Estado de garantías',
      desc: 'Equipos agrupados por vigencia, vencimientos próximos y alertas.',
      formato: 'Excel (.xlsx)',
      icono: 'clock',
      tipo: 'garantias',
    },
  ];

  // --- Analíticas Visuales (BI) ---

  // 1. Métricas Generales
  totalInversionMantenimiento = computed(() => {
    return this.s
      .registros()
      .filter((r) => r.costo)
      .reduce((sum, r) => sum + Number(r.costo || 0), 0);
  });

  totalFallas = computed(() => {
    return this.s.registros().filter((r) => r.tipo === 'falla').length;
  });

  porcentajeGarantiaVigente = computed(() => {
    const total = this.s.activos().length;
    if (!total) return 0;
    const now = new Date().toISOString().slice(0, 10);
    const vigentes = this.s
      .activos()
      .filter((a) => a.garantiaHasta && a.garantiaHasta > now).length;
    return Math.round((vigentes / total) * 100);
  });

  garantiasPorVencer = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return this.s
      .activos()
      .filter((a) => a.garantiaHasta && a.garantiaHasta >= today && a.garantiaHasta <= in30).length;
  });

  // 2. Gráfico de Garantías (Doughnut)
  garantiasChartData = computed<ChartConfiguration['data']>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    let vigentes = 0;
    let porVencer = 0;
    let vencidas = 0;
    let sinFecha = 0;

    for (const a of this.s.activos()) {
      if (!a.garantiaHasta) {
        sinFecha++;
      } else if (a.garantiaHasta < today) {
        vencidas++;
      } else if (a.garantiaHasta <= in30) {
        porVencer++;
      } else {
        vigentes++;
      }
    }

    return {
      labels: ['Vigente (> 30 días)', 'Por vencer (≤ 30 días)', 'Vencida', 'Sin fecha'],
      datasets: [
        {
          data: [vigentes, porVencer, vencidas, sinFecha],
          backgroundColor: ['#197a4e', '#966000', '#b3263a', '#8194a6'],
          hoverOffset: 6,
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  });

  garantiasChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} equipos`,
        },
      },
    },
    cutout: '60%',
  };

  // 3. Gráfico de Costos de Mantenimiento por Tipo de Equipo (Bar Chart)
  costosChartData = computed<ChartConfiguration['data']>(() => {
    const tipoMap = new Map<string, number>();
    const activosMap = new Map(this.s.activos().map((a) => [a.id, a.tipo]));

    for (const r of this.s.registros()) {
      if (r.costo) {
        const tipo = activosMap.get(r.activoId) || 'Otros';
        tipoMap.set(tipo, (tipoMap.get(tipo) || 0) + Number(r.costo));
      }
    }

    // Si no hay costos en los registros todavía, mostrar tipos con 0 para visualización
    if (tipoMap.size === 0) {
      for (const a of this.s.activos()) {
        if (!tipoMap.has(a.tipo)) tipoMap.set(a.tipo, 0);
      }
    }

    const sorted = [...tipoMap.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          label: 'Gasto acumulado (S/)',
          data: sorted.map(([, v]) => v),
          backgroundColor: '#2f66d0',
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    };
  });

  costosChartOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Inversión: S/ ${Number(ctx.raw).toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Gasto en Soles (S/)' },
        grid: { color: '#edf2f7' },
      },
      x: { grid: { display: false } },
    },
  };

  async descargar(r: { ruta: string; nombre: string }) {
    this.busy = r.ruta;
    try {
      await descargarReporte(r.ruta, r.nombre);
    } catch (e) {
      this.s.notify((e as Error).message, 'error');
    } finally {
      this.busy = '';
    }
  }
}
