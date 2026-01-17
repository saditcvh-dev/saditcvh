import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

export interface TipoAutorizacion {
  id: number;
  nombre: string;
  abreviatura: string;
}

@Injectable({
  providedIn: 'root'
})
export class TiposAutorizacionService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tipos-autorizacion`;

  private tiposSignal = signal<TipoAutorizacion[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  readonly tipos = computed(() => this.tiposSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  readonly tipos$ = toObservable(this.tipos);
  reset(): void {
    this.tiposSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }

  getAll(): void {
    if (this.tiposSignal().length > 0) {
      return; 
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http.get<any>(this.apiUrl,{withCredentials: true}).pipe(
      tap({
        next: resp => {
          this.tiposSignal.set(resp?.data ?? []);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.errorSignal.set('Error al cargar tipos de autorización');
          this.loadingSignal.set(false);
        }
      })
    ).subscribe();
  }


  search(term: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('q', term);

    this.http.get<any>(`${this.apiUrl}/search`, { params }).pipe(
      tap({
        next: (resp) => {
          this.tiposSignal.set(resp?.data ?? []);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.errorSignal.set('Error al buscar tipos de autorización');
          this.loadingSignal.set(false);
        }
      })
    ).subscribe();
  }

  create(data: TipoAutorizacion): Observable<any> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(this.apiUrl, data).pipe(
      tap({
        next: () => {
          this.getAll(); 
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.message || 'Error al crear');
          this.loadingSignal.set(false);
        }
      })
    );
  }

  update(id: number, data: TipoAutorizacion): Observable<any> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<any>(`${this.apiUrl}/${id}`, data).pipe(
      tap({
        next: () => {
          this.getAll();
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.message || 'Error al actualizar');
          this.loadingSignal.set(false);
        }
      })
    );
  }

  delete(id: number): Observable<any> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.tiposSignal.update(list => list.filter(t => t.id !== id));
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.message || 'Error al eliminar');
          this.loadingSignal.set(false);
        }
      })
    );
  }

  getById(id: number) {
    return computed(() =>
      this.tiposSignal().find(t => t.id === id) ?? null
    );
  }
}
