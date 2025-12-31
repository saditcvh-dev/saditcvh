// src/app/core/services/audit.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog, AuditLogSummary, AuditParams } from '../models/audit.model';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/audit`;

  /**
   * Obtiene los logs resumidos para la tabla.
   * Retorna AuditLogSummary[] para optimizar memoria.
   */
  getLogs(params: AuditParams): Observable<PaginatedResponse<AuditLogSummary>> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<PaginatedResponse<AuditLogSummary>>(this.API_URL, {
      params: httpParams,
      withCredentials: true
    });
  }

  /**
   * Obtiene el detalle completo de un log por su ID.
   * Usado exclusivamente para el modal de detalles.
   */
  getLogById(id: number): Observable<AuditLog> {
    return this.http.get<{ success: boolean, data: AuditLog }>(`${this.API_URL}/${id}`, {
      withCredentials: true
    }).pipe(
      map(response => response.data)
    );
  }

  formatDateForQuery(date: Date): string {
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD para el input date
  }
}