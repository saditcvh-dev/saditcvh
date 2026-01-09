import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { Municipio, MunicipioResponseTerritory, UserTerritory } from '../models/user.model';
import { MunicipioFilters, MunicipioResponse } from '../models/municipio.model';


@Injectable({
  providedIn: 'root'
})
export class MunicipioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/municipios`;
  private readonly apiUrlUsuarios = `${environment.apiUrl}/users/my-territories`;

  private municipiosSignal = signal<UserTerritory[]>([]);
  private currentMunicipioSignal = signal<UserTerritory | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  readonly territories = signal<UserTerritory[]>([]);

  readonly totalTerritories = computed(() => this.territories().length);

  readonly municipios = computed(() => this.municipiosSignal());
  municipios$ = toObservable(this.municipios);

  readonly currentMunicipio = computed(() => this.currentMunicipioSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  crear(municipio: Omit<Municipio, 'id'>): Observable<MunicipioResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<MunicipioResponse>(this.apiUrl, municipio).pipe(
      tap({
        next: (response) => {
          if (response.success && response.data) {
            const nuevoMunicipio = response.data as UserTerritory;
            this.municipiosSignal.update(municipios => [...municipios, nuevoMunicipio]);
            this.currentMunicipioSignal.set(nuevoMunicipio);
          }
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.message || 'Error al crear el municipio');
          this.loadingSignal.set(false);
        }
      })
    );
  }


  loadMyTerritories(): Observable<MunicipioResponseTerritory> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<MunicipioResponseTerritory>(this.apiUrlUsuarios,{withCredentials: true}).pipe(
      tap({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            this.municipiosSignal.set(response.data);
          }
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.message || 'Error al obtener municipios');
          this.loadingSignal.set(false);
        }
      })
    );
  }

  // obtenerTodos(): Observable<MunicipioResponse> {
  //   this.loadingSignal.set(true);
  //   this.errorSignal.set(null);

  //   return this.http.get<MunicipioResponse>(this.apiUrl).pipe(
  //     tap({
  //       next: (response) => {
  //         if (response.success && Array.isArray(response.data)) {
  //           this.municipiosSignal.set(response.data);
  //         }
  //         this.loadingSignal.set(false);
  //       },
  //       error: (error) => {
  //         this.errorSignal.set(error.message || 'Error al obtener municipios');
  //         this.loadingSignal.set(false);
  //       }
  //     })
  //   );
  // }

  // obtenerPorId(id: number): Observable<MunicipioResponse> {
  //   this.loadingSignal.set(true);
  //   this.errorSignal.set(null);

  //   return this.http.get<MunicipioResponse>(`${this.apiUrl}/${id}`).pipe(
  //     tap({
  //       next: (response) => {
  //         if (response.success && response.data) {
  //           this.currentMunicipioSignal.set(response.data as Municipio);
  //         }
  //         this.loadingSignal.set(false);
  //       },
  //       error: (error) => {
  //         this.errorSignal.set(error.message || 'Error al obtener el municipio');
  //         this.loadingSignal.set(false);
  //       }
  //     })
  //   );
  // }

  // obtenerPorNum(num: number): Observable<MunicipioResponse> {
  //   this.loadingSignal.set(true);
  //   this.errorSignal.set(null);

  //   return this.http.get<MunicipioResponse>(`${this.apiUrl}/num/${num}`).pipe(
  //     tap({
  //       next: (response) => {
  //         if (response.success && response.data) {
  //           this.currentMunicipioSignal.set(response.data as UserTerritory);
  //         }
  //         this.loadingSignal.set(false);
  //       },
  //       error: (error) => {
  //         this.errorSignal.set(error.message || 'Error al obtener el municipio por número');
  //         this.loadingSignal.set(false);
  //       }
  //     })
  //   );
  // }

  // buscarPorNombre(filtros: MunicipioFilters): Observable<MunicipioResponse> {
  //   this.loadingSignal.set(true);
  //   this.errorSignal.set(null);

  //   let params = new HttpParams();

  //   if (filtros.nombre) {
  //     params = params.set('nombre', filtros.nombre);
  //   }
  //   if (filtros.page) {
  //     params = params.set('page', filtros.page.toString());
  //   }
  //   if (filtros.limit) {
  //     params = params.set('limit', filtros.limit.toString());
  //   }

  //   return this.http.get<MunicipioResponse>(`${this.apiUrl}/buscar`, { params }).pipe(
  //     tap({
  //       next: (response) => {
  //         if (response.success && Array.isArray(response.data)) {
  //           this.municipiosSignal.set(response.data);
  //         }
  //         this.loadingSignal.set(false);
  //       },
  //       error: (error) => {
  //         this.errorSignal.set(error.message || 'Error al buscar municipios');
  //         this.loadingSignal.set(false);
  //       }
  //     })
  //   );
  // }

  // actualizar(id: number, municipio: Partial<Municipio>): Observable<MunicipioResponse> {
  //   this.loadingSignal.set(true);
  //   this.errorSignal.set(null);

  //   return this.http.put<MunicipioResponse>(`${this.apiUrl}/${id}`, municipio).pipe(
  //     tap({
  //       next: (response) => {
  //         if (response.success && response.data) {
  //           const municipioActualizado = response.data as Municipio;

  //           // Actualizar en la lista
  //           this.municipiosSignal.update(municipios => 
  //             municipios.map(m => m.id === id ? municipioActualizado : m)
  //           );

  //           // Actualizar el municipio actual si es el mismo
  //           this.currentMunicipioSignal.update(current => 
  //             current?.id === id ? municipioActualizado : current
  //           );
  //         }
  //         this.loadingSignal.set(false);
  //       },
  //       error: (error) => {
  //         this.errorSignal.set(error.message || 'Error al actualizar el municipio');
  //         this.loadingSignal.set(false);
  //       }
  //     })
  //   );
  // }

  // eliminar(id: number): Observable<MunicipioResponse> {
  //   this.loadingSignal.set(true);
  //   this.errorSignal.set(null);

  //   return this.http.delete<MunicipioResponse>(`${this.apiUrl}/${id}`).pipe(
  //     tap({
  //       next: (response) => {
  //         if (response.success) {
  //           // Remover de la lista
  //           this.municipiosSignal.update(municipios => 
  //             municipios.filter(m => m.id !== id)
  //           );

  //           // Limpiar municipio actual si es el eliminado
  //           this.currentMunicipioSignal.update(current => 
  //             current?.id === id ? null : current
  //           );
  //         }
  //         this.loadingSignal.set(false);
  //       },
  //       error: (error) => {
  //         this.errorSignal.set(error.message || 'Error al eliminar el municipio');
  //         this.loadingSignal.set(false);
  //       }
  //     })
  //   );
  // }

  // Métodos para manejar el estado local
  setCurrentMunicipio(municipio: UserTerritory | null): void {
    this.currentMunicipioSignal.set(municipio);
  }

  clearCurrentMunicipio(): void {
    this.currentMunicipioSignal.set(null);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  // Función para resetear el estado
  reset(): void {
    this.municipiosSignal.set([]);
    this.currentMunicipioSignal.set(null);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}