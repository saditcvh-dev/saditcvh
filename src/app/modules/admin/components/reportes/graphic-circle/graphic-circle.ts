import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface TipoDocumentoData {
  tipo: string;
  count: number;
  porcentaje: number;
  color: string;
  abreviatura?: string;
}

interface TiposResponse {
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

@Component({
  selector: 'app-graphic-circle',
  standalone: false,
  templateUrl: './graphic-circle.html',
  styleUrls: ['./graphic-circle.css'],
})
export class GraphicCircle implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:4000/api/dashboard/estadisticas/tipos';
  private refreshInterval = 60000;
  
  // Datos para la gráfica
  tiposData: TipoDocumentoData[] = [];
  totalDocumentos = 0;
  isLoading = true;
  hasError = false;
  errorMessage = '';
  lastUpdateTime: Date | null = null;
  apiResponse: any = null;
  
  // Colores para los tipos
  private coloresMap: { [key: string]: string } = {
    'Permiso': '#BC955B',
    'Concesión': '#A02142',
    'Conceción': '#A02142', // Por si viene con tilde
    'default': '#99999A'
  };
  
  private subscription: Subscription = new Subscription();
  private timeUpdateSubscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    console.log('📊 Iniciando componente de gráfica circular...');
    this.loadTiposData();
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
   *  CARGA DE DATOS DE TIPOS
   *  =============================== */
  private loadTiposData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    console.log('📥 Cargando datos de tipos de documento desde:', this.apiUrl);
    
    this.http.get<TiposResponse>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('❌ Error cargando datos de tipos:', error);
          return this.getTiposFromAlternativeSource();
        })
      )
      .subscribe({
        next: (response) => {
          console.log('📊 Respuesta recibida del API:', response);
          this.apiResponse = response; // Guardar respuesta para debug
          this.processTiposData(response);
        },
        error: (error) => {
          console.error('❌ Error en la suscripción:', error);
          this.handleError(error);
        }
      });
  }

  private processTiposData(response: TiposResponse): void {
    console.log('📊 Procesando datos de tipos:', response);
    
    if (response.success && (response.data?.tipos?.length ?? 0) > 0) {
      console.log('✅ Datos de tipos recibidos correctamente');
      
      const tiposRaw = response.data!.tipos;
      this.totalDocumentos = response.data!.total_documentos || 
        tiposRaw.reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0);
      
      // Convertir datos del API al formato del componente
      this.tiposData = tiposRaw.map(item => ({
        tipo: this.normalizeTipoNombre(item.tipo),
        count: item.cantidad || 0,
        porcentaje: item.porcentaje || 0,
        color: item.color || this.getColorForTipo(item.tipo),
        abreviatura: item.abreviatura
      }));
      
      // Ordenar por porcentaje descendente
      this.tiposData.sort((a, b) => b.porcentaje - a.porcentaje);
      
      this.hasError = false;
      console.log('📊 Datos procesados:', this.tiposData);
      
    } else {
      console.log('⚠️ No se recibieron datos válidos, usando datos por defecto');
      console.log('Respuesta completa:', response);
      this.useDefaultTiposData();
      
      if (response.message) {
        console.warn('Advertencia:', response.message);
      }
    }
    
    this.isLoading = false;
    this.lastUpdateTime = new Date();
    
    // Actualizar vista
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });
    
    console.log('🔄 Datos finales de tipos:', this.tiposData);
    console.log('🔄 Total de documentos:', this.totalDocumentos);
  }

  /** ===============================
   *  OBTENER DATOS DE FUENTE ALTERNATIVA
   *  =============================== */
  private getTiposFromAlternativeSource() {
    console.log('⚠️ Usando fuente alternativa (datos de ejemplo)');
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

  /** ===============================
   *  NORMALIZAR NOMBRE DEL TIPO
   *  =============================== */
  private normalizeTipoNombre(tipo: string): string {
    if (!tipo) return 'Desconocido';
    
    const tipoLower = tipo.toString().toLowerCase().trim();
    
    // Mapear nombres
    if (tipoLower.includes('permiso')) return 'Permiso';
    if (tipoLower.includes('conces')) return 'Concesión';
    
    // Por si viene con acento
    if (tipo === 'Conceción') return 'Concesión';
    if (tipo === 'PERMISO') return 'Permiso';
    if (tipo === 'CONCESIÓN') return 'Concesión';
    
    return tipo;
  }

  /** ===============================
   *  OBTENER COLOR PARA EL TIPO
   *  =============================== */
  private getColorForTipo(tipo: string): string {
    const tipoNormalizado = this.normalizeTipoNombre(tipo);
    return this.coloresMap[tipoNormalizado] || this.coloresMap['default'];
  }

  /** ===============================
   *  USAR DATOS POR DEFECTO
   *  =============================== */
  private useDefaultTiposData(): void {
    this.tiposData = [
      { tipo: 'Concesión', count: 64, porcentaje: 64.0, color: '#A02142', abreviatura: 'C' },
      { tipo: 'Permiso', count: 36, porcentaje: 36.0, color: '#BC955B', abreviatura: 'P' }
    ];
    this.totalDocumentos = 100;
  }

  /** ===============================
   *  OBTENER ÁNGULO PARA LA GRÁFICA CIRCULAR
   *  =============================== */
  getCircleAngle(porcentaje: number): number {
    return (porcentaje / 100) * 360;
  }

  /** ===============================
   *  OBTENER CSS PARA SECTOR CIRCULAR
   *  =============================== */
  getCircleStyle(index: number): any {
    if (!this.tiposData || this.tiposData.length === 0) return {};
    
    // Calcular ángulos acumulativos
    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += this.getCircleAngle(this.tiposData[i].porcentaje);
    }
    
    const porcentaje = this.tiposData[index].porcentaje;
    const angle = this.getCircleAngle(porcentaje);
    
    // Crear conic-gradient para sector circular
    const conicGradient = `conic-gradient(
      ${this.tiposData[index].color} 0deg ${angle}deg,
      transparent ${angle}deg 360deg
    )`;
    
    return {
      background: conicGradient,
      transform: `rotate(${startAngle}deg)`
    };
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.subscribe(() => {
        console.log('🔄 Actualizando gráfica circular automáticamente...');
        this.loadTiposData();
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
    console.error('❌ Error en componente de gráfica circular:', error);
    this.hasError = true;
    this.errorMessage = this.getErrorMessage(error);
    this.useDefaultTiposData();
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
    return 'Error al cargar datos de tipos';
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
    console.log('🔄 Recargando gráfica circular manualmente...');
    this.isLoading = true;
    this.hasError = false;
    this.loadTiposData();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-MX');
  }

  formatPorcentaje(value: number): string {
    return value.toFixed(1);
  }

  /** ===============================
   *  MÉTODOS PARA LA GRÁFICA CIRCULAR
   *  =============================== */
  getTotalCount(): number {
    return this.tiposData.reduce((sum, item) => sum + item.count, 0);
  }

  getTipoCount(tipo: string): number {
    const item = this.tiposData.find(t => t.tipo === tipo);
    return item ? item.count : 0;
  }

  getTipoPorcentaje(tipo: string): number {
    const item = this.tiposData.find(t => t.tipo === tipo);
    return item ? item.porcentaje : 0;
  }

  getTipoColor(tipo: string): string {
    const item = this.tiposData.find(t => t.tipo === tipo);
    return item ? item.color : '#99999A';
  }

  /** ===============================
   *  MÉTODOS PARA DEBUG
   *  =============================== */
  getApiResponse(): any {
    return this.apiResponse;
  }

  getTiposDataForDisplay(): any {
    return this.tiposData;
  }
}