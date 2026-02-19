// carga-masiva.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subject } from 'rxjs';
import { switchMap, takeWhile, startWith, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ArchivoProcesado {
  nombreArchivo: string;
  documentoId: number | null;
  metadata: any;
  fechaProcesado: string | null;
}

// export interface LoteOCR {
//   loteId: string;
//   totalArchivos: number;
//   completados: number;
//   fallados: number;
//   porcentaje: number;
//   ultimoProceso: string;
//   errores: string[];
//   archivosProcesados: ArchivoProcesado[];
// }

export interface LoteOCR {
  loteId: string;
  tipoProceso: 'NORMAL' | 'OCR';
  origen: string;

  totalArchivos: number;
  completados: number;
  fallados: number;
  porcentaje: number;

  ultimoProceso: string;
  errores: string[];
  archivosProcesados: ArchivoProcesado[];
}


export interface EstadoOCR {
  success: boolean;
  loteId: string;
  total: number;
  conteo: {
    completado?: number;
    pendiente?: number;
    procesando?: number;
    fallado?: number;
  };
  porcentaje: number;
  completado: number;
  pendiente: number;
  procesando: number;
  fallado: number;
}

export interface ResultadoOCR {
  total: number;
  conteo: {
    completado?: number;
    pendiente?: number;
    procesando?: number;
    fallado?: number;
  };
  resultados: Array<{
    nombreArchivo: string;
    estado: string;
    error?: string;
    documentoId?: number;
    autorizacionId?: number;
    numeroAutorizacion?: string;
    intentos: number;
    fechaCreacion: string;
    fechaProcesado?: string;
  }>;
  todosCompletados: boolean;
  tieneErrores: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CargaMasivaService {
  private readonly baseUrl = `${environment.apiUrl}/carga-masiva`;
  
  // Subjects para comunicación entre componentes
  private loteProcesando = new BehaviorSubject<string | null>(null);
  private estadoLote = new BehaviorSubject<EstadoOCR | null>(null);
  private resultadoLote = new BehaviorSubject<ResultadoOCR | null>(null);

  // Observables públicos
  public loteProcesando$ = this.loteProcesando.asObservable();
  public estadoLote$ = this.estadoLote.asObservable();
  public resultadoLote$ = this.resultadoLote.asObservable();

  constructor(private http: HttpClient) {}

  // Subir archivo comprimido
  subirArchivoComprimido(archivo: File, useOcr: boolean = false): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('useOcr', String(useOcr));

    return this.http.post<any>(
      `${this.baseUrl}/comprimido`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
        withCredentials: true
      }
    ).pipe(
      tap(event => {
        // Si la respuesta contiene un loteId, actualizar el subject
        if (event.type === 4 && event.body && event.body.loteId) {
          this.loteProcesando.next(event.body.loteId);
        }
      })
    );
  }

  // Subir múltiples PDFs
  subirMultiplesPDFs(archivos: File[], useOcr: boolean = false): Observable<HttpEvent<any>> {
    const formData = new FormData();
    archivos.forEach((archivo: File) => {
      formData.append('archivos', archivo);
    });
    formData.append('useOcr', String(useOcr));

    return this.http.post<any>(
      `${this.baseUrl}/pdfs-multiples`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
        withCredentials: true
      }
    ).pipe(
      tap(event => {
        // Si la respuesta contiene un loteId, actualizar el subject
        if (event.type === 4 && event.body && event.body.loteId) {
          this.loteProcesando.next(event.body.loteId);
        }
      })
    );
  }

  // Obtener estado de un lote OCR
  obtenerEstadoOCR(loteId: string): Observable<EstadoOCR> {
    return this.http.get<EstadoOCR>(
      `${this.baseUrl}/estado-ocr/${loteId}`,
      { withCredentials: true }
    ).pipe(
      tap(estado => this.estadoLote.next(estado))
    );
  }

  // Obtener resultados de un lote OCR
  obtenerResultadosOCR(loteId: string): Observable<ResultadoOCR> {
    return this.http.get<ResultadoOCR>(
      `${this.baseUrl}/resultados-ocr/${loteId}`,
      { withCredentials: true }
    ).pipe(
      tap(resultados => this.resultadoLote.next(resultados))
    );
  }

  // Monitorear un lote OCR con polling
  monitorearLoteOCR(loteId: string, intervalo: number = 10000): Observable<EstadoOCR> {
    return interval(intervalo).pipe(
      startWith(0),
      switchMap(() => this.obtenerEstadoOCR(loteId)),
      takeWhile((estado: EstadoOCR) => estado.porcentaje < 100, true)
    );
  }

  // Listar lotes del usuario
  listarLotesUsuario(limit: number = 20, offset: number = 0): Observable<{success: boolean, lotes: LoteOCR[]}> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<{success: boolean, lotes: LoteOCR[]}>(
      `${this.baseUrl}/lotes`,
      { 
        params,
        withCredentials: true 
      }
    );
  }

  // Monitorear y obtener resultados completos cuando termine
  monitorearLoteCompleto(loteId: string): Observable<ResultadoOCR> {
    const subject = new Subject<ResultadoOCR>();

    // Iniciar monitoreo del estado
    this.monitorearLoteOCR(loteId).subscribe({
      next: (estado) => {
        // Cuando esté completo, obtener resultados detallados
        if (estado.porcentaje === 100) {
          this.obtenerResultadosOCR(loteId).subscribe({
            next: (resultados) => {
              subject.next(resultados);
              subject.complete();
              this.loteProcesando.next(null); // Limpiar lote actual
            },
            error: (err) => subject.error(err)
          });
        }
      },
      error: (err) => subject.error(err)
    });

    return subject.asObservable();
  }

  // Cancelar monitoreo de lote actual
  cancelarMonitoreo() {
    this.loteProcesando.next(null);
    this.estadoLote.next(null);
    this.resultadoLote.next(null);
  }

  // Obtener lote actual
  getLoteActual(): string | null {
    return this.loteProcesando.value;
  }

  // Limpiar todos los estados
  limpiarEstados() {
    this.loteProcesando.next(null);
    this.estadoLote.next(null);
    this.resultadoLote.next(null);
  }

  // Método auxiliar para determinar tipo de archivo (opcional)
  private obtenerTipoArchivo(archivo: File): string {
    const nombre = archivo.name.toLowerCase();
    if (nombre.endsWith('.zip')) return 'zip';
    if (nombre.endsWith('.rar')) return 'rar';
    return archivo.type;
  }
  
}