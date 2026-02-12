// src/app/core/services/exp-recent.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DocumentoReciente {
  documento_id: number;
  numero_documento: string | null;
  titulo: string;
  descripcion: string | null;
  estado_digitalizacion: string;
  fecha_creacion: string;
  tipo_documento: string | null;
  
  archivo_info: {
    archivo_id: number | null;
    nombre_archivo: string;
    fecha_digitalizacion: string;
    estado_ocr: string;
    tiene_archivo: boolean;
  };
  
  usuario_info: {
    usuario_id: number;
    username: string;
    nombre_completo: string;
    email: string;
  } | null;
  
  // Métodos que vienen del backend o se añaden
  getEstadoTexto?: () => string;
  getEstadoColor?: () => string;
  getTiempoTranscurrido?: () => string;
  getUsuarioDisplay?: () => string;
  
  // Campos computados (añadidos en el servicio)
  numero_documento_display?: string;
}

export interface DocumentosResponse {
  success: boolean;
  data: DocumentoReciente[];
  metadata: {
    total: number;
    generated_at: string;
  };
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpRecentService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/reports/reporte-digitalizacion/ultimos-documentos`;
  
  // Signals de estado
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');
  lastUpdateTime = signal<Date | null>(null);
  
  // Signal principal con los datos crudos
  private documentosRaw = signal<DocumentoReciente[]>([]);
  
  // Signal computado con documentos procesados
  documentos = computed(() => {
    const docs = this.documentosRaw();
    return this.procesarDocumentos(docs);
  });
  
  // Signal para el contador de documentos
  totalDocumentos = computed(() => this.documentos().length);
  
  // Signal para tiempo desde última actualización
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
  
  // Signal para última actualización formateada
  lastUpdateTimeFormatted = computed(() => {
    const time = this.lastUpdateTime();
    if (!time) return 'Nunca';
    
    return time.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  /**
   * Carga los documentos recientes
   */
  loadDocumentosRecientes(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    this.http.get<DocumentosResponse>(this.API_URL, { withCredentials: true })
      .pipe(
        catchError(error => {
          this.handleError(error);
          return of({
            success: false,
            data: [],
            metadata: { total: 0, generated_at: new Date().toISOString() },
            message: 'Error al cargar documentos'
          });
        })
      )
      .subscribe(response => {
        if (response.success && response.data && response.data.length > 0) {
          // Procesar datos del backend
          this.documentosRaw.set(response.data);
          this.hasError.set(false);
        } else {
          // Usar datos de ejemplo
          this.documentosRaw.set(this.getDocumentosEjemplo());
          
          if (response.message) {
            console.log('Mensaje del servidor:', response.message);
          }
        }
        
        this.isLoading.set(false);
        this.lastUpdateTime.set(new Date());
      });
  }

  /**
   * Procesa los documentos añadiendo métodos computados
   */
  private procesarDocumentos(datos: DocumentoReciente[]): any[] {
    return datos.map(doc => {
      // Si el backend ya incluye los métodos, usarlos
      if (doc.getEstadoTexto && doc.getEstadoColor && doc.getTiempoTranscurrido && doc.getUsuarioDisplay) {
        return {
          ...doc,
          numero_documento_display: doc.numero_documento || doc.titulo || `Documento ${doc.documento_id}`
        };
      }
      
      // Si no, crear métodos locales
      return {
        ...doc,
        // Usar título como número de documento si numero_documento es null
        numero_documento_display: doc.numero_documento || doc.titulo || `Documento ${doc.documento_id}`,
        
        getEstadoTexto: (): string => {
          if (!doc.archivo_info?.tiene_archivo) return 'Pendiente';
          const estado = doc.archivo_info.estado_ocr;
          const estadosMap: { [key: string]: string } = {
            'pendiente': 'Pendiente OCR',
            'en_proceso': 'Procesando OCR',
            'procesado': 'OCR Completado',
            'fallido': 'OCR Fallido',
            'sin_archivo': 'Sin archivo',
            'completado': 'OCR Completado'
          };
          return estadosMap[estado] || estado;
        },
        
        getEstadoColor: (): string => {
          if (!doc.archivo_info?.tiene_archivo) return 'gray';
          const estado = doc.archivo_info.estado_ocr;
          const coloresMap: { [key: string]: string } = {
            'pendiente': 'yellow',
            'en_proceso': 'blue',
            'procesado': 'green',
            'completado': 'green',
            'fallido': 'red',
            'sin_archivo': 'gray'
          };
          return coloresMap[estado] || 'gray';
        },
        
        getTiempoTranscurrido: (): string => {
          const fecha = new Date(doc.fecha_creacion);
          const ahora = new Date();
          const diffMs = ahora.getTime() - fecha.getTime();
          const diffMin = Math.floor(diffMs / 60000);
          const diffHoras = Math.floor(diffMs / 3600000);
          const diffDias = Math.floor(diffMs / 86400000);
          
          if (diffMin < 1) return 'Hace unos segundos';
          if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
          if (diffHoras < 24) return `Hace ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
          if (diffDias < 7) return `Hace ${diffDias} día${diffDias !== 1 ? 's' : ''}`;
          
          // Formato completo para más de una semana
          return fecha.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
        },
        
        getUsuarioDisplay: (): string => {
          if (!doc.usuario_info) return 'Sin asignar';
          return doc.usuario_info.nombre_completo || doc.usuario_info.username;
        }
      };
    });
  }

  /**
   * Datos de ejemplo para desarrollo y fallback
   */
  private getDocumentosEjemplo(): DocumentoReciente[] {
    return [
      {
        documento_id: 1,
        numero_documento: '1 80-12-0001-0001 C',
        titulo: 'Documento de prueba 1',
        descripcion: 'Descripción de prueba',
        estado_digitalizacion: 'completado',
        fecha_creacion: new Date().toISOString(),
        tipo_documento: 'C',
        archivo_info: {
          archivo_id: 101,
          tiene_archivo: true,
          estado_ocr: 'completado',
          nombre_archivo: 'documento_1.pdf',
          fecha_digitalizacion: new Date().toISOString()
        },
        usuario_info: {
          usuario_id: 1,
          username: 'admin',
          nombre_completo: 'Administrador del Sistema',
          email: 'admin@stch.com'
        },
        numero_documento_display: '1 80-12-0001-0001 C',
        getEstadoTexto: () => 'OCR Completado',
        getEstadoColor: () => 'green',
        getTiempoTranscurrido: () => 'Hace unos segundos',
        getUsuarioDisplay: () => 'Administrador del Sistema'
      },
      {
        documento_id: 2,
        numero_documento: '2 04-21-0001-0001 P',
        titulo: 'Documento de prueba 2',
        descripcion: 'Descripción de prueba 2',
        estado_digitalizacion: 'en_proceso',
        fecha_creacion: new Date(Date.now() - 3600000).toISOString(),
        tipo_documento: 'P',
        archivo_info: {
          archivo_id: 102,
          tiene_archivo: true,
          estado_ocr: 'en_proceso',
          nombre_archivo: 'documento_2.pdf',
          fecha_digitalizacion: new Date(Date.now() - 3600000).toISOString()
        },
        usuario_info: {
          usuario_id: 9,
          username: 'digitalizador1',
          nombre_completo: 'Juan Digitalizador',
          email: 'juan@stch.com'
        },
        numero_documento_display: '2 04-21-0001-0001 P',
        getEstadoTexto: () => 'Procesando OCR',
        getEstadoColor: () => 'blue',
        getTiempoTranscurrido: () => 'Hace 1 hora',
        getUsuarioDisplay: () => 'Juan Digitalizador'
      },
      {
        documento_id: 3,
        numero_documento: '3 12-05-0012-0034 C',
        titulo: 'Documento de prueba 3',
        descripcion: 'Sin descripción',
        estado_digitalizacion: 'pendiente',
        fecha_creacion: new Date(Date.now() - 86400000).toISOString(),
        tipo_documento: 'C',
        archivo_info: {
          archivo_id: null,
          tiene_archivo: false,
          estado_ocr: 'pendiente',
          nombre_archivo: '',
          fecha_digitalizacion: ''
        },
        usuario_info: null,
        numero_documento_display: '3 12-05-0012-0034 C',
        getEstadoTexto: () => 'Pendiente',
        getEstadoColor: () => 'gray',
        getTiempoTranscurrido: () => 'Hace 1 día',
        getUsuarioDisplay: () => 'Sin asignar'
      }
    ];
  }

  /**
   * Maneja errores de la petición
   */
  private handleError(error: any): void {
    this.hasError.set(true);
    this.isLoading.set(false);
    
    let message = '';
    if (error.status === 0) {
      message = 'No se puede conectar con el servidor';
    } else if (error.status === 404) {
      message = 'Servicio de documentos no disponible';
    } else if (error.status === 500) {
      message = 'Error interno del servidor';
    } else {
      message = 'Error al cargar documentos recientes';
    }
    
    this.errorMessage.set(message);
    
    // Usar datos de ejemplo
    this.documentosRaw.set(this.getDocumentosEjemplo());
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadDocumentosRecientes();
  }

  /**
   * Métodos para la vista
   */
  getEstadoColorClases(estadoColor: string): string {
    const clasesMap: { [key: string]: string } = {
      'green': 'bg-green-100 text-green-800 border-green-200',
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'red': 'bg-red-100 text-red-800 border-red-200',
      'gray': 'bg-gray-100 text-gray-800 border-gray-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return clasesMap[estadoColor] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getIconoDocumento(tipoDocumento: string | null): string {
    if (!tipoDocumento) return 'fa-file';
    
    const iconosMap: { [key: string]: string } = {
      'C': 'fa-file-contract',
      'P': 'fa-file-signature',
    };
    
    return iconosMap[tipoDocumento] || 'fa-file';
  }

  getTipoDocumentoColor(numeroDocumento: string | null): string {
    if (!numeroDocumento) return 'text-gray-600';
    
    if (numeroDocumento.includes(' C')) return 'text-[#691831]';
    if (numeroDocumento.includes(' P')) return 'text-blue-600';
    return 'text-gray-600';
  }
}