import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map, of } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ArchivoDigital } from '../models/archivo-digital.model';
import { Autorizacion } from '../models/Autorizacion.model';
import { environment } from '../../../environments/environment';

export interface Documento {
  id: number;
  titulo: string;
  descripcion?: string;
  tipoDocumento?: string;
  version: number;
  versionActual: boolean;
  autorizacionId: number;
  fechaDocumento?: string;
  fechaRecepcion?: string;
  estadoDigitalizacion: 'pendiente' | 'en_proceso' | 'digitalizado' | 'revisado' | 'error';
  created_at: string;
  updated_at?: string;
  archivosDigitales?: ArchivoDigital[];
  autorizacion?: Autorizacion;
}


export interface Municipio {
  id: number;
  nombre: string;
}

export interface Modalidad {
  id: number;
  nombre: string;
}


export interface DocumentoRequest {
  titulo: string;
  autorizacionId: number;
  descripcion?: string;
  tipoDocumento?: string;
  fechaDocumento?: string;
  metadata?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/documentos`;
  private documentosState = signal<Documento[]>([]);
  private loadingState = signal<boolean>(false);
  private errorState = signal<string | null>(null);
  selectedDocumentoState = signal<Documento | null>(null);
  // Cache interno de documentos por ID
  private documentosCache = new Map<number, Documento>();

  private autorizacionesCache = new Map<number, Documento[]>();
  documentos = this.documentosState.asReadonly();
  loading = this.loadingState.asReadonly();
  error = this.errorState.asReadonly();
  selectedDocumento = this.selectedDocumentoState.asReadonly();
  // Método para descargar archivo
  descargarArchivo(archivoId: number): Observable<Blob> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.http.get(`${this.apiUrl}/archivo/${archivoId}/descargar`, {
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      tap(() => this.loadingState.set(false)),
      catchError((error: HttpErrorResponse) => {
        this.errorState.set(error.message);
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }


  verificarDocumentosPorAutorizacion(autorizacionId: number): Observable<boolean> {
    return this.http.get<ApiResponse<Documento[]>>(`${this.apiUrl}/autorizacion/${autorizacionId}`, { withCredentials: true }).pipe(
      map(response => response.data && response.data.length > 0),
      catchError(() => of(false))
    );
  }

  cargarDocumentosPorAutorizacion(autorizacionId: number): Observable<Documento[]> {
    this.errorState.set(null);

    // Verificar caché primero
    if (this.autorizacionesCache.has(autorizacionId)) {
      console.log(` Usando caché para autorización ${autorizacionId}`);
      const docs = this.autorizacionesCache.get(autorizacionId)!;
      this.documentosState.set(docs);
      return of(docs); // Retornar Observable para mejor control
    }

    console.log(` Cargando documentos para autorización ${autorizacionId} desde API`);
    this.loadingState.set(true);

    return this.http.get<ApiResponse<Documento[]>>(
      `${this.apiUrl}/autorizacion/${autorizacionId}`, 
      { withCredentials: true }
    ).pipe(
      map(response => response.data),
      tap(docs => {
        // Guardar en caché
        this.autorizacionesCache.set(autorizacionId, docs);
        docs.forEach(doc => this.documentosCache.set(doc.id, doc));
        this.documentosState.set(docs);
        this.loadingState.set(false);
      }),
      catchError(error => {
        this.errorState.set(error.message);
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  // Versión que no retorna Observable (para compatibilidad)
  cargarDocumentosPorAutorizacionVoid(autorizacionId: number): void {
    this.cargarDocumentosPorAutorizacion(autorizacionId).subscribe();
  }

  // cargarDocumentosPorAutorizacion(autorizacionId: number): void {
  //   this.loadingState.set(true);
  //   this.errorState.set(null);

  //   console.log("aqui--")
  //   this.http.get<ApiResponse<Documento[]>>(`${this.apiUrl}/autorizacion/${autorizacionId}`,{withCredentials: true})
  //     .pipe(
  //       catchError(this.handleError)
  //     )
  //     .subscribe({
  //       next: (response) => {
  //         if (response.success) {
  //           this.documentosState.set(response.data);
  //         }
  //         this.loadingState.set(false);
  //       },
  //       error: (error) => {
  //         this.errorState.set(error.message);
  //         this.loadingState.set(false);
  //       }
  //     });
  // }
  // obtenerDocumentoPorId(id: number): void {
  //   this.loadingState.set(true);
  //   this.errorState.set(null);

  //   this.http.get<ApiResponse<Documento>>(`${this.apiUrl}/${id}`,{withCredentials: true})
  //     .pipe(
  //       catchError(this.handleError)
  //     )
  //     .subscribe({
  //       next: (response) => {
  //         if (response.success) {
  //           this.selectedDocumentoState.set(response.data);
  //         }
  //         this.loadingState.set(false);
  //       },
  //       error: (error) => {
  //         this.errorState.set(error.message);
  //         this.loadingState.set(false);
  //       }
  //     });
  // }
  obtenerDocumentoPorId(id: number): void {
    this.errorState.set(null);

    // Primero revisamos si ya tenemos el documento en cache
    if (this.documentosCache.has(id)) {
      this.selectedDocumentoState.set(this.documentosCache.get(id)!);
      return; // No hace falta llamar al backend
    }

    this.loadingState.set(true);

    this.http.get<ApiResponse<Documento>>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(
        catchError(this.handleError)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedDocumentoState.set(response.data);
            this.documentosCache.set(id, response.data); // Guardamos en cache
          }
          this.loadingState.set(false);
        },
        error: (error) => {
          this.errorState.set(error.message);
          this.loadingState.set(false);
        }
      });
  }

  crearDocumento(documentoData: DocumentoRequest, archivo: File): Observable<ApiResponse<Documento>> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const formData = new FormData();

    formData.append('titulo', documentoData.titulo);
    formData.append('autorizacionId', documentoData.autorizacionId.toString());

    if (documentoData.descripcion) {
      formData.append('descripcion', documentoData.descripcion);
    }

    if (documentoData.tipoDocumento) {
      formData.append('tipoDocumento', documentoData.tipoDocumento);
    }

    if (documentoData.fechaDocumento) {
      formData.append('fechaDocumento', documentoData.fechaDocumento);
    }

    if (documentoData.metadata) {
      formData.append('metadata', JSON.stringify(documentoData.metadata));
    }

    if (archivo) {
      formData.append('archivo', archivo);
    }

    return this.http.post<ApiResponse<Documento>>(this.apiUrl, formData, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.success) {
            this.documentosState.update(docs => [...docs, response.data]);
          }
          this.loadingState.set(false);
        }),
        catchError((error) => {
          this.errorState.set(error.message);
          this.loadingState.set(false);
          return throwError(() => error);
        })
      );
  }

  // Método para crear nueva versión
  crearNuevaVersion(documentoId: number, datos: Partial<DocumentoRequest>, archivo: File): Observable<ApiResponse<Documento>> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const formData = new FormData();

    if (datos.titulo) {
      formData.append('titulo', datos.titulo);
    }

    if (datos.descripcion) {
      formData.append('descripcion', datos.descripcion);
    }

    if (datos.fechaDocumento) {
      formData.append('fechaDocumento', datos.fechaDocumento);
    }

    formData.append('archivo', archivo);

    return this.http.post<ApiResponse<Documento>>(`${this.apiUrl}/${documentoId}/version`, formData, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.success) {
            this.documentosState.update(docs =>
              docs.map(doc => doc.id === documentoId ? { ...doc, versionActual: false } : doc)
            );
            this.documentosState.update(docs => [...docs, response.data]);
          }
          this.loadingState.set(false);
        }),
        catchError((error) => {
          this.errorState.set(error.message);
          this.loadingState.set(false);
          return throwError(() => error);
        })
      );
  }

  // Método para actualizar documento (sin archivo)
  actualizarDocumento(id: number, datos: Partial<DocumentoRequest>): Observable<ApiResponse<Documento>> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.http.put<ApiResponse<Documento>>(`${this.apiUrl}/${id}`, datos)
      .pipe(
        tap((response) => {
          if (response.success) {
            // Actualizar el estado local
            this.documentosState.update(docs =>
              docs.map(doc => doc.id === id ? response.data : doc)
            );

            if (this.selectedDocumentoState()?.id === id) {
              this.selectedDocumentoState.set(response.data);
            }
          }
          this.loadingState.set(false);
        }),
        catchError((error) => {
          this.errorState.set(error.message);
          this.loadingState.set(false);
          return throwError(() => error);
        })
      );
  }

  // Método para eliminar documento
  eliminarDocumento(id: number): Observable<ApiResponse<void>> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap((response) => {
          if (response.success) {
            // Remover del estado local
            this.documentosState.update(docs => docs.filter(doc => doc.id !== id));

            if (this.selectedDocumentoState()?.id === id) {
              this.selectedDocumentoState.set(null);
            }
          }
          this.loadingState.set(false);
        }),
        catchError((error) => {
          this.errorState.set(error.message);
          this.loadingState.set(false);
          return throwError(() => error);
        })
      );
  }

  // Método para buscar documentos
  buscarDocumentos(criterios: any): void {
    this.loadingState.set(true);
    this.errorState.set(null);

    this.http.get<ApiResponse<Documento[]>>(this.apiUrl, { params: criterios })
      .pipe(
        catchError(this.handleError)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.documentosState.set(response.data);
          }
          this.loadingState.set(false);
        },
        error: (error) => {
          this.errorState.set(error.message);
          this.loadingState.set(false);
        }
      });
  }


  // Método para obtener estadísticas
  obtenerEstadisticas(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/estadisticas`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    this.errorState.set(errorMessage);
    this.loadingState.set(false);

    return throwError(() => new Error(errorMessage));
  }

  resetearEstado(): void {
    this.documentosState.set([]);
    this.selectedDocumentoState.set(null);
    this.errorState.set(null);
    this.loadingState.set(false);
  }

  resetearError(): void {
    this.errorState.set(null);
  }

  // Computed signals para estadísticas
  totalDocumentos = computed(() => this.documentosState().length);

  documentosDigitalizados = computed(() =>
    this.documentosState().filter(doc => doc.estadoDigitalizacion === 'digitalizado').length
  );

  documentosPorEstado = computed(() => {
    const docs = this.documentosState();
    return {
      pendiente: docs.filter(d => d.estadoDigitalizacion === 'pendiente').length,
      en_proceso: docs.filter(d => d.estadoDigitalizacion === 'en_proceso').length,
      digitalizado: docs.filter(d => d.estadoDigitalizacion === 'digitalizado').length,
      revisado: docs.filter(d => d.estadoDigitalizacion === 'revisado').length,
      error: docs.filter(d => d.estadoDigitalizacion === 'error').length
    };
  });
}