// src/app/core/services/graphic-modalidad.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ModalidadData {
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
  porcentaje: number;
  tasa_completado: number;
}

export interface ModalidadResponse {
  success: boolean;
  data?: {
    total_documentos: number;
    total_paginas: number;
    total_modalidades: number;
    datos_grafica: ModalidadData[];
    top_5_modalidades: ModalidadData[];
    distribucion_estado: {
      completados: number;
      pendientes: number;
      en_proceso: number;
    };
    estadisticas_generales: {
      promedio_documentos_por_modalidad: string;
      modalidad_mas_documentos: ModalidadData | null;
      modalidad_menos_documentos: ModalidadData | null;
    };
  };
  metadata?: any;
  message?: string;
  error?: string;
}

export type FilterType = 'all' | 'completados' | 'pendientes' | 'en_proceso';
export type SortColumn = 'nombre' | 'documentos' | 'porcentaje' | 'tasa_completado';

@Injectable({ providedIn: 'root' })
export class GraphicModalidadService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/dashboard/estadisticas/modalidad`;
  
  // Signals de estado
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');
  lastUpdateTime = signal<Date | null>(null);
  
  // Signal principal con datos crudos
  private rawModalidadesData = signal<ModalidadData[]>([]);
  
  // Signals para totales
  totalDocumentos = signal(0);
  totalPaginas = signal(0);
  totalModalidades = signal(0);
  
  // Signal para debug
  apiResponse = signal<any>(null);
  
  // Configuración de visualización
  currentFilter = signal<FilterType>('all');
  sortColumn = signal<SortColumn>('documentos');
  sortDirection = signal<'asc' | 'desc'>('desc');
  
  // Signal computado con datos ordenados
  sortedModalidades = computed(() => {
    const data = this.rawModalidadesData();
    if (!data || data.length === 0) return [];
    
    const column = this.sortColumn();
    const direction = this.sortDirection();
    
    return [...data].sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (column) {
        case 'nombre':
          valueA = a.nombre.toLowerCase();
          valueB = b.nombre.toLowerCase();
          break;
        case 'documentos':
          valueA = a.documentos.total;
          valueB = b.documentos.total;
          break;
        case 'porcentaje':
          valueA = a.porcentaje;
          valueB = b.porcentaje;
          break;
        case 'tasa_completado':
          valueA = a.tasa_completado;
          valueB = b.tasa_completado;
          break;
        default:
          valueA = a.documentos.total;
          valueB = b.documentos.total;
      }
      
      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  });
  
  // Signal computado con datos filtrados
  filteredModalidades = computed(() => {
    const data = this.sortedModalidades();
    const filter = this.currentFilter();
    
    if (filter === 'all') return data;
    
    return data.filter(modalidad => {
      switch (filter) {
        case 'completados': return modalidad.documentos.completados > 0;
        case 'pendientes': return modalidad.documentos.pendientes > 0;
        case 'en_proceso': return modalidad.documentos.en_proceso > 0;
        default: return true;
      }
    });
  });
  
  // Signal para la modalidad con más documentos
  topModalidad = computed(() => {
    const data = this.sortedModalidades();
    return data.length > 0 ? data[0] : null;
  });
  
  // Signal para totales calculados
  totalCompletados = computed(() => {
    const data = this.rawModalidadesData();
    return data.reduce((sum, m) => sum + m.documentos.completados, 0);
  });
  
  totalEnProceso = computed(() => {
    const data = this.rawModalidadesData();
    return data.reduce((sum, m) => sum + m.documentos.en_proceso, 0);
  });
  
  totalPendientes = computed(() => {
    const data = this.rawModalidadesData();
    return data.reduce((sum, m) => sum + m.documentos.pendientes, 0);
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
  
  // Signal para el ícono de ordenamiento
  sortIcon = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    
    return (col: string) => {
      if (this.sortColumn() !== col) return 'fas fa-sort';
      return this.sortDirection() === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    };
  });

  /**
   * Carga los datos de modalidad
   */
  loadModalidadData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');
    
    this.http.get<ModalidadResponse>(this.API_URL, { withCredentials: true })
      .pipe(
        catchError(error => {
          return this.getModalidadFromAlternativeSource();
        })
      )
      .subscribe({
        next: (response) => {
          this.apiResponse.set(response);
          this.processModalidadData(response);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  /**
   * Procesa los datos del API
   */
  private processModalidadData(response: ModalidadResponse): void {
    if (response.success && response.data) {
      this.rawModalidadesData.set(response.data.datos_grafica || []);
      this.totalDocumentos.set(response.data.total_documentos || 0);
      this.totalPaginas.set(response.data.total_paginas || 0);
      this.totalModalidades.set(response.data.total_modalidades || 0);
      
      this.hasError.set(false);
    } else {
      this.useDefaultModalidadData();
      
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
  private getModalidadFromAlternativeSource() {
    return of({
      success: true,
      data: {
        total_documentos: 150,
        total_paginas: 450,
        total_modalidades: 5,
        datos_grafica: [
          {
            id: 4,
            numero: "13",
            nombre: "Urbano",
            documentos: { total: 45, completados: 30, pendientes: 10, en_proceso: 5 },
            paginas: 135,
            porcentaje: 30.0,
            tasa_completado: 66.67
          },
          {
            id: 9,
            numero: "22",
            nombre: "Servicio de Grua",
            documentos: { total: 35, completados: 20, pendientes: 10, en_proceso: 5 },
            paginas: 105,
            porcentaje: 23.33,
            tasa_completado: 57.14
          },
          {
            id: 14,
            numero: "30",
            nombre: "Transporte Escolar",
            documentos: { total: 30, completados: 25, pendientes: 3, en_proceso: 2 },
            paginas: 90,
            porcentaje: 20.0,
            tasa_completado: 83.33
          },
          {
            id: 2,
            numero: "11",
            nombre: "Taxi o Sitio",
            documentos: { total: 25, completados: 15, pendientes: 7, en_proceso: 3 },
            paginas: 75,
            porcentaje: 16.67,
            tasa_completado: 60.0
          },
          {
            id: 1,
            numero: "10",
            nombre: "Individual Libre",
            documentos: { total: 15, completados: 10, pendientes: 3, en_proceso: 2 },
            paginas: 45,
            porcentaje: 10.0,
            tasa_completado: 66.67
          }
        ],
        top_5_modalidades: [],
        distribucion_estado: { completados: 100, pendientes: 33, en_proceso: 17 },
        estadisticas_generales: {
          promedio_documentos_por_modalidad: "30.00",
          modalidad_mas_documentos: null,
          modalidad_menos_documentos: null
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
  private useDefaultModalidadData(): void {
    this.getModalidadFromAlternativeSource().subscribe(response => {
      if (response.success && response.data) {
        this.rawModalidadesData.set(response.data.datos_grafica);
        this.totalDocumentos.set(response.data.total_documentos);
        this.totalPaginas.set(response.data.total_paginas);
        this.totalModalidades.set(response.data.total_modalidades);
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
    else message = 'Error al cargar datos de modalidad';
    
    this.errorMessage.set(message);
    this.useDefaultModalidadData();
    this.lastUpdateTime.set(new Date());
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadModalidadData();
  }

  /**
   * Establece el filtro
   */
  setFilter(filter: FilterType): void {
    this.currentFilter.set(filter);
  }

  /**
   * Alterna el ordenamiento
   */
  toggleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  /**
   * Obtiene el ícono de ordenamiento para una columna
   */
  getSortIcon(column: string): string {
    return this.sortIcon()(column);
  }

  /**
   * Calcula el porcentaje de completados de una modalidad
   */
  getModalidadCompletadosPercentage(modalidad: ModalidadData): number {
    return modalidad.documentos.total > 0 
      ? (modalidad.documentos.completados / modalidad.documentos.total) * 100 
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

  getTotalModalidades(): number {
    return this.rawModalidadesData().length;
  }
}