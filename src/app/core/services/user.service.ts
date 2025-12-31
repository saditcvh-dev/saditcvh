import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, Permission, Municipio, Role } from '../../core/models/user.model';
import { PaginatedResponse } from '../../core/models/paginated-response.model';
import { ApiResponse } from '../../core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/users`;
  private readonly PERMISSIONS_URL = `${environment.apiUrl}/permissions`;
  private readonly MUNICIPIOS_URL = `${environment.apiUrl}/municipios`;
  private readonly ROLES_URL = `${environment.apiUrl}/roles`;

  getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role_id?: number;
    cargo_id?: number;
    active?: boolean | string;
    sortBy?: 'name' | 'creator' | 'editor';
    order?: 'asc' | 'desc';
  }): Observable<PaginatedResponse<User>> {

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

  getAllUsers(params: any): Observable<PaginatedResponse<User>> {
    return this.getUsers(params);
  }

  getAllRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.ROLES_URL, {
      withCredentials: true
    });
  }

  getUserById(id: number) {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/${id}`, {
      withCredentials: true
    });
  }

  getUserPermissionsRaw(id: number) {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${id}/permissions-raw`, {
      withCredentials: true
    });
  }

  createUser(data: any) {
    return this.http.post<ApiResponse<User>>(this.API_URL, data, {
      withCredentials: true
    });
  }

  updateUser(id: number, data: any) {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/${id}`, data, {
      withCredentials: true
    });
  }

  deleteUser(id: number) {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
      withCredentials: true
    });
  }

  // Obtener catálogo de columnas (Ver, Editar, etc.)
  getAllPermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(this.PERMISSIONS_URL, {
      withCredentials: true
    });
  }

  // Obtener todos los municipios para el modal
getAllMunicipios(): Observable<ApiResponse<Municipio[]>> {
    return this.http.get<ApiResponse<Municipio[]>>(this.MUNICIPIOS_URL, {
      withCredentials: true
    });
  }

  updatePermissionsBatch(userId: number, changes: any[]) {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${userId}/permissions/batch`, {
      changes
    }, {
      withCredentials: true
    });
  }

  // Modificar un permiso específico (Excepción)
  togglePermission(userId: number, municipioId: number, permissionId: number, value: boolean) {
    return this.http.patch<ApiResponse<any>>(`${this.API_URL}/${userId}/permissions`, {
      municipioId,
      permissionId,
      value
    }, {
      withCredentials: true
    });
  }

}
