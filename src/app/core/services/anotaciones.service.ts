// services/anotaciones.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PdfComment {
  id: number;
  page: number;
  text: string;
  date: Date;
  position?: { x: number; y: number };
  color: string;
  author?: string;
  resolved?: boolean;
}

export interface AnotacionItem {
  id: number;
  archivo_nombre?: string;
  documento_url?: string;
  usuario_id: number;
  comentarios: PdfComment[];
  metadata: any;
  created_at: string;
}

export interface AnotacionResponse {
  success: boolean;
  message: string;
  data: AnotacionItem[]; // Ahora es un array
}

export interface SaveAnnotationsRequest {
  archivo_nombre?: string;
  documento_id?: number;
  pdf_url?: string;
  documento_metadata?: any;
  comentarios: PdfComment[];
}

@Injectable({
  providedIn: 'root'
})
export class AnotacionesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/anotaciones`;

  // ========== METODOS POR NOMBRE DE ARCHIVO ==========

  // Obtener TODAS las anotaciones por nombre de archivo (sin filtrar por usuario)
  obtenerTodasAnotacionesPorArchivo(id: number): Observable<AnotacionResponse> {
    console.log('Obteniendo TODAS las anotaciones para archivo:', id);

    return this.http.get<AnotacionResponse>(
      `${this.apiUrl}/documento/${encodeURIComponent(id)}`,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.success && response.data) {
          const totalComentarios = response.data.reduce((total, anotacion) => 
            total + (anotacion.comentarios?.length || 0), 0);
          console.log(`${response.data.length} anotaciones cargadas para ${id}:`,
            totalComentarios, 'comentarios totales');
        } else {
          console.log('No hay anotaciones para este archivo en el servidor');
        }
      }),
      catchError(this.handleError)
    );
  }

  // Obtener anotaciones del USUARIO ACTUAL por nombre de archivo
  obtenerAnotacionesPorArchivo(nombreArchivo: string): Observable<AnotacionResponse> {
    console.log('Obteniendo anotaciones para archivo:', nombreArchivo);

    return this.http.get<AnotacionResponse>(
      `${this.apiUrl}/archivo/${encodeURIComponent(nombreArchivo)}`,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.success && response.data && response.data.length > 0) {
          const firstAnotacion = response.data[0];
          console.log(`Anotaciones cargadas para ${nombreArchivo}:`,
            firstAnotacion.comentarios?.length || 0, 'comentarios');
        } else {
          console.log('No hay anotaciones para este archivo en el servidor');
        }
      }),
      catchError(this.handleError)
    );
  }

  // Guardar anotaciones por nombre de archivo
  guardarAnotacionesPorArchivo(nombreArchivo: string, pdf_url: string, comentarios: PdfComment[]): Observable<AnotacionResponse> {
    console.log('Guardando anotaciones por nombre de archivo:', nombreArchivo);
    console.log('Comentarios a guardar:', comentarios.length);

    return this.http.post<AnotacionResponse>(`${this.apiUrl}/guardar-por-archivo`, {
      archivo_nombre: nombreArchivo,
      pdf_url: pdf_url,
      comentarios: this.prepararComentariosParaBackend(comentarios)
    }, { withCredentials: true }).pipe(
      tap((response) => {
        if (response.success) {
          console.log('Anotaciones guardadas por nombre de archivo');
        } else {
          console.warn('Respuesta del servidor con exito false:', response);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Vaciar anotaciones por nombre de archivo
  vaciarAnotacionesPorArchivo(nombreArchivo: string): Observable<any> {
    console.log('Vaciando anotaciones para archivo:', nombreArchivo);

    return this.http.post(`${this.apiUrl}/vaciar-por-archivo`, {
      archivo_nombre: nombreArchivo
    }, { withCredentials: true }).pipe(
      tap(() => console.log('Anotaciones vaciadas por nombre de archivo')),
      catchError(this.handleError)
    );
  }

  // Eliminar anotaciones por nombre de archivo
  eliminarAnotacionesPorArchivo(nombreArchivo: string): Observable<any> {
    console.log('Eliminando anotaciones para archivo:', nombreArchivo);

    return this.http.delete(
      `${this.apiUrl}/archivo/${encodeURIComponent(nombreArchivo)}`,
      { withCredentials: true }
    ).pipe(
      tap(() => console.log('Anotaciones eliminadas por nombre de archivo')),
      catchError(this.handleError)
    );
  }

  // Exportar anotaciones por nombre de archivo
  exportarAnotacionesPorArchivo(nombreArchivo: number): Observable<Blob> {
    console.log('Exportando anotaciones para archivo:', nombreArchivo);

    return this.http.get(`${this.apiUrl}/exportar-archivo/${encodeURIComponent(nombreArchivo)}`, {
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      tap(() => console.log('Exportando anotaciones por nombre de archivo...')),
      catchError(this.handleError)
    );
  }

  // Metodo auxiliar para descargar exportacion por nombre de archivo
  descargarExportacionPorArchivo(nombreArchivo: number, nombreDisplay?: string): void {
    console.log('Descargando exportacion para archivo:', nombreArchivo);

    this.exportarAnotacionesPorArchivo(nombreArchivo).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nombreDescarga = nombreDisplay || nombreArchivo;
        a.download = `${this.sanitizarNombreArchivo(nombreDescarga.toString())}_anotaciones.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('Anotaciones exportadas por nombre de archivo');
      },
      error: (error) => {
        console.error('Error al exportar por nombre de archivo:', error);
        this.mostrarErrorExportacion(error);
      }
    });
  }

  // ========== METODOS ORIGINALES (MANTENER PARA COMPATIBILIDAD) ==========

  // Guardar anotaciones por documentoId (original)
  guardarAnotaciones(documentoId: number, comentarios: PdfComment[]): Observable<AnotacionResponse> {
    return this.http.post<AnotacionResponse>(`${this.apiUrl}/guardar`, {
      documento_id: documentoId,
      comentarios: this.prepararComentariosParaBackend(comentarios)
    }, { withCredentials: true }).pipe(
      tap((response) => {
        if (response.success) {
          console.log('Anotaciones guardadas por documentoId');
        }
      }),
      catchError(this.handleError)
    );
  }

  // Obtener anotaciones propias de un documento por documentoId (original)
  obtenerAnotaciones(documentoId: number): Observable<AnotacionResponse> {
    return this.http.get<AnotacionResponse>(
      `${this.apiUrl}/documento-id/${documentoId}`,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.success && response.data && response.data.length > 0) {
          const firstAnotacion = response.data[0];
          console.log(`Anotaciones cargadas por documentoId: ${firstAnotacion.comentarios?.length || 0} comentarios`);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Eliminar anotacion especifica (original)
  eliminarAnotacion(anotacionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/eliminar`, {
      anotacion_id: anotacionId
    }, { withCredentials: true }).pipe(
      tap(() => console.log('Anotacion eliminada por ID')),
      catchError(this.handleError)
    );
  }

  // Eliminar todas las anotaciones de un documento por documentoId (original)
  eliminarAnotacionesPorDocumento(documentoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/eliminar-por-documento`, {
      documento_id: documentoId
    }, { withCredentials: true }).pipe(
      tap(() => console.log('Anotaciones eliminadas por documentoId')),
      catchError(this.handleError)
    );
  }

  // Vaciar comentarios de una anotacion (original)
  vaciarAnotacion(anotacionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/vaciar`, {
      anotacion_id: anotacionId
    }, { withCredentials: true }).pipe(
      tap(() => console.log('Anotacion vaciada por ID')),
      catchError(this.handleError)
    );
  }

  // Vaciar comentarios del documento actual por documentoId (original)
  vaciarAnotacionesPorDocumento(documentoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/vaciar-por-documento`, {
      documento_id: documentoId
    }, { withCredentials: true }).pipe(
      tap(() => console.log('Anotaciones vaciadas por documentoId')),
      catchError(this.handleError)
    );
  }

  // Exportar anotaciones como JSON por documentoId (original)
  exportarAnotaciones(documentoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportar/${documentoId}`, {
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      tap(() => console.log('Exportando anotaciones por documentoId...')),
      catchError(this.handleError)
    );
  }

  // Metodo auxiliar para descargar exportacion por documentoId (original)
  descargarExportacion(documentoId: number, nombreArchivo: string): void {
    this.exportarAnotaciones(documentoId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.sanitizarNombreArchivo(nombreArchivo)}_anotaciones.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('Anotaciones exportadas por documentoId');
      },
      error: (error) => {
        console.error('Error al exportar por documentoId:', error);
        this.mostrarErrorExportacion(error);
      }
    });
  }

  // ========== METODOS PRIVADOS AUXILIARES ==========

  private prepararComentariosParaBackend(comentarios: PdfComment[]): any[] {
    return comentarios.map(comment => ({
      ...comment,
      date: comment.date.toISOString(),
      author: comment.author
    }));
  }

  private sanitizarNombreArchivo(nombre: string): string {
    return nombre
      .replace(/[^\w\s.-]/gi, '')  // Remover caracteres especiales
      .replace(/\s+/g, '_')        // Espacios por guiones bajos
      .replace(/\.pdf$/i, '');     // Remover extension .pdf
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en AnotacionesService:', error);

    let errorMessage = 'Error desconocido';

    if (error.status === 0) {
      errorMessage = 'Error de conexion. Verifica tu internet.';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado. Por favor, inicia sesion nuevamente.';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  private mostrarErrorExportacion(error: any): void {
    let mensaje = 'Error al exportar anotaciones';
    
    if (error.status === 404) {
      mensaje = 'No hay anotaciones para exportar';
    } else if (error.status === 0) {
      mensaje = 'Error de conexion. No se pudo exportar.';
    } else if (error.error?.message) {
      mensaje = `Error: ${error.error.message}`;
    }
    
    alert(mensaje);
  }

  // ========== METODOS PARA EL COMPONENTE PreviewTab ==========

  // Convertir respuesta del servidor a formato del componente
  parsearComentariosDesdeServidor(anotaciones: AnotacionItem[]): PdfComment[] {
    if (!anotaciones || anotaciones.length === 0) {
      return [];
    }

    // Tomar la primera anotacion (la mas reciente)
    const primeraAnotacion = anotaciones[0];
    if (!primeraAnotacion?.comentarios) {
      return [];
    }

    return primeraAnotacion.comentarios.map((c: any) => ({
      id: c.id || Date.now() + Math.random(),
      page: c.page,
      text: c.text,
      date: new Date(c.date),
      position: c.position,
      color: c.color || '#3B82F6',
      author: c.author,
      resolved: c.resolved || false
    }));
  }

  // Metodo para compatibilidad con ambas versiones
  obtenerComentarios(identificador: number | string): Observable<AnotacionResponse> {
    if (typeof identificador === 'number') {
      return this.obtenerAnotaciones(identificador);
    } 
    // else if (typeof identificador === 'string') {
    //   return this.obtenerTodasAnotacionesPorArchivo(identificador);
    // } 
    else {
      return throwError(() => new Error('Identificador invalido'));
    }
  }

  // Metodo para guardar con ambas versiones
  guardarComentarios(identificador: number | string, pdf_url: string, comentarios: PdfComment[]): Observable<AnotacionResponse> {
    if (typeof identificador === 'number') {
      return this.guardarAnotaciones(identificador, comentarios);
    } else if (typeof identificador === 'string') {
      return this.guardarAnotacionesPorArchivo(identificador, pdf_url, comentarios);
    } else {
      return throwError(() => new Error('Identificador invalido'));
    }
  }

  // Metodo para obtener la primera anotacion de la respuesta
  obtenerPrimeraAnotacion(response: AnotacionResponse): AnotacionItem | null {
    if (response.success && response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  }

  // Nuevo metodo: crear comentario offline (opcional, si necesitas funcionalidad offline)
  crearComentarioOffline(nombreArchivo: string, comentarios: PdfComment[]): void {
    console.warn('Modo offline activado: comentarios guardados temporalmente');
    
    // Solo para debugging - no usar en producción sin una estrategia offline real
    const datos = {
      metadata: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        source: 'offline-mode',
        note: 'Comentarios en modo offline - no guardados en servidor'
      },
      archivo: {
        nombre: nombreArchivo
      },
      anotaciones: comentarios
    };

    console.log('Datos offline (solo para debug):', datos);
  }
}