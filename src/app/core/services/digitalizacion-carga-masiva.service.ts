import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CargaMasivaService {
  private readonly baseUrl = `${environment.apiUrl}/carga-masiva`;

  constructor(private http: HttpClient) {}

  subirArchivoComprimido(archivo: File,useOcr: boolean): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipo', this.obtenerTipoArchivo(archivo));
    formData.append('useOcr', String(useOcr));
    return this.http.post<any>(
      `${this.baseUrl}/comprimido`,
      formData,
      {
        reportProgress: true,
        observe: 'events',withCredentials: true
      }
    );
  }
// ,{ withCredentials: true }
  subirMultiplesPDFs(archivos: File[],useOcr: boolean): Observable<any> {
    const formData = new FormData();

    archivos.forEach((archivo: File) => {
      formData.append('archivos', archivo);
    });
  formData.append('useOcr', String(useOcr));

    return this.http.post<any>(
      `${this.baseUrl}/pdfs-multiples`,
      formData,
      {
        reportProgress: true,
        observe: 'events',withCredentials: true
      }
    );
  }

  private obtenerTipoArchivo(archivo: File): string {
    const nombre = archivo.name.toLowerCase();
    if (nombre.endsWith('.zip')) return 'zip';
    if (nombre.endsWith('.rar')) return 'rar';
    return archivo.type;
  }
}