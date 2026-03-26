import { Injectable, computed, inject, signal } from '@angular/core';
// import { environment } from '../../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { ActualizarAutorizacionDto, Autorizacion, BusquedaAutorizacion, CrearAutorizacionDto } from '../models/Autorizacion.model';
import { PaginatedResponse } from '../models/paginated-response.model';

interface AutorizacionState {
  autorizaciones: Autorizacion[];
  autorizacionActual: Autorizacion | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  filtros: BusquedaAutorizacion | null;
}

@Injectable({
  providedIn: 'root',
})
export class AutorizacionService {
  private apiUrl = `${environment.apiUrl}/autorizacion`;
  private http = inject(HttpClient);

  private state = signal<AutorizacionState>({
    autorizaciones: [],
    autorizacionActual: null,
    pagination: {
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 0
    },
    loading: false,
    error: null,
    filtros: null
  });
  // public filtros$ = toObservable(this.filtros);

  public autorizaciones = computed(() => this.state().autorizaciones);
  autorizaciones$ = toObservable(this.autorizaciones);

  public autorizacionActual = computed(() => this.state().autorizacionActual);

  public pagination = computed(() => this.state().pagination);

  public loading = computed(() => this.state().loading);

  public error = computed(() => this.state().error);

  public filtros = computed(() => this.state().filtros);
  public filtros$ = toObservable(this.filtros);

  private page = signal(1);
  private limit = signal(5);
  private filtrosSignal = signal<BusquedaAutorizacion | null>(null);
  private refreshTrigger = signal(0);


  private autorizacionesParams = computed(() => ({
    page: this.page(),
    limit: this.limit(),
    filtros: this.filtrosSignal(),
    refresh: this.refreshTrigger()
  }));
  private autorizacionesParams$ = toObservable(this.autorizacionesParams);

  public autorizacionesPaginadas = toSignal(
    this.autorizacionesParams$.pipe(
      tap(() => this.updateState({ loading: true, error: null })),

      switchMap(({ page, limit, filtros }: { page: number; limit: number; filtros: BusquedaAutorizacion | null }) => {
        if (!filtros) {
          return this.getAutorizacionesApi(page, limit);
        }
        // Si hay texto de búsqueda → POST /buscar
        if (filtros.search) {
          return this.buscarAutorizacionesApi(filtros, page, limit);
        }
        // Si solo hay filtros de campo (municipioId, activo, etc.) → GET con params
        return this.getAutorizacionesApi(page, limit, filtros);
      }),

      tap((response: PaginatedResponse<Autorizacion>) => {
        const { currentPage, totalPages, totalItems, itemsPerPage } = response.pagination || (response as any);
        
        this.updateState({
          autorizaciones: this.page() === 1 
            ? response.data 
            : [...this.state().autorizaciones, ...response.data],
          pagination: {
            page: currentPage || this.page(),
            limit: itemsPerPage || this.limit(),
            total: totalItems || 0,
            totalPages: totalPages || 0
          },
          loading: false
        });
      }),

      shareReplay(1)
    ),
    { initialValue: null }
  );


  constructor() { }

  setPage(page: number): void {
    this.page.set(page);
  }

  cargarMas(): void {
    const { page, totalPages } = this.state().pagination;
    if (page < totalPages) {
      this.page.set(page + 1);
    }
  }

  setLimit(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
  }

  setFiltros(filtros: BusquedaAutorizacion | null): void {
    this.filtrosSignal.set(filtros);
    this.page.set(1);
    this.updateState({ filtros });

  }

  reset(): void {
    this.page.set(1);
    this.limit.set(10);
    this.filtrosSignal.set(null);

    this.updateState({
      autorizaciones: [],
      autorizacionActual: null,
      filtros: null,
      loading: false,
      error: null
    });
  }

  refresh(): void {
    this.refreshTrigger.update(v => v + 1);
  }

  // Métodos privados de API
  private getAutorizacionesApi(page: number, limit: number, filtros?: BusquedaAutorizacion | null): Observable<PaginatedResponse<Autorizacion>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filtros?.municipioId) params = params.set('municipioId', filtros.municipioId.toString());
    if (filtros?.modalidadId) params = params.set('modalidadId', filtros.modalidadId.toString());
    if (filtros?.tipoId) params = params.set('tipoId', filtros.tipoId.toString());
    if (filtros?.activo !== undefined) params = params.set('activo', filtros.activo.toString());

    return this.http.get<PaginatedResponse<Autorizacion>>(this.apiUrl, { params, withCredentials: true });
  }

  private buscarAutorizacionesApi(filtros: BusquedaAutorizacion, page: number, limit: number): Observable<PaginatedResponse<Autorizacion>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.post<PaginatedResponse<Autorizacion>>(`${this.apiUrl}/buscar`, filtros, { params, withCredentials: true });
  }

  getAutorizacionPorId(id: number): Observable<{ success: boolean; message: string; data: Autorizacion }> {

    this.updateState({ loading: true, error: null });

    return this.http.get<{ success: boolean; message: string; data: Autorizacion }>(`${this.apiUrl}/${id}`, { withCredentials: true }).pipe(
      tap(response => {
        if (response.success) {
          this.updateState({
            autorizacionActual: response.data,
            loading: false
          });
        } else {
          this.updateState({
            error: response.message,
            loading: false
          });
        }
      })
    );
  }

  // Obtener autorización por número
  getAutorizacionPorNumero(numero: string): Observable<{ success: boolean; message: string; data: Autorizacion }> {
    this.updateState({ loading: true, error: null });

    return this.http.get<{ success: boolean; message: string; data: Autorizacion }>(`${this.apiUrl}/numero/${numero}`, { withCredentials: true }).pipe(
      tap(response => {
        if (response.success) {
          this.updateState({
            autorizacionActual: response.data,
            loading: false
          });
        } else {
          this.updateState({
            error: response.message,
            loading: false
          });
        }
      })
    );
  }
  // , {
  //     responseType: 'blob',
  //     withCredentials: true
  //   }
  // Crear nueva autorización (con refresh automático)
  crearAutorizacion(datos: CrearAutorizacionDto): Observable<{ success: boolean; message: string; data: Autorizacion }> {
    this.updateState({ loading: true, error: null });

    return this.http.post<{ success: boolean; message: string; data: Autorizacion }>(this.apiUrl, datos, { withCredentials: true }).pipe(
      tap(response => {
        this.updateState({ loading: false });
        if (response.success) {
          this.refresh(); // Refrescar la lista
        } else {
          this.updateState({ error: response.message });
        }
      })
    );
  }

  // Actualizar autorización (con refresh automático)
  actualizarAutorizacion(id: number, datos: ActualizarAutorizacionDto): Observable<{ success: boolean; message: string; data: Autorizacion }> {
    this.updateState({ loading: true, error: null });

    return this.http.put<{ success: boolean; message: string; data: Autorizacion }>(`${this.apiUrl}/${id}`, datos).pipe(
      tap(response => {
        this.updateState({ loading: false });
        if (response.success) {
          this.refresh(); // Refrescar la lista
          this.updateState({ autorizacionActual: response.data });
        } else {
          this.updateState({ error: response.message });
        }
      })
    );
  }

  // Eliminar autorización (con refresh automático)
  eliminarAutorizacion(id: number): Observable<{ success: boolean; message: string }> {
    this.updateState({ loading: true, error: null });

    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(response => {
        this.updateState({ loading: false });
        if (response.success) {
          this.refresh(); // Refrescar la lista
        } else {
          this.updateState({ error: response.message });
        }
      })
    );
  }

  // Cambiar estado (activo/inactivo) (con refresh automático)
  cambiarEstado(id: number, activo: boolean): Observable<{ success: boolean; message: string; data: Autorizacion }> {
    this.updateState({ loading: true, error: null });

    return this.http.patch<{ success: boolean; message: string; data: Autorizacion }>(
      `${this.apiUrl}/${id}/estado`,
      { activo }
    ).pipe(
      tap(response => {
        this.updateState({ loading: false });
        if (response.success) {
          this.refresh(); // Refrescar la lista
        } else {
          this.updateState({ error: response.message });
        }
      })
    );
  }

  // Generar reporte de autorizaciones
  generarReporte(filtros?: BusquedaAutorizacion): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/reporte`, filtros || {}, {
      responseType: 'blob'
    });
  }

  // Métodos de conveniencia para obtener autorizaciones activas/inactivas
  getAutorizacionesActivas(): void {
    this.setFiltros({ activo: true } as BusquedaAutorizacion);
  }

  getAutorizacionesInactivas(): void {
    this.setFiltros({ activo: false } as BusquedaAutorizacion);
  }

  limpiarFiltros(): void {
    this.setFiltros(null);
  }

  // Descargar reporte como PDF
  descargarReportePDF(filtros?: BusquedaAutorizacion): void {
    this.generarReporte(filtros).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-autorizaciones-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  // Limpiar autorización actual
  limpiarAutorizacionActual(): void {
    this.updateState({ autorizacionActual: null });
  }

  private updateState(partialState: Partial<AutorizacionState>): void {
    this.state.update(current => ({
      ...current,
      ...partialState
    }));
  }
}
