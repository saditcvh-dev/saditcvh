import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface DocumentoReciente {
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
  
  // Métodos que vienen del backend
  getEstadoTexto?: () => string;
  getEstadoColor?: () => string;
  getTiempoTranscurrido?: () => string;
  getUsuarioDisplay?: () => string;
}

interface DocumentosResponse {
  success: boolean;
  data: DocumentoReciente[];
  metadata: {
    total: number;
    generated_at: string;
  };
  message?: string;
  error?: string;
}

@Component({
  selector: 'app-exp-recent',
  standalone: false,
  templateUrl: './exp-recent.html',
})
export class ExpRecentComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:4000/api/reports/reporte-digitalizacion/ultimos-documentos';
  private refreshInterval = 30000;
  
  documentos: DocumentoReciente[] = [];
  isLoading = true;
  hasError = false;
  errorMessage = '';
  lastUpdateTime: Date | null = null;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('📄 Iniciando componente de expedientes recientes...');
    this.loadDocumentosRecientes();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /** ===============================
   *  CARGA DE DOCUMENTOS RECIENTES
   *  =============================== */
  private loadDocumentosRecientes(): void {
    this.isLoading = true;
    this.hasError = false;
    
    console.log('📥 Cargando documentos recientes...');
    
    this.http.get<DocumentosResponse>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('❌ Error cargando documentos recientes:', error);
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
        console.log('📄 Respuesta de documentos recientes:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          console.log('✅ Documentos recientes cargados exitosamente');
          
          // Procesar datos del backend
          this.documentos = this.procesarDocumentos(response.data);
          this.hasError = false;
        } else {
          console.log('⚠️ No se encontraron documentos recientes, usando datos de ejemplo');
          this.documentos = this.getDocumentosEjemplo();
          
          if (response.message) {
            console.warn('Advertencia:', response.message);
          }
        }
        
        this.isLoading = false;
        this.lastUpdateTime = new Date();
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        console.log('🔄 Estado actualizado, isLoading:', this.isLoading);
        console.log('📊 Documentos cargados:', this.documentos.length);
      });
  }

  /** ===============================
   *  PROCESAR DOCUMENTOS DEL BACKEND
   *  =============================== */
  private procesarDocumentos(datos: DocumentoReciente[]): any[] {
    return datos.map(doc => {
      // Si el backend ya incluye los métodos, usarlos
      if (doc.getEstadoTexto && doc.getEstadoColor && doc.getTiempoTranscurrido && doc.getUsuarioDisplay) {
        return doc;
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
            'sin_archivo': 'Sin archivo'
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

  /** ===============================
   *  DATOS DE EJEMPLO (para desarrollo)
   *  =============================== */
  private getDocumentosEjemplo(): any[] {
    return [
      {
        documento_id: 1,
        numero_documento: '1 80-12-0001-0001 C',
        titulo: 'Documento de prueba 1',
        estado_digitalizacion: 'completado',
        fecha_creacion: new Date().toISOString(),
        archivo_info: {
          tiene_archivo: true,
          estado_ocr: 'procesado',
          nombre_archivo: 'documento_1.pdf'
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
        estado_digitalizacion: 'en_proceso',
        fecha_creacion: new Date(Date.now() - 3600000).toISOString(),
        archivo_info: {
          tiene_archivo: true,
          estado_ocr: 'en_proceso',
          nombre_archivo: 'documento_2.pdf'
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
      }
    ];
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.subscribe(() => {
        console.log('🔄 Actualizando documentos recientes automáticamente...');
        this.loadDocumentosRecientes();
      })
    );
  }

  /** ===============================
   *  MANEJO DE ERRORES
   *  =============================== */
  private handleError(error: any): void {
    console.error('❌ Error en componente de expedientes recientes:', error);
    
    this.hasError = true;
    this.errorMessage = this.getErrorMessage(error);
    
    // Usar datos de ejemplo
    this.documentos = this.getDocumentosEjemplo();
    this.isLoading = false;
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) return 'No se puede conectar con el servidor';
    if (error.status === 404) return 'Servicio de documentos no disponible';
    if (error.status === 500) return 'Error interno del servidor';
    return 'Error al cargar documentos recientes';
  }

  /** ===============================
   *  MÉTODOS PARA LA VISTA
   *  =============================== */
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
    
    // Buscar en el número del documento
    return iconosMap[tipoDocumento] || 'fa-file';
  }

  getTipoDocumentoColor(numeroDocumento: string | null): string {
    if (!numeroDocumento) return 'text-gray-600';
    
    if (numeroDocumento.includes(' C')) return 'text-[#691831]';
    if (numeroDocumento.includes(' P')) return 'text-blue-600';
    return 'text-gray-600';
  }

  getLastUpdateTime(): string {
    if (!this.lastUpdateTime) return 'Nunca';
    
    return this.lastUpdateTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshDocumentos(): void {
    console.log('🔄 Recargando documentos recientes manualmente...');
    this.isLoading = true;
    this.hasError = false;
    this.loadDocumentosRecientes();
  }

  verExpediente(documentoId: number): void {
    console.log(`🔍 Ver expediente: ${documentoId}`);
    // Aquí puedes implementar la navegación al detalle del documento
    // Ejemplo: this.router.navigate(['/documentos', documentoId]);
  }

  verTodosDocumentos(): void {
    console.log('📂 Ver todos los documentos');
    // Navegar a la lista completa de documentos
    // Ejemplo: this.router.navigate(['/documentos']);
  }
}