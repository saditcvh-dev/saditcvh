import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Modalidad {
    id: number;
    num: number;
    nombre: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

@Injectable({
    providedIn: 'root'
})
export class ModalidadService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/modalidades`;

    private modalidadesSignal = signal<Modalidad[]>([]);
    private loadingSignal = signal<boolean>(false);
    private errorSignal = signal<string | null>(null);
    private selectedModalidadSignal = signal<Modalidad | null>(null);

    readonly modalidades = computed(() => this.modalidadesSignal());
    readonly loading = computed(() => this.loadingSignal());
    readonly error = computed(() => this.errorSignal());
    readonly selectedModalidad = computed(() => this.selectedModalidadSignal());

    readonly modalidadesOrdenadas = computed(() =>
        [...this.modalidades()].sort((a, b) => a.num - b.num)
    );

    readonly totalModalidades = computed(() => this.modalidades().length);



    loadModalidades(): void {

        if (this.modalidadesSignal().length > 0) return;

        this.loadingSignal.set(true);
        this.errorSignal.set(null);

        this.http.get<ApiResponse<Modalidad[]>>(this.apiUrl).pipe(
            tap({
                next: resp => {
                    if (resp.success) {
                        this.modalidadesSignal.set(resp.data);
                    }
                    this.loadingSignal.set(false);
                },
                error: () => {
                    this.errorSignal.set('Error al cargar modalidades');
                    this.loadingSignal.set(false);
                }
            })
        ).subscribe();
    }


    createModalidad(data: Omit<Modalidad, 'id'>): Observable<ApiResponse<Modalidad>> {
        this.loadingSignal.set(true);

        return this.http.post<ApiResponse<Modalidad>>(this.apiUrl, data).pipe(
            tap({
                next: (resp) => {
                    if (resp.success && resp.data) {
                        this.modalidadesSignal.update(list => [...list, resp.data]);
                        this.selectedModalidadSignal.set(resp.data);
                    }
                    this.loadingSignal.set(false);
                },
                error: () => {
                    this.errorSignal.set('Error al crear modalidad');
                    this.loadingSignal.set(false);
                }
            })
        );
    }

    searchModalidades(searchTerm: string): Observable<ApiResponse<Modalidad[]>> {
        this.loadingSignal.set(true);

        return this.http
            .post<ApiResponse<Modalidad[]>>(`${this.apiUrl}/buscar`, { searchTerm })
            .pipe(
                tap({
                    next: (resp) => {
                        if (resp.success && Array.isArray(resp.data)) {
                            this.modalidadesSignal.set(resp.data);
                        }
                        this.loadingSignal.set(false);
                    },
                    error: () => {
                        this.errorSignal.set('Error en la búsqueda');
                        this.loadingSignal.set(false);
                    }
                })
            );
    }


    getById(id: number) {
        return computed(() =>
            this.modalidadesSignal().find(m => m.id === id) ?? null
        );
    }

    getByNum(num: number) {
        return computed(() =>
            this.modalidadesSignal().find(m => m.num === num) ?? null
        );
    }

    numeroExists(num: number, excludeId?: number): boolean {
        return this.modalidadesSignal().some(m =>
            m.num === num && (!excludeId || m.id !== excludeId)
        );
    }


    selectModalidad(modalidad: Modalidad | null): void {
        this.selectedModalidadSignal.set(modalidad);
    }

    reset(): void {
        this.modalidadesSignal.set([]);
        this.selectedModalidadSignal.set(null);
        this.errorSignal.set(null);
    }
}
