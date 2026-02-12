import { Component, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GraphicModalidadService, FilterType, SortColumn } from '../../../../../core/services/graphic-modalidad.service';

@Component({
  standalone: false,
  selector: 'app-graphic-modalidad',
  templateUrl: './graphic-modalidad.html',
  styleUrls: ['./graphic-modalidad.css']
})
export class GraphicModalidadBarsComponent implements OnInit, OnDestroy {
  private graphicModalidadService = inject(GraphicModalidadService);
  private refreshInterval = 300000; // 5 MINUTOS
  private subscription: Subscription = new Subscription();
  
  // Exponer signals del servicio
  isLoading = this.graphicModalidadService.isLoading;
  hasError = this.graphicModalidadService.hasError;
  errorMessage = this.graphicModalidadService.errorMessage;
  filteredModalidades = this.graphicModalidadService.filteredModalidades;
  
  modalidadesCount = computed(() => this.graphicModalidadService.getTotalModalidades());
  hasData = computed(() => this.graphicModalidadService.filteredModalidades().length > 0);
  
  totalDocumentos = this.graphicModalidadService.totalDocumentos;
  totalPaginas = this.graphicModalidadService.totalPaginas;
  totalModalidades = this.graphicModalidadService.totalModalidades;
  totalCompletados = this.graphicModalidadService.totalCompletados;
  totalEnProceso = this.graphicModalidadService.totalEnProceso;
  totalPendientes = this.graphicModalidadService.totalPendientes;
  topModalidad = this.graphicModalidadService.topModalidad;
  currentFilter = this.graphicModalidadService.currentFilter;
  lastUpdateTimeFormatted = this.graphicModalidadService.lastUpdateTimeFormatted;
  lastUpdateFullDate = this.graphicModalidadService.lastUpdateFullDate;
  updateAgoText = this.graphicModalidadService.updateAgoText;
  apiResponse = this.graphicModalidadService.apiResponse;
  
  showEmptyState = computed(() => 
    !this.isLoading() && !this.hasError() && this.filteredModalidades().length === 0
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
      this.graphicModalidadService.refresh();
      setInterval(() => this.graphicModalidadService.refresh(), 24 * 60 * 60 * 1000);
    }, manana.getTime() - ahora.getTime());
    
    return () => clearTimeout(timeoutId);
  }, { allowSignalWrites: false });

  // 🟢 Manejador de visibilidad
  private visibilityHandler = () => {
    if (!document.hidden) {
      this.graphicModalidadService.loadModalidadData();
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
    this.graphicModalidadService.loadModalidadData();
  }

  private setupAutoRefresh(): void {
    timer(this.refreshInterval, this.refreshInterval)
      .pipe(
        switchMap(() => {
          if (!document.hidden && !this.graphicModalidadService.hasError()) {
            this.graphicModalidadService.loadModalidadData();
          }
          return [];
        })
      )
      .subscribe();
  }

  refreshChart(): void {
    this.graphicModalidadService.refresh();
  }

  setFilter(filter: FilterType): void {
    this.graphicModalidadService.setFilter(filter);
  }

  toggleSort(column: SortColumn): void {
    this.graphicModalidadService.toggleSort(column);
  }

  getSortIcon(column: string): string {
    return this.graphicModalidadService.getSortIcon(column);
  }

  formatNumber(value: number): string {
    return this.graphicModalidadService.formatNumber(value);
  }

  formatPorcentaje(value: number): string {
    return this.graphicModalidadService.formatPorcentaje(value);
  }

  getModalidadCompletadosPercentage(modalidad: any): number {
    return this.graphicModalidadService.getModalidadCompletadosPercentage(modalidad);
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
}