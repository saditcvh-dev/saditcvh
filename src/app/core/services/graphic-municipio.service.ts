// src/app/core/services/graphic-municipio.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MunicipioData {
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

export interface MunicipioResponse {
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

export interface Region {
  id: string;
  nombre: string;
  municipios: number[];
}

export type ViewType = 'list';

@Injectable({ providedIn: 'root' })
export class GraphicMunicipioService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/dashboard/estadisticas/municipio`;
  
  // Altura máxima de las barras en píxeles
  private maxBarHeight = 200;
  
  // Mapa de regiones
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
  
  // Signals de estado
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');
  lastUpdateTime = signal<Date | null>(null);
  
  // Signal principal con datos crudos
  private rawMunicipiosData = signal<MunicipioData[]>([]);
  private rawTop10Municipios = signal<MunicipioData[]>([]);
  
  // Signals para totales
  totalDocumentos = signal(0);
  totalPaginas = signal(0);
  totalMunicipios = signal(0);
  
  // Signal para debug
  apiResponse = signal<any>(null);
  
  // Configuración de visualización
  viewType = signal<ViewType>('list');
  selectedRegionId = signal<string | null>(null);
  
  // Signal computado con datos ordenados
  sortedMunicipiosData = computed(() => {
    const data = this.rawMunicipiosData();
    return [...data].sort((a, b) => b.documentos.total - a.documentos.total);
  });
  
  sortedTop10Municipios = computed(() => {
    const data = this.rawTop10Municipios();
    return [...data].sort((a, b) => b.documentos.total - a.documentos.total);
  });
  
  // Signal computado para municipios a mostrar
  municipiosToShow = computed(() => {
    const selectedRegion = this.selectedRegionId();
    const top10 = this.sortedTop10Municipios();
    const allData = this.sortedMunicipiosData();
    
    if (!selectedRegion) {
      return top10;
    }
    
    const region = this.regiones.find(r => r.id === selectedRegion);
    if (!region) return top10;
    
    return allData.filter(m => 
      region.municipios.includes(m.id)
    ).sort((a, b) => b.documentos.total - a.documentos.total);
  });
  
  // Signal para el municipio con más documentos
  topMunicipio = computed(() => {
    const data = this.sortedMunicipiosData();
    return data.length > 0 ? data[0] : null;
  });
  
  // Signal para nombre de región seleccionada
  selectedRegionName = computed(() => {
    const selectedId = this.selectedRegionId();
    if (!selectedId) return 'Top 10 Municipios';
    const region = this.regiones.find(r => r.id === selectedId);
    return region ? region.nombre : 'Top 10 Municipios';
  });
  
  // Signal para tiempo desde última actualización
  updateAgoText = computed(() => {
    const lastUpdate = this.lastUpdateTime();
    if (!lastUpdate) return '';
    
    const diffMs = new Date().getTime() - lastUpdate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'hace unos segundos';
    if (diffMin === 1) return 'hace 1 minuto';
    return `hace ${diffMin} minutos`;
  });
  
  // Signal para última actualización formateada
  lastUpdateTimeFormatted = computed(() => {
    const time = this.lastUpdateTime();
    if (!time) return 'Nunca';
    
    return time.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  });
  
  // Signal para la fecha completa (tooltip)
  lastUpdateFullDate = computed(() => {
    const time = this.lastUpdateTime();
    if (!time) return '';
    
    return time.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });
  
  // Signal para verificar si hay datos
  hasData = computed(() => {
    return this.rawMunicipiosData().length > 0;
  });
  
  // Signal para estado vacío
  isEmpty = computed(() => {
    return !this.isLoading() && 
           !this.hasError() && 
           this.rawMunicipiosData().length === 0;
  });

  /**
   * Carga los datos de municipios
   */
  loadMunicipioData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');
    
    this.http.get<MunicipioResponse>(this.API_URL, { withCredentials: true })
      .pipe(
        catchError(error => {
          return this.getMunicipioFromAlternativeSource();
        })
      )
      .subscribe({
        next: (response) => {
          this.apiResponse.set(response);
          this.processMunicipioData(response);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  /**
   * Procesa los datos del API
   */
  private processMunicipioData(response: MunicipioResponse): void {
    if (response.success && response.data) {
      this.rawMunicipiosData.set(response.data.datos_grafica || []);
      this.rawTop10Municipios.set(response.data.top_10_municipios || []);
      this.totalDocumentos.set(response.data.total_documentos || 0);
      this.totalPaginas.set(response.data.total_paginas || 0);
      this.totalMunicipios.set(response.data.total_municipios || 0);
      
      this.hasError.set(false);
    } else {
      this.useDefaultMunicipioData();
      
      if (response.message) {
        console.log('Mensaje del servidor:', response.message);
      }
    }
    
    this.isLoading.set(false);
    this.lastUpdateTime.set(new Date());
  }

  /**
   * Obtiene datos de fuente alternativa (fallback)
   */
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

  /**
   * Usa datos por defecto (fallback)
   */
  private useDefaultMunicipioData(): void {
    this.getMunicipioFromAlternativeSource().subscribe(response => {
      if (response.success && response.data) {
        this.rawMunicipiosData.set(response.data.datos_grafica);
        this.rawTop10Municipios.set(response.data.datos_grafica);
        this.totalDocumentos.set(response.data.total_documentos);
        this.totalPaginas.set(response.data.total_paginas);
        this.totalMunicipios.set(response.data.total_municipios);
      }
    });
  }

  /**
   * Maneja errores de la petición
   */
  private handleError(error: any): void {
    this.hasError.set(true);
    this.isLoading.set(false);
    
    let message = '';
    if (error.status === 0) message = 'No se puede conectar con el servidor';
    else if (error.status === 404) message = 'Servicio de estadísticas no disponible';
    else if (error.status === 500) message = 'Error interno del servidor';
    else message = 'Error al cargar datos de municipio';
    
    this.errorMessage.set(message);
    this.useDefaultMunicipioData();
    this.lastUpdateTime.set(new Date());
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadMunicipioData();
  }

  /**
   * Selecciona una región
   */
  selectRegion(regionId: string | null): void {
    if (this.selectedRegionId() === regionId) {
      this.selectedRegionId.set(null);
    } else {
      this.selectedRegionId.set(regionId);
    }
  }

  /**
   * Obtiene el conteo de municipios en una región
   */
  getRegionMunicipiosCount(regionId: string): number {
    const region = this.regiones.find(r => r.id === regionId);
    if (!region) return 0;
    
    return this.rawMunicipiosData().filter(m => 
      region.municipios.includes(m.id)
    ).length;
  }

  /**
   * Obtiene el total de documentos en una región
   */
  getRegionTotalDocuments(regionId: string): number {
    const region = this.regiones.find(r => r.id === regionId);
    if (!region) return 0;
    
    return this.rawMunicipiosData()
      .filter(m => region.municipios.includes(m.id))
      .reduce((sum, m) => sum + m.documentos.total, 0);
  }

  /**
   * Obtiene el porcentaje de documentos en una región
   */
  getRegionPercentage(regionId: string): number {
    const regionTotal = this.getRegionTotalDocuments(regionId);
    const total = this.totalDocumentos();
    return total > 0 ? (regionTotal / total) * 100 : 0;
  }

  /**
   * Obtiene la intensidad del mapa para un municipio
   */
  getMapIntensity(municipio: MunicipioData): string {
    const maxDocuments = Math.max(...this.rawMunicipiosData().map(m => m.documentos.total));
    if (maxDocuments === 0) return 'low';
    
    const ratio = municipio.documentos.total / maxDocuments;
    
    if (ratio >= 0.8) return 'very-high';
    if (ratio >= 0.6) return 'high';
    if (ratio >= 0.4) return 'medium';
    if (ratio >= 0.2) return 'low';
    return 'very-low';
  }

  /**
   * Obtiene la clase CSS para el color del mapa
   */
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

  /**
   * Calcula altura de barra para municipio
   */
  getBarHeightForMunicipio(municipio: MunicipioData): string {
    const municipiosToShow = this.municipiosToShow();
    if (municipiosToShow.length === 0) return '0px';
    
    const maxDocuments = Math.max(...municipiosToShow.map(m => m.documentos.total));
    if (maxDocuments === 0) return '0px';
    
    const ratio = municipio.documentos.total / maxDocuments;
    const altura = Math.max(ratio * this.maxBarHeight, 10);
    return `${altura}px`;
  }

  /**
   * Calcula el porcentaje de completados de un municipio
   */
  getMunicipioCompletadosPercentage(municipio: MunicipioData): number {
    return municipio.documentos.total > 0 
      ? (municipio.documentos.completados / municipio.documentos.total) * 100 
      : 0;
  }

  /**
   * Formatea un número
   */
  formatNumber(value: number): string {
    return value.toLocaleString('es-MX');
  }

  /**
   * Formatea un porcentaje
   */
  formatPorcentaje(value: number): string {
    return value.toFixed(1);
  }
}