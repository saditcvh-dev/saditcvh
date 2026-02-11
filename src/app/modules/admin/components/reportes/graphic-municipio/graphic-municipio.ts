import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface MunicipioData {
  id: number;
  numero: string;
  nombre: string;
  documentos: {
    total: number;
    completados: number;
    pendientes: number;
    en_proceso: number;
  };
  paginas: number;
  modalidades_diferentes: number;
  porcentaje: number;
  densidad_documental: number;
}

interface MunicipioResponse {
  success: boolean;
  data?: {
    total_documentos: number;
    total_paginas: number;
    total_municipios: number;
    datos_grafica: MunicipioData[];
    top_10_municipios: MunicipioData[];
    distribucion_geografica: {
      total_municipios_con_documentos: number;
      municipios_sin_documentos: number;
      concentracion_top_5: number;
    };
    estadisticas_generales: {
      promedio_documentos_por_municipio: string;
      municipio_mas_documentos: MunicipioData | null;
      municipio_menos_documentos: MunicipioData | null;
      municipio_mas_modalidades: MunicipioData | null;
    };
  };
  metadata?: any;
  message?: string;
  error?: string;
}

interface Region {
  id: string;
  nombre: string;
  municipios: number[];
}

@Component({
  standalone: false,
  selector: 'app-graphic-municipio-map',
  templateUrl: './graphic-municipio.html',
  styleUrls: ['./graphic-municipio.css']
})
export class GraphicMunicipioMapComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:4000/api/dashboard/estadisticas/municipio';
  private refreshInterval = 60000;
  
  // Datos para la gráfica
  municipiosData: MunicipioData[] = [];
  top10Municipios: MunicipioData[] = [];
  totalDocumentos = 0;
  totalPaginas = 0;
  totalMunicipios = 0;
  
  // Estados
  isLoading = true;
  hasError = false;
  errorMessage = '';
  lastUpdateTime: Date | null = null;
  apiResponse: any = null;
  
  // Configuración de la visualización
  viewType: 'bars' | 'list' = 'list';
  selectedRegion: string | null = null;
  
  // Altura máxima de las barras en píxeles
  private maxBarHeight = 200;
  
  // Mapa de regiones (todos los municipios incluidos)
  regiones: Region[] = [

    {
      id: 'centro',
      nombre: 'Región Centro',
      municipios: [
        3, 5, 9, 19, 22, 23, 40, 41, 47, 49,
        51, 54, 55, 66, 69, 77, 83
      ]
    },

    {
      id: 'norte',
      nombre: 'Región Norte',
      municipios: [
        10, 20, 25, 26, 28, 31, 32, 33, 34, 35,
        42, 43, 52, 53, 62, 67, 72, 78, 79, 80, 81
      ]
    },

    {
      id: 'sur',
      nombre: 'Región Sur',
      municipios: [
        1, 4, 7, 13, 14, 17, 18, 21, 27, 48,
        50, 57, 60, 70
      ]
    },

    {
      id: 'este',
      nombre: 'Región Este',
      municipios: [
        2, 11, 15, 24, 36, 37, 38, 39, 56, 61,
        68, 71, 74, 76
      ]
    },

    {
      id: 'oeste',
      nombre: 'Región Oeste',
      municipios: [
        6, 8, 12, 16, 29, 30, 44, 45, 46, 58,
        59, 63, 64, 65, 73, 75, 82, 84
      ]
    }
  ];
  
  private subscription: Subscription = new Subscription();
  private timeUpdateSubscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadMunicipioData();
    this.setupAutoRefresh();
    this.startTimeUpdates();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timeUpdateSubscription) {
      this.timeUpdateSubscription.unsubscribe();
    }
  }

  /** ===============================
   *  CARGA DE DATOS DE MUNICIPIO
   *  =============================== */
  private loadMunicipioData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.http.get<MunicipioResponse>(this.apiUrl)
      .pipe(
        catchError(error => {
          return this.getMunicipioFromAlternativeSource();
        })
      )
      .subscribe({
        next: (response) => {
          this.apiResponse = response;
          this.processMunicipioData(response);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  private processMunicipioData(response: MunicipioResponse): void {
    if (response.success && response.data) {
      this.municipiosData = response.data.datos_grafica || [];
      this.top10Municipios = response.data.top_10_municipios || [];
      this.totalDocumentos = response.data.total_documentos || 0;
      this.totalPaginas = response.data.total_paginas || 0;
      this.totalMunicipios = response.data.total_municipios || 0;
      
      // Ordenar por total de documentos descendente
      this.municipiosData.sort((a, b) => b.documentos.total - a.documentos.total);
      this.top10Municipios.sort((a, b) => b.documentos.total - a.documentos.total);
      
      this.hasError = false;
      
    } else {
      this.useDefaultMunicipioData();
      
      if (response.message) {

      }
    }
    
    this.isLoading = false;
    this.lastUpdateTime = new Date();
    
    // Actualizar vista
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });
  }

  /** ===============================
   *  OBTENER DATOS DE FUENTE ALTERNATIVA
   *  =============================== */
  private getMunicipioFromAlternativeSource() {
    return of({
      success: true,
      data: {
        total_documentos: 200,
        total_paginas: 600,
        total_municipios: 10,
        datos_grafica: [
          {
            id: 1,
            numero: "1",
            nombre: "Acatlán",
            documentos: { total: 50, completados: 40, pendientes: 7, en_proceso: 3 },
            paginas: 150,
            modalidades_diferentes: 3,
            porcentaje: 25.0,
            densidad_documental: 3.0
          },
          {
            id: 80,
            numero: "80",
            nombre: "Yahualica",
            documentos: { total: 40, completados: 30, pendientes: 7, en_proceso: 3 },
            paginas: 120,
            modalidades_diferentes: 2,
            porcentaje: 20.0,
            densidad_documental: 3.0
          },
          {
            id: 4,
            numero: "4",
            nombre: "Agua Blanca",
            documentos: { total: 35, completados: 25, pendientes: 7, en_proceso: 3 },
            paginas: 105,
            modalidades_diferentes: 4,
            porcentaje: 17.5,
            densidad_documental: 3.0
          },
          {
            id: 47,
            numero: "47",
            nombre: "Pachuca",
            documentos: { total: 25, completados: 20, pendientes: 3, en_proceso: 2 },
            paginas: 75,
            modalidades_diferentes: 5,
            porcentaje: 12.5,
            densidad_documental: 3.0
          },
          {
            id: 75,
            numero: "75",
            nombre: "Tula de Allende",
            documentos: { total: 20, completados: 15, pendientes: 3, en_proceso: 2 },
            paginas: 60,
            modalidades_diferentes: 2,
            porcentaje: 10.0,
            densidad_documental: 3.0
          }
        ],
        top_10_municipios: [],
        distribucion_geografica: {
          total_municipios_con_documentos: 5,
          municipios_sin_documentos: 79,
          concentracion_top_5: 85.0
        },
        estadisticas_generales: {
          promedio_documentos_por_municipio: "40.00",
          municipio_mas_documentos: null,
          municipio_menos_documentos: null,
          municipio_mas_modalidades: null
        }
      },
      metadata: {
        processing_time_ms: 0,
        request_timestamp: new Date().toISOString(),
        warning: 'Datos de ejemplo'
      }
    });
  }

  /** ===============================
   *  USAR DATOS POR DEFECTO
   *  =============================== */
  private useDefaultMunicipioData(): void {
    const defaultData = this.getMunicipioFromAlternativeSource();
    defaultData.subscribe(response => {
      if (response.success && response.data) {
        this.municipiosData = response.data.datos_grafica;
        this.top10Municipios = response.data.datos_grafica;
        this.totalDocumentos = response.data.total_documentos;
        this.totalPaginas = response.data.total_paginas;
        this.totalMunicipios = response.data.total_municipios;
      }
    });
  }

  /** ===============================
   *  MÉTODOS PARA FILTRADO Y VISUALIZACIÓN
   *  =============================== */
  getMunicipiosToShow(): MunicipioData[] {
    if (!this.selectedRegion) {
      return this.top10Municipios;
    }
    
    const region = this.regiones.find(r => r.id === this.selectedRegion);
    if (!region) return this.top10Municipios;
    
    return this.municipiosData.filter(m => 
      region.municipios.includes(m.id)
    ).sort((a, b) => b.documentos.total - a.documentos.total);
  }

  /** CORREGIDO: Método para calcular altura de barra para municipio */
  getBarHeightForMunicipio(municipio: MunicipioData): string {
    const municipiosToShow = this.getMunicipiosToShow();
    if (municipiosToShow.length === 0) return '0px';
    
    const maxDocuments = Math.max(...municipiosToShow.map(m => m.documentos.total));
    if (maxDocuments === 0) return '0px';
    
    const ratio = municipio.documentos.total / maxDocuments;
    const altura = Math.max(ratio * this.maxBarHeight, 10); // Mínimo 10px
    return `${altura}px`;
  }

  getRegionMunicipiosCount(regionId: string): number {
    const region = this.regiones.find(r => r.id === regionId);
    if (!region) return 0;
    
    return this.municipiosData.filter(m => 
      region.municipios.includes(m.id)
    ).length;
  }

  getRegionTotalDocuments(regionId: string): number {
    const region = this.regiones.find(r => r.id === regionId);
    if (!region) return 0;
    
    return this.municipiosData
      .filter(m => region.municipios.includes(m.id))
      .reduce((sum, m) => sum + m.documentos.total, 0);
  }

  getMapIntensity(municipio: MunicipioData): string {
    const maxDocuments = Math.max(...this.municipiosData.map(m => m.documentos.total));
    if (maxDocuments === 0) return 'low';
    
    const ratio = municipio.documentos.total / maxDocuments;
    
    if (ratio >= 0.8) return 'very-high';
    if (ratio >= 0.6) return 'high';
    if (ratio >= 0.4) return 'medium';
    if (ratio >= 0.2) return 'low';
    return 'very-low';
  }

  getMapColorClass(intensity: string): string {
    switch (intensity) {
      case 'very-high': return 'bg-red-500';
      case 'high': return 'bg-orange-400';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-green-400';
      case 'very-low': return 'bg-blue-400';
      default: return 'bg-gray-300';
    }
  }

  // MÉTODO NUEVO: Obtener nombre de región seleccionada
  getSelectedRegionName(): string {
    if (!this.selectedRegion) return 'Top 10 Municipios';
    const region = this.regiones.find(r => r.id === this.selectedRegion);
    return region ? region.nombre : 'Top 10 Municipios';
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.subscribe(() => {
        this.loadMunicipioData();
      })
    );
  }

  /** ===============================
   *  ACTUALIZACIONES DE TIEMPO
   *  =============================== */
  private startTimeUpdates(): void {
    this.timeUpdateSubscription = timer(0, 30000).subscribe(() => {
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
    });
  }

  /** ===============================
   *  MANEJO DE ERRORES
   *  =============================== */
  private handleError(error: any): void {
    this.hasError = true;
    this.errorMessage = this.getErrorMessage(error);
    this.useDefaultMunicipioData();
    this.isLoading = false;
    this.lastUpdateTime = new Date();
    
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) return 'No se puede conectar con el servidor';
    if (error.status === 404) return 'Servicio de estadísticas no disponible';
    if (error.status === 500) return 'Error interno del servidor';
    return 'Error al cargar datos de municipio';
  }

  /** ===============================
   *  MÉTODOS PARA LA VISTA
   *  =============================== */
  getLastUpdateTime(): string {
    if (!this.lastUpdateTime) return 'Nunca';
    return this.lastUpdateTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUpdateAgo(): string {
    if (!this.lastUpdateTime) return '';
    const diffMs = new Date().getTime() - this.lastUpdateTime.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'hace unos segundos';
    if (diffMin === 1) return 'hace 1 minuto';
    return `hace ${diffMin} minutos`;
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshChart(): void {
    this.isLoading = true;
    this.hasError = false;
    this.loadMunicipioData();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-MX');
  }

  formatPorcentaje(value: number): string {
    return value.toFixed(1);
  }

  toggleViewType(type: 'bars' | 'list'): void {
    this.viewType = type;
  }

  selectRegion(regionId: string | null): void {
    this.selectedRegion = this.selectedRegion === regionId ? null : regionId;
  }

  getMunicipioCompletadosPercentage(municipio: MunicipioData): number {
    return municipio.documentos.total > 0 
      ? (municipio.documentos.completados / municipio.documentos.total) * 100 
      : 0;
  }

  getRegionPercentage(regionId: string): number {
    const regionTotal = this.getRegionTotalDocuments(regionId);
    return this.totalDocumentos > 0 ? (regionTotal / this.totalDocumentos) * 100 : 0;
  }
}