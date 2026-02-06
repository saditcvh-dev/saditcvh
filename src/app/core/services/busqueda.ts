import { inject, Injectable, Input, signal } from '@angular/core';
import { AutorizacionTreeNode } from '../models/autorizacion-tree.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface AutocompleteItem {
  tipo: 'autorizacion' | 'documento' | 'archivo';
  label: string;
  value?: string;
  id: number;
  autorizacion_id?: number;
}
export interface FloatingTreeState {
  visible: boolean;
  x: number;
  y: number;
  node: AutorizacionTreeNode | null;
}
@Injectable({ providedIn: 'root' })
export class BusquedaService {




  /*
  funciones para busqueda en arbol
  */
  floatingSearchState = signal<{
    visible: boolean;
    x: number;
    y: number;
    node?: AutorizacionTreeNode | null;
  }>({ visible: false, x: 0, y: 0 });

  // Abrir CENTRADO (ignora x,y del click)
  openCentered() {
    this.floatingSearchState.set({
      visible: true,
      x: 0, y: 0, // CSS centrará automáticamente
      node: null
    });
  }

  close() {
    this.floatingSearchState.set({ visible: false, x: 0, y: 0, node: null });
  }

  // Tu búsqueda existente
  searchTerm = signal('');


  private http = inject(HttpClient);
  // private baseUrl = '/api/busqueda';
  private baseUrl =  `${environment.apiUrl}/busqueda`;


  buscar(term: string): Observable<any> {
    const params = new HttpParams().set('q', term);
    return this.http.get<any>(this.baseUrl, { params ,withCredentials: true});
  }
  autocomplete(term: string): Observable<{ success: boolean; data: AutocompleteItem[] }> {
  const params = new HttpParams().set('q', term);
  return this.http.get<{ success: boolean; data: AutocompleteItem[] }>(
    `${this.baseUrl}/autocomplete`,
    { params, withCredentials: true }
  );
}
  // autocomplete(term: string): Observable<string[]> {
  //   const params = new HttpParams().set('q', term);
  //   return this.http.get<string[]>(`${this.baseUrl}/autocomplete`, { params,withCredentials: true });
  // }

  estadisticas(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/estadisticas`, { withCredentials: true });
  }

  exportar(term: string): Observable<Blob> {
    const params = new HttpParams().set('q', term);
    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob',withCredentials: true
    });
  }
}
