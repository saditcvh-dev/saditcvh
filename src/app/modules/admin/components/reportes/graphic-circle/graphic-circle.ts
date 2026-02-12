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
  private refreshInterval = 300000; // 5 MINUTOS
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
  
  totalDisplay = computed(() => this.graphicCircleService.getTotalDisplay());
  
  showEmptyState = computed(() => 
    !this.isLoading() && !this.hasError() && this.tiposData().length === 0
  );
  
  showErrorState = computed(() => 
    this.hasError() && !this.isLoading()
  );

  private scheduleEndOfDayRefresh = effect(() => {
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const timeoutId = setTimeout(() => {
      this.graphicCircleService.refresh();
      setInterval(() => this.graphicCircleService.refresh(), 24 * 60 * 60 * 1000);
    }, manana.getTime() - ahora.getTime());
    
    return () => clearTimeout(timeoutId);
  }, { allowSignalWrites: false });

  // Manejador de visibilidad
  private visibilityHandler = () => {
    if (!document.hidden) {
      // Actualizar al volver a la pestaña
      this.graphicCircleService.loadTiposData();
    }
  };

  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityListener(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
    this.setupVisibilityListener();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.removeVisibilityListener();
  }

  private loadData(): void {
    this.graphicCircleService.loadTiposData();
  }

  private setupAutoRefresh(): void {
    timer(this.refreshInterval, this.refreshInterval)
      .pipe(
        switchMap(() => {
          // SOLO si la pestaña está visible
          if (!document.hidden && !this.graphicCircleService.hasError()) {
            this.graphicCircleService.loadTiposData();
          }
          return [];
        })
      )
      .subscribe();
  }

  refreshChart(): void {
    this.graphicCircleService.refresh();
  }

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

  getLastUpdateTime(): string {
    return this.lastUpdateTimeFormatted();
  }

  getUpdateAgo(): string {
    return this.updateAgoText();
  }

  getApiResponse(): any {
    return this.apiResponse();
  }

  getTiposDataForDisplay(): any {
    return this.tiposData();
  }
}