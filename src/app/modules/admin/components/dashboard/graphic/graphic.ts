// src/app/dashboard/graphic/graphic.component.ts
import { Component, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GraphicService } from '../../../../../core/services/graphic.service';

@Component({
  selector: 'app-graphic',
  standalone: false,
  templateUrl: './graphic.html',
  styleUrls: ['./graphic.css']
})
export class GraphicComponent implements OnInit, OnDestroy {
  private graphicService = inject(GraphicService);
  private refreshInterval = 60000; // 1 minuto para gráfica
  private subscription: Subscription = new Subscription();
  
  // Exponer signals del servicio
  isLoading = this.graphicService.isLoading;
  hasError = this.graphicService.hasError;
  errorMessage = this.graphicService.errorMessage;
  chartData = this.graphicService.chartData;
  totalDocumentos = this.graphicService.totalDocumentos;
  promedioDiario = this.graphicService.promedioDiario;
  diaPico = this.graphicService.diaPico;
  lastUpdateTimeFormatted = this.graphicService.lastUpdateTimeFormatted;
  lastUpdateFullDate = this.graphicService.lastUpdateFullDate;
  updateAgoText = this.graphicService.updateAgoText;
  periodo = this.graphicService.periodo;
  
  // Signal computado para estado vacío
  showEmptyState = computed(() => {
    return !this.isLoading() && 
           !this.hasError() && 
           this.chartData().length === 0;
  });
  
  // Signal computado para estado de error con datos de ejemplo
  showErrorState = computed(() => {
    return this.hasError() && !this.isLoading();
  });

  // Efecto para programar el refresco al corte del día
  private scheduleEndOfDayRefresh = effect(() => {
    // Este efecto se ejecuta una vez al cargar el componente
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0); // Mañana a las 00:00:00
    
    const tiempoHastaManana = manana.getTime() - ahora.getTime();
    
    // Programar refresco para la medianoche
    const timeoutId = setTimeout(() => {
      this.graphicService.refresh();
      
      // Programar refresco diario recurrente
      setInterval(() => {
        this.graphicService.refresh();
      }, 24 * 60 * 60 * 1000); // Cada 24 horas
      
    }, tiempoHastaManana);
    
    // Cleanup del timeout cuando el componente se destruye
    return () => clearTimeout(timeoutId);
  }, { allowSignalWrites: false });

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /** ===============================
   *  CARGA INICIAL
   *  =============================== */
  private loadData(): void {
    this.graphicService.loadChartData();
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          // Solo recargar si no hay error
          if (!this.graphicService.hasError()) {
            this.graphicService.loadChartData();
          }
          return [];
        })
      ).subscribe()
    );
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshChart(): void {
    this.graphicService.refresh();
  }

  // Delegar métodos al servicio
  getBarHeight(cantidad: number | string): number {
    return this.graphicService.getBarHeight(cantidad);
  }

  getBarColor(cantidad: number | string): string {
    return this.graphicService.getBarColor(cantidad);
  }

  formatNumber(value: number): string {
    return this.graphicService.formatNumber(value);
  }

  formatDecimal(value: number): string {
    return this.graphicService.formatDecimal(value);
  }

  // Mantener por compatibilidad con el template
  getLastUpdateTime(): string {
    return this.lastUpdateTimeFormatted();
  }

  getUpdateAgo(): string {
    return this.updateAgoText();
  }

  getPeriodo(): string {
    return this.periodo();
  }

  getMaxDocumentCount(): number {
    return this.graphicService.maxDocumentCount();
  }
}