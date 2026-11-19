import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  afterNextRender,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  standalone: true,
  template: `
    <div class="chart-container" [style.height]="height">
      <canvas #canvasRef></canvas>
    </div>
  `,
  styles: [
    `
      .chart-container {
        position: relative;
        width: 100%;
      }
    `,
  ],
})
export class BaseChartComponent implements OnChanges, OnDestroy {
  @ViewChild('canvasRef') canvasRef?: ElementRef<HTMLCanvasElement>;
  @Input({ required: true }) type!: ChartConfiguration['type'];
  @Input({ required: true }) data!: any;
  @Input() options?: any;
  @Input() height: string = '240px';

  private chart?: Chart;
  private rendered = false;

  constructor() {
    afterNextRender(() => {
      this.rendered = true;
      this.renderChart();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && (changes['data'] || changes['options'])) {
      this.chart.data = this.data;
      if (this.options) this.chart.options = this.options;
      this.chart.update();
    } else if (this.rendered && !this.chart) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    if (!this.canvasRef?.nativeElement) return;
    this.chart?.destroy();
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              font: {
                family: 'Manrope Variable, sans-serif',
                size: 12,
              },
              boxWidth: 12,
              padding: 12,
            },
          },
          tooltip: {
            titleFont: { family: 'Manrope Variable, sans-serif', size: 12 },
            bodyFont: { family: 'Manrope Variable, sans-serif', size: 11 },
            padding: 8,
            cornerRadius: 8,
          },
        },
        ...this.options,
      },
    });
  }
}
