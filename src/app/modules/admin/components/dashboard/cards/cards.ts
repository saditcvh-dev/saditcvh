import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

interface KPIData {
  total_documentos: number;
  total_paginas: number;
  total_usuarios_activos: number;
  documentos_por_estado: {
    [key: string]: number;
  };
  documentos_hoy?: number;
  documentos_semana?: number;
  usuarios_nuevos_hoy?: number;
  busquedas_hoy?: number;
  archivos_por_tipo?: {
    [key: string]: number;
  };
  documentos_por_tipo?: {
    [key: string]: number;
  };
  timestamp?: string;
}

interface DashboardResponse {
  success: boolean;
  data: KPIData;
  metadata?: {
    generated_at: string;
    query_count: number;
    processing_time_ms?: number;
    request_timestamp?: string;
  };
  message?: string;
  error?: string;
}

interface CardConfig {
  id: string;
  title: string;
  value: number | string;
  icon: string;
  color: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading: boolean;
  error?: boolean;
}

@Component({
  selector: 'app-cards',
  standalone: false,
  templateUrl: './cards.html',
  styleUrls: ['./cards.css']
})
export class CardsComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:4000/api/dashboard/estadisticas';
  private refreshInterval = 30000;
  private previousValues: { [key: string]: number } = {};

  cards: CardConfig[] = [
    {
      id: 'documentos',
      title: 'Documentos Digitalizados',
      value: 0,
      icon: 'fas fa-archive',
      color: '#691831',
      description: 'Total de documentos',
      trend: { value: 0, isPositive: true },
      loading: true,
      error: false
    },
    {
      id: 'paginas',
      title: 'Páginas Procesadas',
      value: 0,
      icon: 'fas fa-file-alt',
      color: '#691831',
      description: 'Total de páginas',
      trend: { value: 0, isPositive: true },
      loading: true,
      error: false
    },
    {
      id: 'usuarios',
      title: 'Usuarios Activos',
      value: 0,
      icon: 'fas fa-users',
      color: '#691831',
      description: 'Usuarios en sistema',
      trend: { value: 0, isPositive: true },
      loading: true,
      error: false
    },
    {
      id: 'documentos_hoy',
      title: 'Documentos Hoy',
      value: 0,
      icon: 'fas fa-calendar-day',
      color: '#691831',
      description: 'Digitalizados hoy',
      trend: { value: 0, isPositive: true },
      loading: true,
      error: false
    }
  ];

  private subscription: Subscription = new Subscription();
  private lastUpdateTime: Date | null = null;
  hasError = false;
  errorMessage = '';
  isLoading = true;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef  // Necesario para forzar detección de cambios
  ) {}

  ngOnInit(): void {
    console.log('🔄 Iniciando componente Cards...');
    this.loadData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /** ===============================
   *  CARGA INICIAL
   *  =============================== */
  private loadData(): void {
    console.log('📥 Solicitando datos al servidor...');
    this.isLoading = true;
    this.hasError = false;
    
    this.http.get<DashboardResponse>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('❌ Error cargando datos KPI:', error);
          this.hasError = true;
          this.errorMessage = this.getErrorMessage(error);
          this.isLoading = false;
          this.setErrorState(true);
          return of(null);
        })
      )
      .subscribe(response => {
        console.log('📊 Respuesta recibida:', response);
        
        if (response?.success && response.data) {
          console.log('✅ Datos recibidos correctamente:', response.data);
          this.updateCards(response.data);
          this.hasError = false;
        } else if (response && !response.success) {
          console.error('❌ Error en la respuesta del servidor:', response.message);
          this.hasError = true;
          this.errorMessage = response.message || 'Error en el servidor';
          this.setErrorState(true);
        } else if (!response) {
          console.error('❌ No se recibió respuesta del servidor');
          this.hasError = true;
          this.errorMessage = 'No se recibió respuesta del servidor';
          this.setErrorState(true);
        }
        
        this.isLoading = false;
        this.lastUpdateTime = new Date();
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        console.log('🔄 Cards actualizadas:', this.cards);
      });
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    console.log(`🔄 Configurando auto-refresh cada ${this.refreshInterval / 1000}s`);
    
    const refresh$ = timer(this.refreshInterval, this.refreshInterval).pipe(
      switchMap(() => {
        console.log('🔄 Actualización automática...');
        return this.http.get<DashboardResponse>(this.apiUrl).pipe(
          catchError(error => {
            console.warn('⚠️ Error en auto-refresh:', error);
            return of(null);
          })
        );
      })
    );

    this.subscription.add(
      refresh$.subscribe(response => {
        if (response?.success && response.data) {
          console.log('✅ Auto-refresh exitoso');
          this.updateCards(response.data);
          this.lastUpdateTime = new Date();
          this.cdr.detectChanges();
        }
      })
    );
  }

  /** ===============================
   *  ACTUALIZAR CARDS (MÉTODO CORREGIDO)
   *  =============================== */
  private updateCards(data: KPIData): void {
    console.log('🔄 Actualizando cards con datos:', data);
    
    // 1. Documentos Digitalizados
    const documentosOldValue = Number(this.cards[0].value) || 0;
    this.cards[0].value = data.total_documentos || 0;
    this.cards[0].trend = {
      value: this.calculateTrend(documentosOldValue, data.total_documentos || 0),
      isPositive: (data.total_documentos || 0) >= documentosOldValue
    };
    this.cards[0].loading = false;
    this.cards[0].error = false;

    // 2. Páginas Procesadas
    const paginasOldValue = Number(this.cards[1].value) || 0;
    this.cards[1].value = data.total_paginas || 0;
    this.cards[1].trend = {
      value: this.calculateTrend(paginasOldValue, data.total_paginas || 0),
      isPositive: (data.total_paginas || 0) >= paginasOldValue
    };
    this.cards[1].loading = false;
    this.cards[1].error = false;

    // 3. Usuarios Activos
    const usuariosOldValue = Number(this.cards[2].value) || 0;
    this.cards[2].value = data.total_usuarios_activos || 0;
    this.cards[2].description = `${data.total_usuarios_activos || 0} usuarios en sistema`;
    this.cards[2].trend = {
      value: this.calculateTrend(usuariosOldValue, data.total_usuarios_activos || 0),
      isPositive: (data.total_usuarios_activos || 0) >= usuariosOldValue
    };
    this.cards[2].loading = false;
    this.cards[2].error = false;

    // 4. Documentos Hoy - Usar valor específico de la API
    const documentosHoyOldValue = Number(this.cards[3].value) || 0;
    const documentosHoyValue = data.documentos_hoy || 0;
    this.cards[3].value = documentosHoyValue;
    this.cards[3].description = `Digitalizados hoy: ${documentosHoyValue}`;
    this.cards[3].trend = {
      value: this.calculateTrend(documentosHoyOldValue, documentosHoyValue),
      isPositive: documentosHoyValue >= documentosHoyOldValue
    };
    this.cards[3].loading = false;
    this.cards[3].error = false;

    // Guardar valores actuales para próxima comparación
    this.previousValues = {
      documentos: data.total_documentos || 0,
      paginas: data.total_paginas || 0,
      usuarios: data.total_usuarios_activos || 0,
      documentos_hoy: documentosHoyValue
    };

    // Forzar cambio de referencia para que Angular detecte los cambios
    this.cards = [...this.cards];
    
    console.log('✅ Cards después de actualizar:', this.cards);
  }

  private calculateTrend(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    
    const trend = ((newValue - oldValue) / oldValue) * 100;
    // Limitar a 2 decimales
    return Math.round(trend * 100) / 100;
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) return 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
    if (error.status === 404) return 'El servicio de dashboard no está disponible.';
    if (error.status === 500) return 'Error interno del servidor.';
    if (error.error?.message) return error.error.message;
    
    return 'Error desconocido al cargar los datos.';
  }

  private setErrorState(error: boolean): void {
    this.cards = this.cards.map(card => ({
      ...card,
      error,
      loading: false
    }));
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshData(): void {
    console.log('🔄 Recarga manual solicitada');
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.loadData();
  }

  formatValue(value: number | string): string {
    if (value === null || value === undefined || value === '') {
      return '0';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString('es-MX');
    }
    
    // Intentar convertir string a número
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toLocaleString('es-MX');
    }
    
    return value.toString();
  }

  formatTrend(trendValue: number): string {
    if (trendValue === 0) return '0%';
    
    const sign = trendValue > 0 ? '+' : '';
    return `${sign}${trendValue.toFixed(1)}%`;
  }

  getCardClass(card: CardConfig): string {
    const base = 'bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200';
    
    if (card.loading) {
      return `${base} opacity-70 cursor-wait`;
    }
    
    if (card.error) {
      return `${base} border-red-300 hover:border-red-400`;
    }
    
    return `${base} hover:border-[#691831]/20`;
  }

  getLastUpdateTime(): string {
    if (!this.lastUpdateTime) return 'Nunca';
    
    return this.lastUpdateTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getUpdateAgo(): string {
    if (!this.lastUpdateTime) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastUpdateTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) {
      return `hace ${diffSec} segundos`;
    } else if (diffSec < 3600) {
      const minutes = Math.floor(diffSec / 60);
      return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
      const hours = Math.floor(diffSec / 3600);
      return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
  }
}