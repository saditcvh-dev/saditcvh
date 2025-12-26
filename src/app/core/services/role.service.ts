import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Role, RoleCount } from '../../core/models/user.model'; // <-- Importar RoleCount
import { ApiResponse } from '../../core/models/api-response.model'; 

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/roles`;

  constructor() { }

  /**
   * Obtiene la lista de todos los roles (catálogo).
   * @returns Observable<Role[]>
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(this.API_URL, { withCredentials: true }).pipe(
      // Mapear la respuesta para obtener solo el array de datos
      map(response => response.data)
    );
  }

  /**
   * NUEVO: Obtiene el conteo de usuarios para cada rol.
   * Endpoint: /roles/counts
   * @returns Observable<RoleCount[]>
   */
  getRoleCounts(): Observable<RoleCount[]> {
    return this.http.get<ApiResponse<RoleCount[]>>(`${this.API_URL}/counts`, { withCredentials: true }).pipe(
      map(response => response.data)
    );
  }
}