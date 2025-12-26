import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';
import { PaginatedResponse } from '../../core/models/paginated-response.model';
import { ApiResponse } from '../../core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/users`;

  getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role_id?: number;
    cargo_id?: number;
    active?: boolean;
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

  getUserById(id: number) {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/${id}`, {
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
}
