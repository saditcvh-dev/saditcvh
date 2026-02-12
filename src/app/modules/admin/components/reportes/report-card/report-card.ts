import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**
 * Simple browser download helper to replace file-saver usage.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

@Component({
  selector: 'app-report-card',
  standalone: false,
  templateUrl: './report-card.html',
})
export class ReportCard {
  // URLs de los endpoints
  private reporteDocumentosUrl = 'http://localhost:4000/api/reports/reporte-digitalizacion/pdf';
  private reporteUsuariosUrl = 'http://localhost:4000/api/reports/reporte-usuarios/pdf';
  private reporteActividadUsuariosUrl = 'http://localhost:4000/api/reports/reporte-actividad/pdf';
  
  // Estados de carga
  isLoadingDocumentos = false;
  isLoadingUsuarios = false;
  isLoadingActividadUsuarios = false;

  constructor(private http: HttpClient) {}

  /** ===============================
   *  GENERAR REPORTE DE DOCUMENTOS
   *  =============================== */
  generarReporteDocumentos(): void {
    if (this.isLoadingDocumentos) return;
    
    this.isLoadingDocumentos = true;

    this.http.get(this.reporteDocumentosUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const fecha = new Date().toISOString().split('T')[0];
          const filename = `Reporte-de-documentos-${fecha}.pdf`;
          
          downloadBlob(blob, filename);
          this.isLoadingDocumentos = false;
        },
        error: (error) => {
          this.isLoadingDocumentos = false;
        }
      });
  }

  /** ===============================
   *  GENERAR REPORTE DE USUARIOS
   *  =============================== */
  generarReporteUsuarios(): void {
    if (this.isLoadingUsuarios) return;
    
    this.isLoadingUsuarios = true;

    this.http.get(this.reporteUsuariosUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const fecha = new Date().toISOString().split('T')[0];
          const filename = `Reporte-de-usuarios-${fecha}.pdf`;
          
          downloadBlob(blob, filename);
          this.isLoadingUsuarios = false;
        },
        error: (error) => {
          this.isLoadingUsuarios = false;
        }
      });
  }

  /** ===============================
   *  GENERAR REPORTE DE ACTIVIDAD DE USUARIOS
   *  =============================== */
  generarReporteActividadUsuarios(): void {
    if (this.isLoadingActividadUsuarios) return;
    
    this.isLoadingActividadUsuarios = true;

    this.http.get(this.reporteActividadUsuariosUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const fecha = new Date().toISOString().split('T')[0];
          const filename = `Reporte-de-actividad-usuarios-${fecha}.pdf`;
          
          downloadBlob(blob, filename);
          this.isLoadingActividadUsuarios = false;
        },
        error: (error) => {
          this.isLoadingActividadUsuarios = false;
        }
      });
  }
}