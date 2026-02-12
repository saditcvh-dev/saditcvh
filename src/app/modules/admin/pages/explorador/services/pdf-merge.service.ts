import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MergePdfService {

  // private apiUrl = 'http://localhost:8000/api/pdf';
  private apiUrl = '/ocr/api/pdf';
  constructor(private http: HttpClient) { }

  mergeWithOutput(
    firstPdfId: string,
    file: File,
    useOcr: boolean = true,
    position: 'start' | 'end' = 'end'
  ): Observable<Blob> {

    const formData = new FormData();
    formData.append('file', file);

    const params = new HttpParams()
      .set('first_pdf_id', firstPdfId)
      .set('use_ocr', useOcr)
      .set('position', position);

    return this.http.post(
      `${this.apiUrl}/merge-with-output`,
      formData,
      {
        params,
        responseType: 'blob'
      }
    );
  }
}
