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
  private refreshInterval = 300000; // 5 MINUTOS
  private subscription: Subscription = new Subscription();
  
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
  
  showEmptyState = computed(() => 
    !this.isLoading() && !this.hasError() && this.chartData().length === 0
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
      this.graphicService.refresh();
      setInterval(() => this.graphicService.refresh(), 24 * 60 * 60 * 1000);
    }, manana.getTime() - ahora.getTime());
    
    return () => clearTimeout(timeoutId);
  }, { allowSignalWrites: false });

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
    this.setupVisibilityListener();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.removeVisibilityListener();
  }

  private visibilityHandler = () => {
    if (!document.hidden) {
      // Actualizar al volver a la pestaña
      this.graphicService.loadChartData();
    }
  };

  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityListener(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  private loadData(): void {
    this.graphicService.loadChartData();
  }

  private setupAutoRefresh(): void {
    timer(this.refreshInterval, this.refreshInterval)
      .pipe(
        switchMap(() => {
          if (!document.hidden && !this.graphicService.hasError()) {
            this.graphicService.loadChartData();
          }
          return [];
        })
      )
      .subscribe();
  }

  refreshChart(): void {
    this.graphicService.refresh();
  }

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