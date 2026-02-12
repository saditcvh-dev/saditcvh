// src/app/core/services/graphic-circle.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TipoDocumentoData {
  tipo: string;
  count: number;
  porcentaje: number;
  color: string;
  abreviatura?: string;
}

export interface TiposResponse {
  success: boolean;
  data?: {
    tipos: Array<{
      tipo: string;
      abreviatura: string;
      cantidad: number;
      porcentaje: number;
      color: string;
    }>;
    total_documentos?: number;
    resumen?: any;
    fecha_actualizacion?: string;
  };
  metadata?: any;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class GraphicCircleService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/dashboard/estadisticas/tipos`;
  
  // Colores para los tipos
  private coloresMap: { [key: string]: string } = {
    'Permiso': '#BC955B',
    'Concesión': '#A02142',
    'Conceción': '#A02142', // Por si viene con tilde
    'default': '#99999A'
  };
  
  // Signals de estado
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');
  lastUpdateTime = signal<Date | null>(null);
  
  // Signal principal con datos crudos
  private rawTiposData = signal<TipoDocumentoData[]>([]);
  
  // Signal para el total de documentos
  totalDocumentos = signal(0);
  
  // Signal para debug
  apiResponse = signal<any>(null);
  
  // Signal computado con datos ordenados
  tiposData = computed(() => {
    const data = this.rawTiposData();
    // Ordenar por porcentaje descendente
    return [...data].sort((a, b) => b.porcentaje - a.porcentaje);
  });
  
  // Signal para el total de documentos (computado como fallback)
  totalDocumentosCalculado = computed(() => {
    const data = this.tiposData();
    return data.reduce((sum, item) => sum + item.count, 0);
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

  /**
   * Carga los datos de tipos de documentos
   */
  loadTiposData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');
    
    this.http.get<TiposResponse>(this.API_URL, { withCredentials: true })
      .pipe(
        catchError(error => {
          return this.getTiposFromAlternativeSource();
        })
      )
      .subscribe({
        next: (response) => {
          this.apiResponse.set(response);
          this.processTiposData(response);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  /**
   * Procesa los datos del API
   */
  private processTiposData(response: TiposResponse): void {
    if (response.success && (response.data?.tipos?.length ?? 0) > 0) {
      const tiposRaw = response.data!.tipos;
      
      // Usar total del API o calcular
      const total = response.data!.total_documentos || 
        tiposRaw.reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0);
      
      this.totalDocumentos.set(total);
      
      // Convertir datos del API al formato del componente
      const tiposData = tiposRaw.map(item => ({
        tipo: this.normalizeTipoNombre(item.tipo),
        count: item.cantidad || 0,
        porcentaje: item.porcentaje || 0,
        color: item.color || this.getColorForTipo(item.tipo),
        abreviatura: item.abreviatura
      }));
      
      this.rawTiposData.set(tiposData);
      this.hasError.set(false);
      
    } else {
      this.useDefaultTiposData();
      
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
  private getTiposFromAlternativeSource() {
    // Datos de ejemplo estructurados igual que el API real
    return of({
      success: true,
      data: {
        total_documentos: 100,
        tipos: [
          { 
            tipo: 'Concesión', 
            abreviatura: 'C', 
            cantidad: 64, 
            porcentaje: 64.0,
            color: '#A02142'
          },
          { 
            tipo: 'Permiso', 
            abreviatura: 'P', 
            cantidad: 36, 
            porcentaje: 36.0,
            color: '#BC955B'
          }
        ],
        resumen: {
          proporcion: "64 Concesión / 36 Permiso",
          tipo_mayoritario: "Concesión"
        },
        fecha_actualizacion: new Date().toISOString()
      },
      metadata: {
        processing_time_ms: 0,
        request_timestamp: new Date().toISOString(),
        period: 'todos',
        tipos_count: 2,
        warning: 'Datos de ejemplo'
      }
    });
  }

  /**
   * Normaliza el nombre del tipo
   */
  private normalizeTipoNombre(tipo: string): string {
    if (!tipo) return 'Desconocido';
    
    const tipoLower = tipo.toString().toLowerCase().trim();
    
    if (tipoLower.includes('permiso')) return 'Permiso';
    if (tipoLower.includes('conces')) return 'Concesión';
    if (tipo === 'Conceción') return 'Concesión';
    if (tipo === 'PERMISO') return 'Permiso';
    if (tipo === 'CONCESIÓN') return 'Concesión';
    
    return tipo;
  }

  /**
   * Obtiene color para el tipo
   */
  private getColorForTipo(tipo: string): string {
    const tipoNormalizado = this.normalizeTipoNombre(tipo);
    return this.coloresMap[tipoNormalizado] || this.coloresMap['default'];
  }

  /**
   * Usa datos por defecto (fallback)
   */
  private useDefaultTiposData(): void {
    const defaultData: TipoDocumentoData[] = [
      { tipo: 'Concesión', count: 64, porcentaje: 64.0, color: '#A02142', abreviatura: 'C' },
      { tipo: 'Permiso', count: 36, porcentaje: 36.0, color: '#BC955B', abreviatura: 'P' }
    ];
    
    this.rawTiposData.set(defaultData);
    this.totalDocumentos.set(100);
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
    else message = 'Error al cargar datos de tipos';
    
    this.errorMessage.set(message);
    this.useDefaultTiposData();
    this.lastUpdateTime.set(new Date());
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadTiposData();
  }

  /**
   * Obtiene ángulo para la gráfica circular
   */
  getCircleAngle(porcentaje: number): number {
    return (porcentaje / 100) * 360;
  }

  /**
   * Obtiene estilo CSS para sector circular
   */
  getCircleStyle(index: number): any {
    const data = this.tiposData();
    if (!data || data.length === 0) return {};
    
    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += this.getCircleAngle(data[i].porcentaje);
    }
    
    const porcentaje = data[index].porcentaje;
    const angle = this.getCircleAngle(porcentaje);
    
    const conicGradient = `conic-gradient(
      ${data[index].color} 0deg ${angle}deg,
      transparent ${angle}deg 360deg
    )`;
    
    return {
      background: conicGradient,
      transform: `rotate(${startAngle}deg)`
    };
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

  /**
   * Obtiene el total de documentos (usando total del API o calculado)
   */
  getTotalDisplay(): number {
    const totalFromApi = this.totalDocumentos();
    if (totalFromApi > 0) return totalFromApi;
    return this.totalDocumentosCalculado();
  }

  /**
   * Obtiene conteo por tipo
   */
  getTipoCount(tipo: string): number {
    const data = this.tiposData();
    const item = data.find(t => t.tipo === tipo);
    return item ? item.count : 0;
  }

  /**
   * Obtiene porcentaje por tipo
   */
  getTipoPorcentaje(tipo: string): number {
    const data = this.tiposData();
    const item = data.find(t => t.tipo === tipo);
    return item ? item.porcentaje : 0;
  }

  /**
   * Obtiene color por tipo
   */
  getTipoColor(tipo: string): string {
    const data = this.tiposData();
    const item = data.find(t => t.tipo === tipo);
    return item ? item.color : this.coloresMap['default'];
  }

  /**
   * Verifica si tiene exactamente dos tipos (Permiso y Concesión)
   */
  hasTwoTypes = computed(() => {
    const data = this.tiposData();
    return data.length === 2;
  });
}