import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService, PDFUploadResponse } from '../services/pdf-ocr.service';
import { ExploradorStateService } from '../../explorador/services/explorador-state.service';
import { CargaMasivaService } from '../../../../../core/services/digitalizacion-carga-masiva.service';

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
  useOcr: boolean = true;
  uploadResult: PDFUploadResponse | null = null;
  useZip = false;

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
  // onFilesSelected(event: any): void {
  //   const files: File[] = Array.from(event.target.files);

  //   const validPdfs = files.filter(f => f.type === 'application/pdf');

  //   if (validPdfs.length === 0) {
  //     this.stateService.showToast('Selecciona al menos un PDF válido', 'error');
  //     return;
  //   }

  //   validPdfs.forEach(file => {
  //     this.selectedFiles.push(file);

  //     const uploadId = `upload-${Date.now()}-${file.name}`;
  //     this.recentUploads.unshift({
  //       id: uploadId,
  //       filename: file.name,
  //       status: 'uploading',
  //       progress: 0,
  //       timestamp: new Date()
  //     });
  //   });

  //   this.stateService.showToast(
  //     `${validPdfs.length} PDF(s) seleccionados correctamente`,
  //     'success'
  //   );

  //   event.target.value = ''; // reset input
  //   this.emitRecentUploads();
  // }

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

    this.cargaMasivaService.subirArchivoComprimido(compressedFile).subscribe({
      next: (response) => {
        if (currentUpload) {
          currentUpload.id = response.id || compressedFile.name;
          currentUpload.status = 'completed';
          currentUpload.progress = 100;
          this.emitRecentUploads();
        }
        
        this.isUploading.set(false);
        this.uploadCompleted.emit();
        
        this.stateService.showToast(
          'Archivo comprimido procesado correctamente',
          'success'
        );
      },
      error: (error) => {
        console.error('Error subiendo archivo comprimido:', error);
        
        if (currentUpload) {
          currentUpload.status = 'failed';
          currentUpload.progress = 0;
          this.emitRecentUploads();
        }
        
        this.isUploading.set(false);
        
        this.stateService.showToast(
          error.error?.message || 'Error al procesar el archivo comprimido',
          'error'
        );
      }
    });
    
    return;
  }

  // 📄 Si son PDFs múltiples (con o sin OCR)
  if (!this.useOcr) {
    // SIN OCR - Carga masiva
    this.cargaMasivaService.subirMultiplesPDFs(filesToUpload).subscribe({
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

    return;
  }

  // 🤖 CON OCR - Procesar uno por uno
  const uploadNext = (index: number) => {
    if (index >= filesToUpload.length) {
      this.isUploading.set(false);
      this.uploadCompleted.emit();
      return;
    }

    const file = filesToUpload[index];
    const currentUpload = this.recentUploads.find(u => u.filename === file.name);

    if (currentUpload) {
      currentUpload.status = 'processing';
      currentUpload.progress = 30;
      this.emitRecentUploads();
    }

    this.pdfService.uploadPdf(file, true).subscribe({
      next: (result) => {
        if (currentUpload) {
          currentUpload.id = result.id;
          currentUpload.status = 'completed';
          currentUpload.progress = 100;
          this.emitRecentUploads();
        }
        uploadNext(index + 1);
      },
      error: (error) => {
        console.error(`Error procesando ${file.name}:`, error);
        
        if (currentUpload) {
          currentUpload.status = 'failed';
          currentUpload.progress = 0;
          this.emitRecentUploads();
        }
        uploadNext(index + 1);
      }
    });
  };

  uploadNext(0);
}
  // uploadFile(): void {
  //   if (this.selectedFiles.length === 0) return;

  //   this.isUploading.set(true);
  //   this.loadingMessage.set('Subiendo y procesando PDFs...');

  //   const filesToUpload = [...this.selectedFiles];
  //   this.selectedFiles = [];

  //   const uploadNext = (index: number) => {
  //     if (index >= filesToUpload.length) {
  //       this.isUploading.set(false);
  //       this.uploadCompleted.emit();
  //       return;
  //     }

  //     const file = filesToUpload[index];
  //     const currentUpload = this.recentUploads.find(u => u.filename === file.name);

  //     if (currentUpload) {
  //       currentUpload.status = 'processing';
  //       currentUpload.progress = 30;
  //       this.emitRecentUploads();
  //     }

  //     this.pdfService.uploadPdf(file, this.useOcr).subscribe({
  //       next: (result) => {
  //         if (currentUpload) {
  //           currentUpload.id = result.id;
  //           currentUpload.progress = 70;
  //           this.emitRecentUploads();
  //         }
  //         uploadNext(index + 1);
  //       },
  //       error: () => {
  //         if (currentUpload) {
  //           currentUpload.status = 'failed';
  //           currentUpload.progress = 0;
  //           this.emitRecentUploads();
  //         }
  //         uploadNext(index + 1);
  //       }
  //     });
  //   };

  //   uploadNext(0);
  // }

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
}