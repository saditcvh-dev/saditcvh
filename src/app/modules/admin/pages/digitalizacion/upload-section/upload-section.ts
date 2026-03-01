import { Component, EventEmitter, Input, Output, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService, PDFUploadResponse } from '../services/pdf-ocr.service';
import { ExploradorStateService } from '../../explorador/services/explorador-state.service';
import { CargaMasivaService } from '../../../../../core/services/digitalizacion-carga-masiva.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload-section',
  standalone: false,
  templateUrl: './upload-section.html',
})
export class UploadSectionComponent implements OnDestroy {
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
    private pdfService: PdfService,
    private cargaMasivaService: CargaMasivaService,
    private stateService: ExploradorStateService
  ) { }

  // ========== LIMPIAR AL CAMBIAR DE MÓDULO / TAB ==========
  ngOnDestroy(): void {
    // Limpia TODO al salir (evita que fallen se queden pegados al cambiar de módulo)
    this.recentUploads = [];
    this.emitRecentUploads();

    this.selectedFiles = [];
    this.useZip = false;
    this.isDragging = false;
    this.isUploading.set(false);
  }

  // Limpia SOLO los uploads que fallaron (para no acumular errores eternos)
  private clearFailedUploads(): void {
    this.recentUploads = this.recentUploads.filter(upload => upload.status !== 'failed');
    this.emitRecentUploads();
  }

  // ========== SELECCIÓN DE ARCHIVOS ==========
  onFilesSelected(event: any): void {
    const files: File[] = Array.from(event.target.files);

    // Detectar archivo comprimido
    const compressedFile = files.find(f =>
      f.type === 'application/zip' ||
      f.type === 'application/x-zip-compressed' ||
      f.name.toLowerCase().endsWith('.zip') ||
      f.name.toLowerCase().endsWith('.rar')
    );

    if (compressedFile) {
      if (files.length > 1) {
        this.stateService.showToast('Solo puedes subir un archivo comprimido a la vez', 'error');
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

      this.stateService.showToast('Archivo comprimido seleccionado', 'success');
    } else {
      const candidatePdfs = files.filter(f =>
        f.type === 'application/pdf' ||
        f.name.toLowerCase().endsWith('.pdf')
      );

      if (candidatePdfs.length === 0) {
        this.stateService.showToast('Selecciona al menos un PDF o comprimido válido', 'error');
        return;
      }

      const validPdfs = candidatePdfs.filter(f => this.validateNomenclature(f.name));
      const invalidPdfs = candidatePdfs.filter(f => !this.validateNomenclature(f.name));

      if (validPdfs.length === 0) {
        const names = invalidPdfs.map(f => f.name).join(', ');
        this.stateService.showToast(`Ningún archivo cumple la nomenclatura: ${names}`, 'error');
        return;
      }

      validPdfs.forEach(file => {
        const match = file.name.match(/^(\d+)\s+(\d+)-(\d+)-(\d+)-(\d+)\s+([CP])/i);
        const nuevoNombre = match ? `${match[0]}.pdf` : file.name;

        const cleanFile = new File([file], nuevoNombre, { type: file.type });
        this.selectedFiles.push(cleanFile);

        const uploadId = `upload-${Date.now()}-${cleanFile.name}`;
        this.recentUploads.unshift({
          id: uploadId,
          filename: cleanFile.name,
          status: 'uploading',
          progress: 0,
          timestamp: new Date()
        });
      });

      if (invalidPdfs.length > 0) {
        const names = invalidPdfs.map(f => f.name).join(', ');
        this.stateService.showToast(`Se omitieron archivos sin nomenclatura: ${names}`, 'warning');
      }

      this.stateService.showToast(`${validPdfs.length} PDF(s) seleccionados`, 'success');
      this.useZip = false;
    }

    event.target.value = '';
    this.emitRecentUploads();
  }

  removeSelectedFile(index: number): void {
    const removed = this.selectedFiles[index];
    if (!removed) return;

    this.selectedFiles.splice(index, 1);

    const pos = this.recentUploads.findIndex(
      u => u.filename === removed.name && u.status === 'uploading' && u.progress === 0
    );
    if (pos !== -1) this.recentUploads.splice(pos, 1);

    this.emitRecentUploads();
  }

  // ========== SUBIDA ==========
  uploadFile(): void {
    if (this.selectedFiles.length === 0) return;

    this.isUploading.set(true);
    this.loadingMessage.set('Subiendo y procesando...');

    const filesToUpload = [...this.selectedFiles];
    this.selectedFiles = []; // Limpiar selección para evitar reenvío accidental

    // ────────────── ARCHIVO COMPRIMIDO ──────────────
    if (this.useZip) {
      const compressedFile = filesToUpload[0];
      const currentUpload = this.recentUploads.find(u => u.filename === compressedFile.name);

      if (currentUpload) {
        currentUpload.status = 'processing';
        currentUpload.progress = 30;
        this.emitRecentUploads();
      }

      this.cargaMasivaService.subirArchivoComprimido(compressedFile, this.useOcr).subscribe({
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
          }
        },
        error: () => {
          if (currentUpload) {
            currentUpload.status = 'failed';
            currentUpload.progress = 0;
            this.emitRecentUploads();

            // Limpieza automática de fallidos
            setTimeout(() => this.clearFailedUploads(), 3500);
          }
          this.isUploading.set(false);
          this.stateService.showToast('Error al subir archivo comprimido', 'error');
        }
      });

      return;
    }

    // ────────────── MÚLTIPLES PDFs ──────────────
    this.cargaMasivaService.subirMultiplesPDFs(filesToUpload, this.useOcr).subscribe({
      next: () => {
        // Marcar como completados
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
          `${filesToUpload.length} PDF(s) cargados correctamente`,
          'success'
        );
      },
      error: (error) => {
        console.error('Error subiendo PDFs:', error);

        // Marcar fallidos
        this.recentUploads.forEach(upload => {
          if (filesToUpload.some(f => f.name === upload.filename)) {
            upload.status = 'failed';
            upload.progress = 0;
          }
        });

        this.emitRecentUploads();

        // Limpieza automática de fallidos después de mostrar error
        setTimeout(() => this.clearFailedUploads(), 3500);

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

  private validateNomenclature(filename: string): boolean {
    if (!filename) return false;
    const base = filename.replace(/\.[^/.]+$/, '').trim();
    const re = /^(\d+)\s+(\d+)-(\d+)-(\d+)-(\d+)\s+([CP])\b/i;
    return re.test(base);
  }

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