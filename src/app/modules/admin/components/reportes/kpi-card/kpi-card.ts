import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface KpiCardConfig {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: number;
  trendUp?: boolean;
  trendLabel?: string;
  showTrend?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

@Component({
  selector: 'app-kpi-card',
  standalone: false,
  templateUrl: './kpi-card.html',
})
export class KpiCardComponent {
  @Input() config: KpiCardConfig = {
    title: '',
    value: '',
    subtitle: '',
    icon: 'fas fa-chart-line',
    iconBgColor: 'bg-blue-100',
    iconTextColor: 'text-blue-600',
    trend: 0,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true,
    loading: false,
  };

  @Output() cardClick = new EventEmitter<void>();

  onCardClick() {
    if (this.config.onClick) {
      this.config.onClick();
    }
    this.cardClick.emit();
  }

  @Input() set title(value: string) {
    this.config.title = value;
  }

  @Input() set value(val: string | number) {
    this.config.value = val;
  }

  @Input() set subtitle(value: string) {
    this.config.subtitle = value;
  }

  @Input() set icon(value: string) {
    this.config.icon = value;
  }

  @Input() set iconBgColor(value: string) {
    this.config.iconBgColor = value;
  }

  @Input() set iconTextColor(value: string) {
    this.config.iconTextColor = value;
  }

  @Input() set trend(value: number) {
    this.config.trend = value;
  }

  @Input() set trendUp(value: boolean) {
    this.config.trendUp = value;
  }

  @Input() set trendLabel(value: string) {
    this.config.trendLabel = value;
  }

  @Input() set showTrend(value: boolean) {
    this.config.showTrend = value;
  }

  @Input() set loading(value: boolean) {
    this.config.loading = value;
  }

  @Input() clickable: boolean = false;
  @Input() customClass: string = '';

  get trendColor(): string {
    if (!this.config.trend) return 'text-gray-500';
    return this.config.trendUp ? 'text-green-600' : 'text-red-600';
  }

  get trendIcon(): string {
    if (!this.config.trend) return 'fas fa-minus';
    return this.config.trendUp ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  }

  handleClick(): void {
    if (this.config.onClick && this.clickable) {
      this.config.onClick();
    }
  }
}