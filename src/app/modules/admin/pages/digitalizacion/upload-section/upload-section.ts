import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService, PDFUploadResponse } from '../services/pdf-ocr.service';
import { ExploradorStateService } from '../../explorador/services/explorador-state.service';
import { CargaMasivaService } from '../../../../../core/services/digitalizacion-carga-masiva.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload-section',
  standalone: true,
  imports: [CommonModule, FormsModule],  // Necesario para ngModel y demás
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
  allowSinNomenclatura: boolean = false;  // ← Declarada aquí (antes de usarla)
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

  // ========== FUNCIONES PARA SUBIDA ==========
  onFilesSelected(event: any): void {
    const files: File[] = Array.from(event.target.files || []);

    // Detectar si hay un archivo comprimido (ZIP o RAR)
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

      this.stateService.showToast(
        this.allowSinNomenclatura
          ? 'Archivo comprimido seleccionado (modo sin nomenclatura)'
          : 'Archivo comprimido seleccionado correctamente',
        'success'
      );

      event.target.value = '';
      this.emitRecentUploads();
      return;
    }

    // PDFs
    const candidatePdfs = files.filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (candidatePdfs.length === 0) {
      this.stateService.showToast('Selecciona al menos un PDF o comprimido válido', 'error');
      event.target.value = '';
      return;
    }

    // Bifurcación según modo
    if (this.allowSinNomenclatura) {
      // SIN NOMENCLATURA: todo permitido
      candidatePdfs.forEach(file => {
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

      this.useZip = false;
      this.stateService.showToast(
        `${candidatePdfs.length} PDF(s) seleccionados (sin nomenclatura)`,
        'success'
      );
    } else {
      // MODO NORMAL: validar estrictamente
      const validPdfs = candidatePdfs.filter(f => this.validateNomenclature(f.name));
      const invalidPdfs = candidatePdfs.filter(f => !this.validateNomenclature(f.name));

      if (validPdfs.length === 0) {
        const names = invalidPdfs.map(f => f.name).join(', ');
        this.stateService.showToast(`Ningún archivo cumple la nomenclatura: ${names}`, 'error');
        event.target.value = '';
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
        this.stateService.showToast(`Se omitieron archivos inválidos: ${names}`, 'error');
      }

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

    if (this.useZip) {
      const compressedFile = filesToUpload[0];
      const currentUpload = this.recentUploads.find(u => u.filename === compressedFile.name);

      if (currentUpload) {
        currentUpload.status = 'processing';
        currentUpload.progress = 30;
        this.emitRecentUploads();
      }

      // Elegir endpoint según modo
      const request$ = this.allowSinNomenclatura
        ? this.cargaMasivaService.subirArchivoComprimidoSinNomenclatura(compressedFile, this.useOcr)
        : this.cargaMasivaService.subirArchivoComprimido(compressedFile, this.useOcr);

      request$.subscribe({
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
              currentUpload.status = 'completed';
              currentUpload.progress = 100;
              this.emitRecentUploads();
            }

            this.isUploading.set(false);
            this.uploadCompleted.emit();
            this.stateService.showToast(
              this.allowSinNomenclatura
                ? 'Archivo comprimido cargado (sin nomenclatura)'
                : 'Archivo comprimido procesado correctamente',
              'success'
            );
          }
        },
        error: (err) => {
          if (currentUpload) {
            currentUpload.status = 'failed';
            currentUpload.progress = 0;
            this.emitRecentUploads();
          }
          this.isUploading.set(false);
          this.stateService.showToast(err.error?.message || 'Error al subir comprimido', 'error');
        }
      });

      return;
    }

    // PDFs múltiples
    const request$ = this.allowSinNomenclatura
      ? this.cargaMasivaService.subirMultiplesPDFsSinNomenclatura(filesToUpload, this.useOcr)
      : this.cargaMasivaService.subirMultiplesPDFs(filesToUpload, this.useOcr);

    request$.subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.recentUploads.forEach(upload => {
            if (filesToUpload.some(f => f.name === upload.filename)) {
              upload.status = 'uploading';
              upload.progress = progress;
            }
          });
          this.emitRecentUploads();
        }

        if (event.type === HttpEventType.Response) {
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
            `${filesToUpload.length} PDF(s) cargados ${this.allowSinNomenclatura ? '(sin nomenclatura)' : ''} ${this.useOcr ? '(con OCR)' : ''}`,
            'success'
          );
        }
      },
      error: (err) => {
        this.recentUploads.forEach(upload => {
          if (filesToUpload.some(f => f.name === upload.filename)) {
            upload.status = 'failed';
            upload.progress = 0;
          }
        });
        this.emitRecentUploads();
        this.isUploading.set(false);
        this.stateService.showToast(err.error?.message || 'Error al subir PDFs', 'error');
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

    // Regex anclado al inicio; permite que haya texto adicional después
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

  // Limpieza y toast al cambiar modo
  onModoSinNomenclaturaChange(): void {
    this.selectedFiles = [];
    this.useZip = false;

    this.stateService.showToast(
      this.allowSinNomenclatura
        ? 'Modo sin nomenclatura activado — puedes subir cualquier archivo (SP-XXX en municipio 85)'
        : 'Modo normal activado — usa la nomenclatura obligatoria',
      'success'
    );

    this.emitRecentUploads();
  }
}