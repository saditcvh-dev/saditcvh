// src/app/core/services/graphic.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DiaData {
  fecha: string;
  dia_semana_corto: string;
  dia_semana: string;
  cantidad: number | string;
}

export interface ChartResponse {
  success: boolean;
  data: {
    documentos_por_dia: DiaData[];
    documentos_por_estado_dia?: any[];
    documentos_por_tipo_dia?: any[];
  };
  metadata?: {
    period: string;
    generated_at: string;
    processing_time_ms?: number;
  };
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class GraphicService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/dashboard/estadisticas/diarias`;
  
  // Mapeo de días en inglés a español
  private diasMap: { [key: string]: string } = {
    'Mon': 'Lun', 'Monday': 'Lunes',
    'Tue': 'Mar', 'Tuesday': 'Martes',
    'Wed': 'Mié', 'Wednesday': 'Miércoles',
    'Thu': 'Jue', 'Thursday': 'Jueves',
    'Fri': 'Vie', 'Friday': 'Viernes',
    'Sat': 'Sáb', 'Saturday': 'Sábado',
    'Sun': 'Dom', 'Sunday': 'Domingo'
  };
  
  // Orden de días de la semana para la leyenda
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  diasSemanaCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Signals de estado
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');
  lastUpdateTime = signal<Date | null>(null);
  
  // Signal principal con datos crudos
  private rawChartData = signal<DiaData[]>([]);
  
  // Signal computado con datos procesados
  chartData = computed(() => {
    const data = this.rawChartData();
    return this.getUltimos7DiasCronologicos(data);
  });
  
  // Signal computado para el máximo de documentos
  maxDocumentCount = computed(() => {
    const data = this.chartData();
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(d => this.parseCantidad(d.cantidad)));
    return max > 0 ? max : 10;
  });
  
  // Signals para estadísticas
  totalDocumentos = computed(() => {
    const data = this.chartData();
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, dia) => sum + this.parseCantidad(dia.cantidad), 0);
  });
  
  promedioDiario = computed(() => {
    const total = this.totalDocumentos();
    const data = this.chartData();
    if (data.length === 0) return 0;
    return total / data.length;
  });
  
  diaPico = computed(() => {
    const data = this.chartData();
    if (!data || data.length === 0) return 'N/A';
    
    const maxDia = data.reduce((prev, current) => 
      (this.parseCantidad(prev.cantidad) > this.parseCantidad(current.cantidad)) ? prev : current
    );
    
    return `${maxDia.dia_semana} (${maxDia.cantidad})`;
  });
  
  // Signal para el período
  periodo = computed(() => {
    const data = this.chartData();
    if (!data || data.length === 0) return '';
    
    const inicio = data[0]?.fecha || '';
    const fin = data[6]?.fecha || '';
    
    if (inicio && fin) {
      return `${inicio.split('-')[2]}/${inicio.split('-')[1]} - ${fin.split('-')[2]}/${fin.split('-')[1]}`;
    }
    return '';
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
  
  // Signal para el título del tooltip de última actualización
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
   * Carga los datos de la gráfica
   */
  loadChartData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');
    
    this.http.get<ChartResponse>(this.API_URL, { withCredentials: true })
      .pipe(
        catchError(error => {
          this.handleError(error);
          return of({
            success: false,
            data: { documentos_por_dia: [] },
            message: 'Error al cargar datos'
          });
        })
      )
      .subscribe(response => {
        if (response.success && response.data?.documentos_por_dia?.length > 0) {
          this.processChartData(response.data.documentos_por_dia);
          this.hasError.set(false);
        } else {
          this.useDefaultData();
          
          if (response.message) {
            console.log('Mensaje del servidor:', response.message);
          }
        }
        
        this.isLoading.set(false);
        this.lastUpdateTime.set(new Date());
      });
  }

  /**
   * Procesa los datos para la gráfica
   */
  private processChartData(rawData: DiaData[]): void {
    // 1. Normalizar datos
    const normalizedData = rawData.map(item => ({
      fecha: item.fecha,
      dia_semana_corto: this.translateDay(item.dia_semana_corto),
      dia_semana: this.translateDay(item.dia_semana),
      cantidad: this.parseCantidad(item.cantidad)
    }));
  
    // 2. Eliminar duplicados por fecha
    const datosUnicos = this.eliminarDuplicadosPorFecha(normalizedData);
    
    // 3. Asignar a rawChartData
    this.rawChartData.set(datosUnicos);
  }

  /**
   * Elimina duplicados por fecha
   */
  private eliminarDuplicadosPorFecha(datos: DiaData[]): DiaData[] {
    const mapaFechas = new Map<string, DiaData>();
    
    datos.forEach(item => {
      if (mapaFechas.has(item.fecha)) {
        const existente = mapaFechas.get(item.fecha)!;
        if (this.parseCantidad(item.cantidad) > this.parseCantidad(existente.cantidad)) {
          mapaFechas.set(item.fecha, item);
        }
      } else {
        mapaFechas.set(item.fecha, item);
      }
    });
    
    return Array.from(mapaFechas.values());
  }

  /**
   * Obtiene los últimos 7 días en orden cronológico
   */
  private getUltimos7DiasCronologicos(data: DiaData[]): DiaData[] {
    const hoy = new Date();
    const resultado: DiaData[] = [];
    
    // Crear un mapa de los datos existentes por fecha
    const datosPorFecha = new Map<string, DiaData>();
    data.forEach(item => {
      datosPorFecha.set(item.fecha, item);
    });
    
    // Generar los últimos 7 días en orden CRONOLÓGICO
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = this.formatFecha(fecha);
      
      if (datosPorFecha.has(fechaStr)) {
        const datoExistente = datosPorFecha.get(fechaStr)!;
        resultado.push(datoExistente);
      } else {
        // Si no hay datos, crear un día con 0
        const diaSemanaIndex = fecha.getDay();
        let diaSemanaCorto = this.diasSemana[diaSemanaIndex];
        let diaSemanaCompleto = this.diasSemanaCompletos[diaSemanaIndex];
        
        const esHoy = i === 0;
        
        resultado.push({
          fecha: fechaStr,
          dia_semana_corto: esHoy ? 'Hoy' : diaSemanaCorto,
          dia_semana: esHoy ? 'Hoy' : diaSemanaCompleto,
          cantidad: 0
        });
      }
    }
    
    return resultado;
  }

  /**
   * Formato de fecha consistente
   */
  private formatFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Normaliza la cantidad a número
   */
  private parseCantidad(cantidad: number | string): number {
    if (typeof cantidad === 'number') return cantidad;
    if (typeof cantidad === 'string') {
      const parsed = parseInt(cantidad, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Traduce días del inglés al español
   */
  private translateDay(day: string): string {
    if (!day) return 'Dom';
    const cleanDay = day.trim();
    
    if (this.diasSemana.includes(cleanDay) || this.diasSemanaCompletos.includes(cleanDay)) {
      return cleanDay;
    }
    
    return this.diasMap[cleanDay] || 'Dom';
  }

  /**
   * Usa datos por defecto (para desarrollo y fallback)
   */
  private useDefaultData(): void {
    const hoy = new Date();
    const defaultData: DiaData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() - i);
      const diaIndex = fecha.getDay();
      const cantidad = Math.floor(Math.random() * 15) + 1;
      const esHoy = i === 0;
      
      defaultData.push({
        fecha: this.formatFecha(fecha),
        dia_semana_corto: esHoy ? 'Hoy' : this.diasSemana[diaIndex],
        dia_semana: esHoy ? 'Hoy' : this.diasSemanaCompletos[diaIndex],
        cantidad: cantidad
      });
    }
    
    this.rawChartData.set(defaultData);
  }

  /**
   * Maneja errores de la petición
   */
  private handleError(error: any): void {
    this.hasError.set(true);
    this.isLoading.set(false);
    
    let message = '';
    if (error.status === 0) message = 'No se puede conectar con el servidor';
    else if (error.status === 404) message = 'Servicio de gráficas no disponible';
    else if (error.status === 500) message = 'Error interno del servidor';
    else message = 'Error al cargar datos de gráfica';
    
    this.errorMessage.set(message);
    this.useDefaultData();
    this.lastUpdateTime.set(new Date());
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadChartData();
  }

  /**
   * Calcula la altura de la barra como porcentaje
   */
  getBarHeight(cantidad: number | string): number {
    const max = this.maxDocumentCount();
    if (max === 0) return 0;
    return (this.parseCantidad(cantidad) / max) * 100;
  }

  /**
   * Obtiene el color de la barra según su valor
   */
  getBarColor(cantidad: number | string): string {
    const max = this.maxDocumentCount();
    if (max === 0) return 'bg-[#691831]/20';
    
    const porcentaje = this.parseCantidad(cantidad) / max;
    if (porcentaje > 0.7) return 'bg-[#691831]';
    if (porcentaje > 0.4) return 'bg-[#691831]/80';
    if (porcentaje > 0.1) return 'bg-[#691831]/50';
    return 'bg-[#691831]/20';
  }

  /**
   * Formatea un número para mostrar
   */
  formatNumber(value: number): string {
    return value.toLocaleString('es-MX');
  }

  /**
   * Formatea un decimal para mostrar
   */
  formatDecimal(value: number): string {
    return value.toFixed(1);
  }
}