import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';

export interface PDFUploadResponse {
  id: string;
  filename: string;
  size: number;
  pages: number;
  extracted_text_path: string;
  message: string;
}

export interface SearchRequest {
  term: string;
  case_sensitive: boolean;
}

export interface SearchResult {
  page: number;
  line: number;
  position: number;
  context: string;
  snippet?: string;
  score?: number;
}

export interface SearchResponse {
  term: string;
  total_matches: number;
  results: SearchResult[];
  pdf_id: string;
  execution_time: number;
}

export interface PDFInfo {
  id: string;
  filename: string;
  upload_date: Date;
  size: number;
  pages: number;
  has_text: boolean;
  text_file_size: number | null;
}

export interface PDFListItem {
  id: string;
  filename: string;
  pages: number;
  size: number;
  // campos adicionales devueltos por el backend
  size_bytes?: number;
  size_mb?: number;
  status?: string;
  progress?: number;
  task_id?: string;
  upload_time?: number;
  created_at?: string | Date;
  completed_at?: string | Date;
  extracted_text_path?: string;
  used_ocr?: boolean;
  error?: string | null;
}

export interface PDFListResponse {
  total: number;
  by_status: {
    completed: number;
    processing: number;
    pending: number;
    failed: number;
  };
  pdfs: Array<Partial<PDFListItem> & { id: string; filename: string }>;
  summary: any;
}

// === NUEVAS INTERFACES PARA BÚSQUEDA GLOBAL ===
export interface DocumentMatch {
  pdf_id: string;
  filename?: string;
  total_matches: number;
  results: SearchResult[];
  score: number;
}

export interface GlobalSearchResponse {
  term: string;
  total_documents_with_matches: number;
  total_matches: number;
  execution_time: number;
  documents: DocumentMatch[];
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private apiUrl = 'http://localhost:8000/api/pdf';

  constructor(private http: HttpClient) { }

  uploadPdf(file: File, useOcr: boolean = true): Observable<PDFUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<PDFUploadResponse>(
      `${this.apiUrl}/upload?use_ocr=${useOcr}`,
      formData
    );
  }

  searchPdf(pdfId: string, term: string, caseSensitive: boolean = false): Observable<SearchResponse> {
  return this.http.post<SearchResponse>(
    `${this.apiUrl}/${pdfId}/search`, 
    { 
      term, 
      case_sensitive: caseSensitive 
    }
  ).pipe(
    catchError((error:any) => {
      console.error('Error en búsqueda:', error);
      throw error;
    })
  );
}

  getPdfText(pdfId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${pdfId}/text`,
      { responseType: 'blob' }
    );
  }
  getSearchablePdf(pdfId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${pdfId}/searchable-pdf`,
      { responseType: 'blob' }
    );
  }

  quickSearch(file: File, term: string, useOcr: boolean = true): Observable<SearchResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<SearchResponse>(
      `${this.apiUrl}/quick-search?search_term=${term}&use_ocr=${useOcr}`,
      formData
    );
  }

  getPdfInfo(pdfId: string): Observable<PDFInfo> {
    return this.http.get<PDFInfo>(`${this.apiUrl}/${pdfId}/info`);
  }

  listPdfs(): Observable<PDFListResponse> {
    return this.http.get<PDFListResponse>(`${this.apiUrl}/list`);
  }

  deletePdf(pdfId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${pdfId}`);
  }

  // ======================
  // NUEVO: Búsqueda global en todos los documentos
  // ======================
  globalSearch(
    term: string,
    caseSensitive: boolean = false,
    contextChars: number = 100,
    maxDocuments: number = 50
  ): Observable<GlobalSearchResponse> {
    let params = new HttpParams()
      .set('term', term)
      .set('case_sensitive', caseSensitive.toString())
      .set('context_chars', contextChars.toString())
      .set('max_documents', maxDocuments.toString());

    return this.http.post<GlobalSearchResponse>(
      `${this.apiUrl}/global-search`,
      {},  // body vacío
      { params }
    );
  }
}