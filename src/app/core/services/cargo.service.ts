import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Cargo } from '../../core/models/user.model';
import { ApiResponse } from '../../core/models/api-response.model'; // Importar nueva interface

@Injectable({
  providedIn: 'root'
})
export class CargoService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/cargos`;

  constructor() { }

  /**
   * Obtiene la lista de todos los cargos (catálogo).
   * @returns Observable<Cargo[]>
   */
  getCargos(): Observable<Cargo[]> {
    return this.http.get<ApiResponse<Cargo[]>>(this.API_URL, { withCredentials: true }).pipe(
      // Mapear la respuesta para obtener solo el array de datos
      map(response => response.data)
    );
  }

  // Opcionalmente, podrías agregar los métodos de CRUD de Cargos aquí si fueran necesarios
  // pero por ahora solo necesitamos la lista para el formulario de Usuarios.
}