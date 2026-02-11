// src/app/dashboard/graphic-modalidad/graphic-modalidad.component.ts
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
  private refreshInterval = 60000; // 1 minuto
  private subscription: Subscription = new Subscription();
  
  // Exponer signals del servicio (usando los computados públicos)
  isLoading = this.graphicModalidadService.isLoading;
  hasError = this.graphicModalidadService.hasError;
  errorMessage = this.graphicModalidadService.errorMessage;
  
  // Usar filteredModalidades en lugar de rawModalidadesData
  filteredModalidades = this.graphicModalidadService.filteredModalidades;
  
  // Para el conteo total de modalidades, usamos un computed
  modalidadesCount = computed(() => {
    return this.graphicModalidadService.getTotalModalidades();
  });
  
  // Para verificar si hay datos
  hasData = computed(() => {
    return this.graphicModalidadService.filteredModalidades().length > 0;
  });
  
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
  
  // Signal computado para estado vacío
  showEmptyState = computed(() => {
    return !this.isLoading() && 
           !this.hasError() && 
           this.filteredModalidades().length === 0;
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
      this.graphicModalidadService.refresh();
      
      // Programar refresco diario recurrente
      setInterval(() => {
        this.graphicModalidadService.refresh();
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
    this.graphicModalidadService.loadModalidadData();
  }

  /**
   * Configura auto-refresh
   */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          if (!this.graphicModalidadService.hasError()) {
            this.graphicModalidadService.loadModalidadData();
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
    this.graphicModalidadService.refresh();
  }

  /**
   * Delegar métodos al servicio
   */
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
}