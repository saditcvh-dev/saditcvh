import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, Permission, Municipio, Role, UserTerritory } from '../../core/models/user.model';
import { PaginatedResponse } from '../../core/models/paginated-response.model';
import { ApiResponse } from '../../core/models/api-response.model';

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role_id?: number;
  cargo_id?: number;
  active?: boolean | string;
  sortBy?: 'name' | 'creator' | 'editor';
  order?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/users`;
  private readonly PERMISSIONS_URL = `${environment.apiUrl}/permissions`;
  private readonly MUNICIPIOS_URL = `${environment.apiUrl}/municipios`;
  private readonly ROLES_URL = `${environment.apiUrl}/roles`;

  // --- PERFIL Y TERRITORIOS ---

  /**
   * Obtiene los territorios y permisos del usuario logueado.
   * Útil para guardias de rutas o para habilitar/deshabilitar botones en la UI global.
   */
  getMyTerritories(): Observable<ApiResponse<UserTerritory[]>> {
    return this.http.get<ApiResponse<UserTerritory[]>>(`${this.API_URL}/my-territories`, {
      withCredentials: true
    });
  }

  // --- GESTIÓN DE USUARIOS ---

  getUsers(params: UserQueryParams): Observable<PaginatedResponse<User>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<PaginatedResponse<User>>(this.API_URL, {
      params: httpParams,
      withCredentials: true
    });
  }

  getUserById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/${id}`, {
      withCredentials: true
    });
  }

  createUser(data: any): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.API_URL, data, {
      withCredentials: true
    });
  }

  updateUser(id: number, data: any): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/${id}`, data, {
      withCredentials: true
    });
  }

  deleteUser(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
      withCredentials: true
    });
  }

  // --- PERMISOS Y MATRIZ ---

  getUserPermissionsRaw(id: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${id}/permissions-raw`, {
      withCredentials: true
    });
  }

  updatePermissionsBatch(userId: number, changes: any[]): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${userId}/permissions/batch`, 
      { changes }, 
      { withCredentials: true }
    );
  }

  // --- CATÁLOGOS ---

  getAllPermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(this.PERMISSIONS_URL, {
      withCredentials: true
    });
  }

  getAllMunicipios(): Observable<ApiResponse<Municipio[]>> {
    return this.http.get<ApiResponse<Municipio[]>>(this.MUNICIPIOS_URL, {
      withCredentials: true
    });
  }

  getAllRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.ROLES_URL, {
      withCredentials: true
    });
  }
}