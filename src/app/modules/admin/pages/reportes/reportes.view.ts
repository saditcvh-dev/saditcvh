import { Component } from '@angular/core';
import { KpiCardConfig } from '../../components/reportes/kpi-card/kpi-card';


@Component({
  standalone: false,
  templateUrl: './reportes.view.html',
})
export class ReportesView {

  expedientesKpi: KpiCardConfig = {
    title: 'Expedientes procesados',
    value: '20,400',
    icon: 'fas fa-archive',
    iconBgColor: 'bg-blue-100',
    iconTextColor: 'text-blue-600',
    trend: 12.5,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true
  };

  paginasKpi: KpiCardConfig = {
    title: 'Páginas digitalizadas',
    value: '9.65M',
    icon: 'fas fa-file-pdf',
    iconBgColor: 'bg-green-100',
    iconTextColor: 'text-green-600',
    trend: 8.3,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true
  };

  ocrKpi: KpiCardConfig = {
    title: 'Precisión OCR promedio',
    value: '94.2%',
    icon: 'fas fa-font',
    iconBgColor: 'bg-purple-100',
    iconTextColor: 'text-purple-600',
    trend: 1.8,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true
  };

  velocidadKpi: KpiCardConfig = {
    title: 'Velocidad promedio',
    value: '1,245',
    icon: 'fas fa-tachometer-alt',
    iconBgColor: 'bg-orange-100',
    iconTextColor: 'text-orange-600',
    trend: 2.1,
    trendUp: false,
    trendLabel: 'páginas/hora',
    showTrend: true
  };
}