// src/app/core/services/respaldos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RespaldosService {
  private apiUrl = `${environment.apiUrl}/backups`;

  constructor(private http: HttpClient) {}

  // Para Disco y Archivos (Menos frecuente)
  getStorageMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/storage-metrics`);
  }

  // Para CPU y RAM (Tiempo real - devuelve arrays para la gráfica)
  getLiveMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/live-metrics`);
  }
}