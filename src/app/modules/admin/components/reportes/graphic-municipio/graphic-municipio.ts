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
  private refreshInterval = 300000; // 5 MINUTOS
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
  showEmptyState = computed(() => this.graphicMunicipioService.isEmpty());
  showErrorState = computed(() => this.hasError() && !this.isLoading());
  hasData = this.graphicMunicipioService.hasData;

  private scheduleEndOfDayRefresh = effect(() => {
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const timeoutId = setTimeout(() => {
      this.graphicMunicipioService.refresh();
      setInterval(() => this.graphicMunicipioService.refresh(), 24 * 60 * 60 * 1000);
    }, manana.getTime() - ahora.getTime());
    
    return () => clearTimeout(timeoutId);
  }, { allowSignalWrites: false });

  // Manejador de visibilidad
  private visibilityHandler = () => {
    if (!document.hidden) {
      this.graphicMunicipioService.loadMunicipioData();
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
    this.graphicMunicipioService.loadMunicipioData();
  }

  private setupAutoRefresh(): void {
    timer(this.refreshInterval, this.refreshInterval)
      .pipe(
        switchMap(() => {
          if (!document.hidden && !this.graphicMunicipioService.hasError()) {
            this.graphicMunicipioService.loadMunicipioData();
          }
          return [];
        })
      )
      .subscribe();
  }

  refreshChart(): void {
    this.graphicMunicipioService.refresh();
  }

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