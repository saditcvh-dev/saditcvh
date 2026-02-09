import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface DiaData {
  fecha: string;
  dia_semana_corto: string;
  dia_semana: string;
  cantidad: number | string;
}

interface ChartResponse {
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

@Component({
  selector: 'app-graphic',
  standalone: false,
  templateUrl: './graphic.html',
  styleUrls: ['./graphic.css']
})
export class GraphicComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:4000/api/dashboard/estadisticas/diarias';
  private refreshInterval = 60000;
  
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
  
  chartData: DiaData[] = [];
  isLoading = true;
  hasError = false;
  errorMessage = '';
  lastUpdateTime: Date | null = null;
  totalDocumentos = 0;
  promedioDiario = 0;
  diaPico = 'N/A';
  updateAgoText = '';
  
  private subscription: Subscription = new Subscription();
  private timeUpdateSubscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadChartData();
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
   *  CARGA DE DATOS
   *  =============================== */
  private loadChartData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.http.get<ChartResponse>(this.apiUrl)
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
      .subscribe({
        next: (response) => {
          if (response.success && response.data?.documentos_por_dia?.length > 0) {
            this.processChartData(response.data.documentos_por_dia);
            this.hasError = false;
          } else {
            this.useDefaultData();
            
            if (response.message) {

            }
          }
          
          this.isLoading = false;
          this.lastUpdateTime = new Date();
          this.updateAgoText = this.calculateUpdateAgo();
          
          // Usar NgZone.run para evitar el error de detección de cambios
          this.ngZone.run(() => {
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  /** ===============================
   *  PROCESAR DATOS PARA LA GRÁFICA
   *  =============================== */
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
    
    // 3. Obtener los últimos 7 días en orden CRONOLÓGICO (del más antiguo al más reciente)
    const ultimos7Dias = this.getUltimos7DiasCronologicos(datosUnicos);
    
    // 4. Asignar a chartData (ya viene ordenado cronológicamente)
    this.chartData = ultimos7Dias;
    
    // 5. Calcular estadísticas
    this.calculateStatistics();
  }

  /** ===============================
   *  ELIMINAR DUPLICADOS POR FECHA
   *  =============================== */
  private eliminarDuplicadosPorFecha(datos: DiaData[]): DiaData[] {
    const mapaFechas = new Map<string, DiaData>();
    
    datos.forEach(item => {
      // Usar la fecha como clave, si ya existe, mantener el que tenga mayor cantidad
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

  /** ===============================
   *  OBTENER ÚLTIMOS 7 DÍAS EN ORDEN CRONOLÓGICO
   *  =============================== */
  private getUltimos7DiasCronologicos(data: DiaData[]): DiaData[] {
    const hoy = new Date();
    const resultado: DiaData[] = [];
    
    // Crear un mapa de los datos existentes por fecha
    const datosPorFecha = new Map<string, DiaData>();
    data.forEach(item => {
      datosPorFecha.set(item.fecha, item);
    });
    
    // Generar los últimos 7 días en orden CRONOLÓGICO
    // Desde hace 6 días (el más antiguo) hasta hoy (el más reciente)
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = this.formatFecha(fecha);
      
      // Si tenemos datos para esta fecha, usarlos
      if (datosPorFecha.has(fechaStr)) {
        const datoExistente = datosPorFecha.get(fechaStr)!;
        resultado.push(datoExistente);
      } else {
        // Si no hay datos, crear un día con 0
        const diaSemanaIndex = fecha.getDay(); // 0 = Domingo, 6 = Sábado
        
        // Determinar el día de la semana en español
        let diaSemanaCorto = this.diasSemana[diaSemanaIndex];
        let diaSemanaCompleto = this.diasSemanaCompletos[diaSemanaIndex];
        
        // Verificar si es hoy
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

  /** ===============================
   *  FORMATO DE FECHA CONSISTENTE
   *  =============================== */
  private formatFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** ===============================
   *  NORMALIZAR CANTIDAD
   *  =============================== */
  private parseCantidad(cantidad: number | string): number {
    if (typeof cantidad === 'number') return cantidad;
    if (typeof cantidad === 'string') {
      const parsed = parseInt(cantidad, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /** ===============================
   *  TRADUCIR DÍAS
   *  =============================== */
  private translateDay(day: string): string {
    if (!day) return 'Dom';
    const cleanDay = day.trim();
    
    // Si ya está en español, devolverlo
    if (this.diasSemana.includes(cleanDay) || this.diasSemanaCompletos.includes(cleanDay)) {
      return cleanDay;
    }
    
    // Traducir del inglés
    return this.diasMap[cleanDay] || 'Dom';
  }

  /** ===============================
   *  USAR DATOS POR DEFECTO
   *  =============================== */
  private useDefaultData(): void {
    const hoy = new Date();
    const defaultData: DiaData[] = [];
    
    // Generar datos para los últimos 7 días en orden cronológico
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
    
    this.chartData = defaultData;
    this.calculateStatistics();
  }

  /** ===============================
   *  CALCULAR ESTADÍSTICAS
   *  =============================== */
  private calculateStatistics(): void {
    if (!this.chartData || this.chartData.length === 0) {
      this.totalDocumentos = 0;
      this.promedioDiario = 0;
      this.diaPico = 'N/A';
      return;
    }
    
    this.totalDocumentos = this.chartData.reduce((sum, dia) => sum + this.parseCantidad(dia.cantidad), 0);
    this.promedioDiario = this.totalDocumentos / this.chartData.length;
    
    const maxDia = this.chartData.reduce((prev, current) => 
      (this.parseCantidad(prev.cantidad) > this.parseCantidad(current.cantidad)) ? prev : current
    );
    
    this.diaPico = `${maxDia.dia_semana} (${maxDia.cantidad})`;
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.subscribe(() => {
        this.loadChartData();
      })
    );
  }

  /** ===============================
   *  ACTUALIZACIONES DE TIEMPO
   *  =============================== */
  private startTimeUpdates(): void {
    // Actualizar el tiempo cada 30 segundos para evitar el error
    this.timeUpdateSubscription = timer(0, 30000).subscribe(() => {
      if (this.lastUpdateTime) {
        this.updateAgoText = this.calculateUpdateAgo();
        // Usar markForCheck en lugar de detectChanges para evitar el error
        this.cdr.markForCheck();
      }
    });
  }

  private calculateUpdateAgo(): string {
    if (!this.lastUpdateTime) return '';
    const diffMs = new Date().getTime() - this.lastUpdateTime.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'hace unos segundos';
    if (diffMin === 1) return 'hace 1 minuto';
    return `hace ${diffMin} minutos`;
  }

  /** ===============================
   *  MANEJO DE ERRORES
   *  =============================== */
  private handleError(error: any): void {
    this.hasError = true;
    this.errorMessage = this.getErrorMessage(error);
    this.useDefaultData();
    this.isLoading = false;
    this.lastUpdateTime = new Date();
    this.updateAgoText = this.calculateUpdateAgo();
    
    // Usar NgZone.run para evitar el error de detección de cambios
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) return 'No se puede conectar con el servidor';
    if (error.status === 404) return 'Servicio de gráficas no disponible';
    if (error.status === 500) return 'Error interno del servidor';
    return 'Error al cargar datos de gráfica';
  }

  /** ===============================
   *  MÉTODOS PARA LA VISTA
   *  =============================== */
  getMaxDocumentCount(): number {
    if (!this.chartData || this.chartData.length === 0) return 10;
    const max = Math.max(...this.chartData.map(d => this.parseCantidad(d.cantidad)));
    return max > 0 ? max : 10;
  }

  getBarHeight(cantidad: number | string): number {
    const max = this.getMaxDocumentCount();
    if (max === 0) return 0;
    return (this.parseCantidad(cantidad) / max) * 100;
  }

  getBarColor(cantidad: number | string): string {
    const max = this.getMaxDocumentCount();
    if (max === 0) return 'bg-[#691831]/20';
    
    const porcentaje = this.parseCantidad(cantidad) / max;
    if (porcentaje > 0.7) return 'bg-[#691831]';
    if (porcentaje > 0.4) return 'bg-[#691831]/80';
    if (porcentaje > 0.1) return 'bg-[#691831]/50';
    return 'bg-[#691831]/20';
  }

  getLastUpdateTime(): string {
    if (!this.lastUpdateTime) return 'Nunca';
    return this.lastUpdateTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUpdateAgo(): string {
    // Usar el texto precalculado para evitar cambios durante la detección de cambios
    return this.updateAgoText;
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshChart(): void {
    this.isLoading = true;
    this.hasError = false;
    this.loadChartData();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-MX');
  }

  formatDecimal(value: number): string {
    return value.toFixed(1);
  }

  getPeriodo(): string {
    if (!this.chartData || this.chartData.length === 0) return '';
    const inicio = this.chartData[0]?.fecha || '';
    const fin = this.chartData[6]?.fecha || '';
    
    if (inicio && fin) {
      return `${inicio.split('-')[2]}/${inicio.split('-')[1]} - ${fin.split('-')[2]}/${fin.split('-')[1]}`;
    }
    return '';
  }
}