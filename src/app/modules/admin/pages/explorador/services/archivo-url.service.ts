import { Injectable } from '@angular/core';
import { environment } from '../../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ArchivoUrlService {

  private readonly API_BASE_URL = `${environment.apiUrl}/documentos`;

  buildPreviewUrl(documentoId?: number | null): string {
    if (!documentoId) {
      return '';
    }
    console.log('Construyendo URL de vista previa para documento ID:', documentoId);
    return `${this.API_BASE_URL}/${documentoId}/preview`;
  }
}