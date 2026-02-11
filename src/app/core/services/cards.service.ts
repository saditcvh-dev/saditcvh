// src/app/core/services/dashboard.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface KPIData {
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

export interface DashboardResponse {
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

export interface CardValue {
  id: string;
  title: string;
  value: number;
  icon: string;
  color: string;
  description: string;
  trend: {
    value: number;
    isPositive: boolean;
  };
  loading: boolean;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/dashboard/estadisticas`;
  
  // Signals de estado
  isLoading = signal(false);
  hasError = signal(false);
  errorMessage = signal('');
  lastUpdateTime = signal<Date | null>(null);
  
  // Signal principal con los datos KPI
  private kpiData = signal<KPIData | null>(null);
  
  // Signals computados para cada card
  documentosCard = signal<CardValue>({
    id: 'documentos',
    title: 'Documentos Digitalizados',
    value: 0,
    icon: 'fas fa-archive',
    color: '#691831',
    description: 'Total de documentos',
    trend: { value: 0, isPositive: true },
    loading: true,
    error: false
  });
  
  paginasCard = signal<CardValue>({
    id: 'paginas',
    title: 'Páginas Procesadas',
    value: 0,
    icon: 'fas fa-file-alt',
    color: '#691831',
    description: 'Total de páginas',
    trend: { value: 0, isPositive: true },
    loading: true,
    error: false
  });
  
  usuariosCard = signal<CardValue>({
    id: 'usuarios',
    title: 'Usuarios Activos',
    value: 0,
    icon: 'fas fa-users',
    color: '#691831',
    description: 'Usuarios en sistema',
    trend: { value: 0, isPositive: true },
    loading: true,
    error: false
  });
  
  documentosHoyCard = signal<CardValue>({
    id: 'documentos_hoy',
    title: 'Documentos Hoy',
    value: 0,
    icon: 'fas fa-calendar-day',
    color: '#691831',
    description: 'Digitalizados hoy',
    trend: { value: 0, isPositive: true },
    loading: true,
    error: false
  });
  
  // Array de todas las cards para iterar en la vista
  cards = computed(() => [
    this.documentosCard(),
    this.paginasCard(),
    this.usuariosCard(),
    this.documentosHoyCard()
  ]);
  
  // Valores previos para calcular tendencias
  private previousValues = signal<{ [key: string]: number }>({});
  
  // Signal computado para tiempo desde última actualización
  updateAgoText = computed(() => {
    const lastUpdate = this.lastUpdateTime();
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
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
  });
  
  // Signal computado para última actualización formateada
  lastUpdateTimeFormatted = computed(() => {
    const time = this.lastUpdateTime();
    if (!time) return 'Nunca';
    
    return time.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  /**
   * Carga los datos del dashboard
   */
  loadDashboardData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');
    
    this.http.get<DashboardResponse>(this.API_URL, { withCredentials: true })
      .pipe(
        catchError(error => {
          this.handleError(error);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response?.success && response.data) {
          this.updateKPIData(response.data);
          this.hasError.set(false);
          this.lastUpdateTime.set(new Date());
        } else if (response && !response.success) {
          this.hasError.set(true);
          this.errorMessage.set(response.message || 'Error en el servidor');
          this.setErrorState(true);
        } else if (!response) {
          this.hasError.set(true);
          this.errorMessage.set('No se recibió respuesta del servidor');
          this.setErrorState(true);
        }
        
        this.isLoading.set(false);
      });
  }

  /**
   * Actualiza los datos KPI y las cards
   */
  private updateKPIData(data: KPIData): void {
    this.kpiData.set(data);
    
    // Obtener valores previos
    const prev = this.previousValues();
    
    // 1. Actualizar Documentos
    const documentosValue = data.total_documentos || 0;
    const documentosTrend = this.calculateTrend(prev['documentos'] || 0, documentosValue);
    this.documentosCard.update(card => ({
      ...card,
      value: documentosValue,
      description: 'Total de documentos',
      trend: {
        value: documentosTrend,
        isPositive: documentosValue >= (prev['documentos'] || 0)
      },
      loading: false,
      error: false
    }));
    
    // 2. Actualizar Páginas
    const paginasValue = data.total_paginas || 0;
    const paginasTrend = this.calculateTrend(prev['paginas'] || 0, paginasValue);
    this.paginasCard.update(card => ({
      ...card,
      value: paginasValue,
      description: 'Total de páginas',
      trend: {
        value: paginasTrend,
        isPositive: paginasValue >= (prev['paginas'] || 0)
      },
      loading: false,
      error: false
    }));
    
    // 3. Actualizar Usuarios
    const usuariosValue = data.total_usuarios_activos || 0;
    const usuariosTrend = this.calculateTrend(prev['usuarios'] || 0, usuariosValue);
    this.usuariosCard.update(card => ({
      ...card,
      value: usuariosValue,
      description: `${usuariosValue} usuarios en sistema`,
      trend: {
        value: usuariosTrend,
        isPositive: usuariosValue >= (prev['usuarios'] || 0)
      },
      loading: false,
      error: false
    }));
    
    // 4. Actualizar Documentos Hoy
    const documentosHoyValue = data.documentos_hoy || 0;
    const documentosHoyTrend = this.calculateTrend(prev['documentos_hoy'] || 0, documentosHoyValue);
    this.documentosHoyCard.update(card => ({
      ...card,
      value: documentosHoyValue,
      description: `Digitalizados hoy: ${documentosHoyValue}`,
      trend: {
        value: documentosHoyTrend,
        isPositive: documentosHoyValue >= (prev['documentos_hoy'] || 0)
      },
      loading: false,
      error: false
    }));
    
    // Guardar valores actuales para próxima comparación
    this.previousValues.set({
      documentos: documentosValue,
      paginas: paginasValue,
      usuarios: usuariosValue,
      documentos_hoy: documentosHoyValue
    });
  }

  /**
   * Calcula la tendencia porcentual
   */
  private calculateTrend(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    
    const trend = ((newValue - oldValue) / oldValue) * 100;
    // Limitar a 2 decimales
    return Math.round(trend * 100) / 100;
  }

  /**
   * Maneja errores de la petición
   */
  private handleError(error: any): void {
    this.hasError.set(true);
    this.isLoading.set(false);
    
    let message = '';
    if (error.status === 0) {
      message = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
    } else if (error.status === 404) {
      message = 'El servicio de dashboard no está disponible.';
    } else if (error.status === 500) {
      message = 'Error interno del servidor.';
    } else if (error.error?.message) {
      message = error.error.message;
    } else {
      message = 'Error desconocido al cargar los datos.';
    }
    
    this.errorMessage.set(message);
    this.setErrorState(true);
  }

  /**
   * Establece estado de error en todas las cards
   */
  private setErrorState(error: boolean): void {
    this.documentosCard.update(card => ({ ...card, error, loading: false }));
    this.paginasCard.update(card => ({ ...card, error, loading: false }));
    this.usuariosCard.update(card => ({ ...card, error, loading: false }));
    this.documentosHoyCard.update(card => ({ ...card, error, loading: false }));
  }

  /**
   * Limpia los errores y recarga los datos
   */
  refresh(): void {
    this.loadDashboardData();
  }

  /**
   * Formatea un número para mostrar
   */
  formatValue(value: number | string): string {
    if (value === null || value === undefined || value === '') {
      return '0';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString('es-MX');
    }
    
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toLocaleString('es-MX');
    }
    
    return value.toString();
  }

  /**
   * Formatea la tendencia para mostrar
   */
  formatTrend(trendValue: number): string {
    if (trendValue === 0) return '0%';
    
    const sign = trendValue > 0 ? '+' : '';
    return `${sign}${trendValue.toFixed(1)}%`;
  }
}