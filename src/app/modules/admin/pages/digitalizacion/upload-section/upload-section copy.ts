// import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { PdfService, PDFUploadResponse } from '../services/pdf-ocr.service';
// import { ExploradorStateService } from '../../explorador/services/explorador-state.service';
// import { CargaMasivaService } from '../../../../../core/services/digitalizacion-carga-masiva.service';

// @Component({
//   selector: 'app-upload-section',
//   standalone: false,
//   // imports: [CommonModule, FormsModule],
//   templateUrl: './upload-section.html',

// })
// export class UploadSectionComponent {
//   @Input() recentUploads: Array<{
//     id: string;
//     filename: string;
//     status: 'uploading' | 'processing' | 'completed' | 'failed';
//     progress: number;
//     timestamp: Date;
//   }> = [];

//   @Output() uploadCompleted = new EventEmitter<void>();
//   @Output() recentUploadsChange = new EventEmitter<Array<{
//     id: string;
//     filename: string;
//     status: 'uploading' | 'processing' | 'completed' | 'failed';
//     progress: number;
//     timestamp: Date;
//   }>>();

//   // Variables para subida
//   selectedFiles: File[] = [];
//   useOcr: boolean = true;
//   uploadResult: PDFUploadResponse | null = null;
//   useZip = false;

//   // Signals
//   isUploading = signal(false);
//   loadingMessage = signal('Procesando...');

//   constructor(
//     private pdfService: PdfService,                 // SOLO OCR
//     private cargaMasivaService: CargaMasivaService, // SIN OCR
//     private stateService: ExploradorStateService
//   ) { }

//   // ========== FUNCIONES PARA SUBIDA ==========
//   onFilesSelected(event: any): void {
//     const files: File[] = Array.from(event.target.files);

//     const validPdfs = files.filter(f => f.type === 'application/pdf');

//     if (validPdfs.length === 0) {
//       this.stateService.showToast('Selecciona al menos un PDF válido', 'error');
//       return;
//     }

//     validPdfs.forEach(file => {
//       this.selectedFiles.push(file);

//       const uploadId = `upload-${Date.now()}-${file.name}`;
//       this.recentUploads.unshift({
//         id: uploadId,
//         filename: file.name,
//         status: 'uploading',
//         progress: 0,
//         timestamp: new Date()
//       });
//     });

//     this.stateService.showToast(
//       `${validPdfs.length} PDF(s) seleccionados correctamente`,
//       'success'
//     );

//     event.target.value = ''; // reset input
//     this.emitRecentUploads();
//   }

//   removeSelectedFile(index: number): void {
//     this.selectedFiles.splice(index, 1);
//   }
//   uploadFile(): void {
//     if (this.selectedFiles.length === 0) return;

//     this.isUploading.set(true);
//     this.loadingMessage.set('Subiendo y procesando PDFs...');

//     const filesToUpload = [...this.selectedFiles];
//     this.selectedFiles = [];

//     // ===============================
//     // 🚀 SIN OCR → CARGA MASIVA
//     // ===============================
//     if (!this.useOcr) {
//       this.cargaMasivaService.subirMultiplesPDFs(filesToUpload).subscribe({
//         next: () => {
//           this.recentUploads.forEach(upload => {
//             upload.status = 'completed';
//             upload.progress = 100;
//           });

//           this.emitRecentUploads();
//           this.isUploading.set(false);
//           this.uploadCompleted.emit();

//           this.stateService.showToast(
//             'PDFs cargados correctamente (sin OCR)',
//             'success'
//           );
//         },
//         error: () => {
//           this.recentUploads.forEach(upload => {
//             upload.status = 'failed';
//             upload.progress = 0;
//           });

//           this.emitRecentUploads();
//           this.isUploading.set(false);

//           this.stateService.showToast(
//             'Error al subir los PDFs',
//             'error'
//           );
//         }
//       });

//       return; // 👈 IMPORTANTE: no seguir con OCR
//     }

//     // ===============================
//     // 🤖 CON OCR → FLUJO ACTUAL
//     // ===============================
//     const uploadNext = (index: number) => {
//       if (index >= filesToUpload.length) {
//         this.isUploading.set(false);
//         this.uploadCompleted.emit();
//         return;
//       }

//       const file = filesToUpload[index];
//       const currentUpload = this.recentUploads.find(u => u.filename === file.name);

//       if (currentUpload) {
//         currentUpload.status = 'processing';
//         currentUpload.progress = 30;
//         this.emitRecentUploads();
//       }

//       this.pdfService.uploadPdf(file, true).subscribe({
//         next: (result) => {
//           if (currentUpload) {
//             currentUpload.id = result.id;
//             currentUpload.status = 'completed';
//             currentUpload.progress = 100;
//             this.emitRecentUploads();
//           }
//           uploadNext(index + 1);
//         },
//         error: () => {
//           if (currentUpload) {
//             currentUpload.status = 'failed';
//             currentUpload.progress = 0;
//             this.emitRecentUploads();
//           }
//           uploadNext(index + 1);
//         }
//       });
//     };

//     uploadNext(0);
//   }

//   // uploadFile(): void {
//   //   if (this.selectedFiles.length === 0) return;

//   //   this.isUploading.set(true);
//   //   this.loadingMessage.set('Subiendo y procesando PDFs...');

//   //   const filesToUpload = [...this.selectedFiles];
//   //   this.selectedFiles = [];

//   //   const uploadNext = (index: number) => {
//   //     if (index >= filesToUpload.length) {
//   //       this.isUploading.set(false);
//   //       this.uploadCompleted.emit();
//   //       return;
//   //     }

//   //     const file = filesToUpload[index];
//   //     const currentUpload = this.recentUploads.find(u => u.filename === file.name);

//   //     if (currentUpload) {
//   //       currentUpload.status = 'processing';
//   //       currentUpload.progress = 30;
//   //       this.emitRecentUploads();
//   //     }

//   //     this.pdfService.uploadPdf(file, this.useOcr).subscribe({
//   //       next: (result) => {
//   //         if (currentUpload) {
//   //           currentUpload.id = result.id;
//   //           currentUpload.progress = 70;
//   //           this.emitRecentUploads();
//   //         }
//   //         uploadNext(index + 1);
//   //       },
//   //       error: () => {
//   //         if (currentUpload) {
//   //           currentUpload.status = 'failed';
//   //           currentUpload.progress = 0;
//   //           this.emitRecentUploads();
//   //         }
//   //         uploadNext(index + 1);
//   //       }
//   //     });
//   //   };

//   //   uploadNext(0);
//   // }

//   formatBytes(bytes: number): string {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   }

//   private emitRecentUploads(): void {
//     this.recentUploadsChange.emit(this.recentUploads);
//   }
// }