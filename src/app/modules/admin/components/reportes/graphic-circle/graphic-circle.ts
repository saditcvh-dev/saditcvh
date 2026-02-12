// src/app/dashboard/graphic-circle/graphic-circle.component.ts
import { Component, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GraphicCircleService } from '../../../../../core/services/graphic-circle.service';

@Component({
  selector: 'app-graphic-circle',
  standalone: false,
  templateUrl: './graphic-circle.html',
  styleUrls: ['./graphic-circle.css'],
})
export class GraphicCircle implements OnInit, OnDestroy {
  private graphicCircleService = inject(GraphicCircleService);
  private refreshInterval = 60000; // 1 minuto
  private subscription: Subscription = new Subscription();
  
  // Exponer signals del servicio
  isLoading = this.graphicCircleService.isLoading;
  hasError = this.graphicCircleService.hasError;
  errorMessage = this.graphicCircleService.errorMessage;
  tiposData = this.graphicCircleService.tiposData;
  totalDocumentos = this.graphicCircleService.totalDocumentos;
  lastUpdateTimeFormatted = this.graphicCircleService.lastUpdateTimeFormatted;
  lastUpdateFullDate = this.graphicCircleService.lastUpdateFullDate;
  updateAgoText = this.graphicCircleService.updateAgoText;
  apiResponse = this.graphicCircleService.apiResponse;
  hasTwoTypes = this.graphicCircleService.hasTwoTypes;
  
  // Signal computado para el total a mostrar
  totalDisplay = computed(() => {
    return this.graphicCircleService.getTotalDisplay();
  });
  
  // Signal computado para estado vacío
  showEmptyState = computed(() => {
    return !this.isLoading() && 
           !this.hasError() && 
           this.tiposData().length === 0;
  });
  
  // Signal computado para estado de error con datos de ejemplo
  showErrorState = computed(() => {
    return this.hasError() && !this.isLoading();
  });

  // Efecto para programar el refresco al corte del día
  private scheduleEndOfDayRefresh = effect(() => {
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0); // Mañana a las 00:00:00
    
    const tiempoHastaManana = manana.getTime() - ahora.getTime();
    
    const timeoutId = setTimeout(() => {
      this.graphicCircleService.refresh();
      
      // Programar refresco diario recurrente
      setInterval(() => {
        this.graphicCircleService.refresh();
      }, 24 * 60 * 60 * 1000); // Cada 24 horas
      
    }, tiempoHastaManana);
    
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

  /**
   * Carga inicial de datos
   */
  private loadData(): void {
    this.graphicCircleService.loadTiposData();
  }

  /**
   * Configura auto-refresh
   */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          if (!this.graphicCircleService.hasError()) {
            this.graphicCircleService.loadTiposData();
          }
          return [];
        })
      ).subscribe()
    );
  }

  /**
   * Refresca los datos
   */
  refreshChart(): void {
    this.graphicCircleService.refresh();
  }

  /**
   * Delegar métodos al servicio
   */
  getCircleStyle(index: number): any {
    return this.graphicCircleService.getCircleStyle(index);
  }

  formatNumber(value: number): string {
    return this.graphicCircleService.formatNumber(value);
  }

  formatPorcentaje(value: number): string {
    return this.graphicCircleService.formatPorcentaje(value);
  }

  getTipoCount(tipo: string): number {
    return this.graphicCircleService.getTipoCount(tipo);
  }

  getTipoPorcentaje(tipo: string): number {
    return this.graphicCircleService.getTipoPorcentaje(tipo);
  }

  getTipoColor(tipo: string): string {
    return this.graphicCircleService.getTipoColor(tipo);
  }

  /**
   * Métodos de tiempo para la vista (compatibilidad)
   */
  getLastUpdateTime(): string {
    return this.lastUpdateTimeFormatted();
  }

  getUpdateAgo(): string {
    return this.updateAgoText();
  }

  /**
   * Métodos para debug
   */
  getApiResponse(): any {
    return this.apiResponse();
  }

  getTiposDataForDisplay(): any {
    return this.tiposData();
  }
}