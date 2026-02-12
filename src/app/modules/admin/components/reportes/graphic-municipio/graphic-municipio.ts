// src/app/dashboard/graphic-municipio/graphic-municipio.component.ts
import { Component, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GraphicMunicipioService, ViewType } from '../../../../../core/services/graphic-municipio.service';

@Component({
  standalone: false,
  selector: 'app-graphic-municipio-map',
  templateUrl: './graphic-municipio.html',
  styleUrls: ['./graphic-municipio.css']
})
export class GraphicMunicipioMapComponent implements OnInit, OnDestroy {
  private graphicMunicipioService = inject(GraphicMunicipioService);
  private refreshInterval = 60000; // 1 minuto
  private subscription: Subscription = new Subscription();
  
  // Exponer signals del servicio
  isLoading = this.graphicMunicipioService.isLoading;
  hasError = this.graphicMunicipioService.hasError;
  errorMessage = this.graphicMunicipioService.errorMessage;
  
  // Datos
  municipiosData = this.graphicMunicipioService.sortedMunicipiosData;
  top10Municipios = this.graphicMunicipioService.sortedTop10Municipios;
  municipiosToShow = this.graphicMunicipioService.municipiosToShow;
  
  // Totales
  totalDocumentos = this.graphicMunicipioService.totalDocumentos;
  totalPaginas = this.graphicMunicipioService.totalPaginas;
  totalMunicipios = this.graphicMunicipioService.totalMunicipios;
  topMunicipio = this.graphicMunicipioService.topMunicipio;
  
  // Configuración
  regiones = this.graphicMunicipioService.regiones;
  selectedRegionId = this.graphicMunicipioService.selectedRegionId;
  selectedRegionName = this.graphicMunicipioService.selectedRegionName;
  
  // Tiempo
  lastUpdateTimeFormatted = this.graphicMunicipioService.lastUpdateTimeFormatted;
  lastUpdateFullDate = this.graphicMunicipioService.lastUpdateFullDate;
  updateAgoText = this.graphicMunicipioService.updateAgoText;
  
  // Debug
  apiResponse = this.graphicMunicipioService.apiResponse;
  
  // Signals computados para la vista
  showEmptyState = computed(() => {
    return this.graphicMunicipioService.isEmpty();
  });
  
  showErrorState = computed(() => {
    return this.hasError() && !this.isLoading();
  });
  
  hasData = this.graphicMunicipioService.hasData;

  // Efecto para programar el refresco al corte del día
  private scheduleEndOfDayRefresh = effect(() => {
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const tiempoHastaManana = manana.getTime() - ahora.getTime();
    
    const timeoutId = setTimeout(() => {
      this.graphicMunicipioService.refresh();
      
      setInterval(() => {
        this.graphicMunicipioService.refresh();
      }, 24 * 60 * 60 * 1000);
      
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
    this.graphicMunicipioService.loadMunicipioData();
  }

  /**
   * Configura auto-refresh
   */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          if (!this.graphicMunicipioService.hasError()) {
            this.graphicMunicipioService.loadMunicipioData();
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
    this.graphicMunicipioService.refresh();
  }

  /**
   * Delegar métodos al servicio
   */
  selectRegion(regionId: string | null): void {
    this.graphicMunicipioService.selectRegion(regionId);
  }

  getRegionMunicipiosCount(regionId: string): number {
    return this.graphicMunicipioService.getRegionMunicipiosCount(regionId);
  }

  getRegionTotalDocuments(regionId: string): number {
    return this.graphicMunicipioService.getRegionTotalDocuments(regionId);
  }

  getRegionPercentage(regionId: string): number {
    return this.graphicMunicipioService.getRegionPercentage(regionId);
  }

  getMapIntensity(municipio: any): string {
    return this.graphicMunicipioService.getMapIntensity(municipio);
  }

  getMapColorClass(intensity: string): string {
    return this.graphicMunicipioService.getMapColorClass(intensity);
  }

  getBarHeightForMunicipio(municipio: any): string {
    return this.graphicMunicipioService.getBarHeightForMunicipio(municipio);
  }

  getMunicipioCompletadosPercentage(municipio: any): number {
    return this.graphicMunicipioService.getMunicipioCompletadosPercentage(municipio);
  }

  formatNumber(value: number): string {
    return this.graphicMunicipioService.formatNumber(value);
  }

  formatPorcentaje(value: number): string {
    return this.graphicMunicipioService.formatPorcentaje(value);
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