import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService, PDFUploadResponse } from '../services/pdf-ocr.service';
import { ExploradorStateService } from '../../explorador/services/explorador-state.service';
import { CargaMasivaService } from '../../../../../core/services/digitalizacion-carga-masiva.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload-section',
  standalone: false,
  // imports: [CommonModule, FormsModule],
  templateUrl: './upload-section.html',

})
export class UploadSectionComponent {
  @Input() recentUploads: Array<{
    id: string;
    filename: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    timestamp: Date;
  }> = [];

  @Output() uploadCompleted = new EventEmitter<void>();
  @Output() recentUploadsChange = new EventEmitter<Array<{
    id: string;
    filename: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    timestamp: Date;
  }>>();

  // Variables para subida
  selectedFiles: File[] = [];
  useOcr: boolean = false;
  uploadResult: PDFUploadResponse | null = null;
  useZip = false;
  isDragging = false;

  // Signals
  isUploading = signal(false);
  loadingMessage = signal('Procesando...');

  constructor(
    private pdfService: PdfService,                 // SOLO OCR
    private cargaMasivaService: CargaMasivaService, // SIN OCR
    private stateService: ExploradorStateService
  ) { }

  // ========== FUNCIONES PARA SUBIDA ==========
  onFilesSelected(event: any): void {
    const files: File[] = Array.from(event.target.files);

    // Detectar si es archivo comprimido
    const compressedFile = files.find(f =>
      f.type === 'application/zip' ||
      f.type === 'application/x-zip-compressed' ||
      f.name.toLowerCase().endsWith('.zip') ||
      f.name.toLowerCase().endsWith('.rar')
    );

    // Si hay archivo comprimido, limpiar otros archivos
    if (compressedFile) {
      if (files.length > 1) {
        this.stateService.showToast(
          'Solo puedes subir un archivo comprimido a la vez',
          'error'
        );
        event.target.value = '';
        return;
      }

      this.selectedFiles = [compressedFile];
      this.useZip = true;

      const uploadId = `upload-${Date.now()}-${compressedFile.name}`;
      this.recentUploads.unshift({
        id: uploadId,
        filename: compressedFile.name,
        status: 'uploading',
        progress: 0,
        timestamp: new Date()
      });

      this.stateService.showToast(
        'Archivo comprimido seleccionado correctamente',
        'success'
      );
    }
    // Si son PDFs individuales
    else {
      const validPdfs = files.filter(f =>
        f.type === 'application/pdf' ||
        f.name.toLowerCase().endsWith('.pdf')
      );

      if (validPdfs.length === 0) {
        this.stateService.showToast('Selecciona al menos un PDF o archivo comprimido válido', 'error');
        return;
      }

      validPdfs.forEach(file => {
        this.selectedFiles.push(file);

        const uploadId = `upload-${Date.now()}-${file.name}`;
        this.recentUploads.unshift({
          id: uploadId,
          filename: file.name,
          status: 'uploading',
          progress: 0,
          timestamp: new Date()
        });
      });

      this.stateService.showToast(
        `${validPdfs.length} PDF(s) seleccionados correctamente`,
        'success'
      );
      this.useZip = false;
    }

    event.target.value = '';
    this.emitRecentUploads();
  }


  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }
  uploadFile(): void {
    if (this.selectedFiles.length === 0) return;

    this.isUploading.set(true);
    this.loadingMessage.set('Subiendo y procesando archivos...');

    const filesToUpload = [...this.selectedFiles];
    this.selectedFiles = [];

    // 🗜️ Si es archivo comprimido
    if (this.useZip) {
      const compressedFile = filesToUpload[0];

      // Buscar el upload correspondiente
      const currentUpload = this.recentUploads.find(u => u.filename === compressedFile.name);

      if (currentUpload) {
        currentUpload.status = 'processing';
        currentUpload.progress = 30;
        this.emitRecentUploads();
      }
      this.cargaMasivaService
        .subirArchivoComprimido(compressedFile, this.useOcr)
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const progress = Math.round((event.loaded / event.total) * 100);
              if (currentUpload) {
                currentUpload.progress = progress;
                currentUpload.status = 'uploading';
                this.emitRecentUploads();
              }
            }

            if (event.type === HttpEventType.Response) {
              if (currentUpload) {
                currentUpload.status = 'processing';
                currentUpload.progress = 100;
                this.emitRecentUploads();
              }


              // const loteId = event.body?.loteId;
              // if (loteId) {
              //   this.monitorearLote(loteId, currentUpload);
              // }
            }
          },
          error: () => {
            if (currentUpload) {
              currentUpload.status = 'failed';
              currentUpload.progress = 0;
              this.emitRecentUploads();
            }
            this.isUploading.set(false);
          }
        });

      return;
    }

    // 📄 Si son PDFs múltiples (con o sin OCR)

    this.cargaMasivaService.subirMultiplesPDFs(filesToUpload, this.useOcr).subscribe({
      next: (response) => {
        // Actualizar todos los uploads como completados
        this.recentUploads.forEach(upload => {
          if (filesToUpload.some(f => f.name === upload.filename)) {
            upload.status = 'completed';
            upload.progress = 100;
          }
        });

        this.emitRecentUploads();
        this.isUploading.set(false);
        this.uploadCompleted.emit();

        this.stateService.showToast(
          `${filesToUpload.length} PDFs cargados correctamente (sin OCR)`,
          'success'
        );
      },
      error: (error) => {
        console.error('Error subiendo PDFs:', error);

        // Marcar como fallados
        this.recentUploads.forEach(upload => {
          if (filesToUpload.some(f => f.name === upload.filename)) {
            upload.status = 'failed';
            upload.progress = 0;
          }
        });

        this.emitRecentUploads();
        this.isUploading.set(false);

        this.stateService.showToast(
          error.error?.message || 'Error al subir los PDFs',
          'error'
        );
      }
    });




  }


  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private emitRecentUploads(): void {
    this.recentUploadsChange.emit(this.recentUploads);
  }
  // eventos
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;

  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    if (
      event.clientX <= rect.left ||
      event.clientX >= rect.right ||
      event.clientY <= rect.top ||
      event.clientY >= rect.bottom
    ) {
      this.isDragging = false;
    }

  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer?.files.length) return;

    const files = Array.from(event.dataTransfer.files);

    this.onFilesSelected({ target: { files } });
    this.isDragging = false;

  }

}