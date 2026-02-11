import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ModalidadData {
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

interface ModalidadResponse {
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

@Component({
  standalone: false,
  selector: 'app-graphic-modalidad',
  templateUrl: './graphic-modalidad.html',
  styleUrls: ['./graphic-modalidad.css']
})
export class GraphicModalidadBarsComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:4000/api/dashboard/estadisticas/modalidad';
  private refreshInterval = 60000;
  
  // Datos para la gráfica
  modalidadesData: ModalidadData[] = [];
  totalDocumentos = 0;
  totalPaginas = 0;
  totalModalidades = 0;
  
  // Estados
  isLoading = true;
  hasError = false;
  errorMessage = '';
  lastUpdateTime: Date | null = null;
  apiResponse: any = null;
  
  // Configuración de la visualización
  currentFilter: 'all' | 'completados' | 'pendientes' | 'en_proceso' = 'all';
  sortColumn: 'nombre' | 'documentos' | 'porcentaje' | 'tasa_completado' = 'documentos';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  private subscription: Subscription = new Subscription();
  private timeUpdateSubscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadModalidadData();
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
   *  CARGA DE DATOS DE MODALIDAD
   *  =============================== */
  private loadModalidadData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.http.get<ModalidadResponse>(this.apiUrl)
      .pipe(
        catchError(error => {
          return this.getModalidadFromAlternativeSource();
        })
      )
      .subscribe({
        next: (response) => {
          this.apiResponse = response;
          this.processModalidadData(response);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  private processModalidadData(response: ModalidadResponse): void { 
    if (response.success && response.data) {
      this.modalidadesData = response.data.datos_grafica || [];
      this.totalDocumentos = response.data.total_documentos || 0;
      this.totalPaginas = response.data.total_paginas || 0;
      this.totalModalidades = response.data.total_modalidades || 0;
      
      // Ordenar por total de documentos descendente
      this.sortData();
      
      this.hasError = false;
    } else {
      this.useDefaultModalidadData();
      
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

  /** ===============================
   *  USAR DATOS POR DEFECTO
   *  =============================== */
  private useDefaultModalidadData(): void {
    const defaultData = this.getModalidadFromAlternativeSource();
    defaultData.subscribe(response => {
      if (response.success && response.data) {
        this.modalidadesData = response.data.datos_grafica;
        this.totalDocumentos = response.data.total_documentos;
        this.totalPaginas = response.data.total_paginas;
        this.totalModalidades = response.data.total_modalidades;
        this.sortData();
      }
    });
  }

  /** ===============================
   *  FILTRADO Y ORDENACIÓN
   *  =============================== */
  getFilteredModalidades(): ModalidadData[] {
    if (!this.modalidadesData || this.modalidadesData.length === 0) return [];
    
    let filtered = [...this.modalidadesData];
    
    // Aplicar filtro
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(modalidad => {
        switch (this.currentFilter) {
          case 'completados': return modalidad.documentos.completados > 0;
          case 'pendientes': return modalidad.documentos.pendientes > 0;
          case 'en_proceso': return modalidad.documentos.en_proceso > 0;
          default: return true;
        }
      });
    }
    
    return filtered;
  }

  sortData(): void {
    if (!this.modalidadesData || this.modalidadesData.length === 0) return;
    
    this.modalidadesData.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (this.sortColumn) {
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
      
      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  toggleSort(column: 'nombre' | 'documentos' | 'porcentaje' | 'tasa_completado'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.sortData();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // MÉTODO: Calcular total de completados
  getTotalCompletados(): number {
    if (!this.modalidadesData || this.modalidadesData.length === 0) return 0;
    return this.modalidadesData.reduce((sum, m) => sum + m.documentos.completados, 0);
  }

  // MÉTODO: Calcular total de en proceso
  getTotalEnProceso(): number {
    if (!this.modalidadesData || this.modalidadesData.length === 0) return 0;
    return this.modalidadesData.reduce((sum, m) => sum + m.documentos.en_proceso, 0);
  }

  // MÉTODO: Calcular total de pendientes
  getTotalPendientes(): number {
    if (!this.modalidadesData || this.modalidadesData.length === 0) return 0;
    return this.modalidadesData.reduce((sum, m) => sum + m.documentos.pendientes, 0);
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.subscribe(() => {
        this.loadModalidadData();
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
    this.useDefaultModalidadData();
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
    return 'Error al cargar datos de modalidad';
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
    this.loadModalidadData();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-MX');
  }

  formatPorcentaje(value: number): string {
    return value.toFixed(1);
  }

  setFilter(filter: 'all' | 'completados' | 'pendientes' | 'en_proceso'): void {
    this.currentFilter = filter;
  }

  getModalidadCompletadosPercentage(modalidad: ModalidadData): number {
    return modalidad.documentos.total > 0 
      ? (modalidad.documentos.completados / modalidad.documentos.total) * 100 
      : 0;
  }

  /** ===============================
   *  MÉTODOS PARA DEBUG
   *  =============================== */
  getApiResponse(): any {
    return this.apiResponse;
  }
}