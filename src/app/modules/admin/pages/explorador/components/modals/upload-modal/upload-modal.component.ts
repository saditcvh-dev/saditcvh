import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MAX_FILE_SIZE_BYTES } from '../../../utils/constants';
import { FileHelper } from '../../../utils/file.helper';

@Component({
  selector: 'app-upload-modal', standalone: false,
  templateUrl: './upload-modal.component.html',
  styleUrls: ['./upload-modal.component.css']
})
export class UploadModalComponent {
  @Input() selectedFile: File | null = null;
  @Input() isDragging: boolean = false;
  @Input() isUploading: boolean = false;
  @Input() title: string = 'Subir archivo';
  @Input() description: string = 'Arrastra tu archivo aquí o haz clic para seleccionar';

  @Output() fileSelected = new EventEmitter<Event>();
  @Output() fileDropped = new EventEmitter<DragEvent>();
  @Output() dragOver = new EventEmitter<DragEvent>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() clearFile = new EventEmitter<Event | undefined>();

  @ViewChild('fileInput') fileInput!: ElementRef;

  readonly allowedFileTypes = '.pdf,.jpg,.jpeg,.png,.tiff,.tif,.doc,.docx';
  readonly maxFileSize = MAX_FILE_SIZE_BYTES;

  get fileTypeIcon(): string {
    if (!this.selectedFile) return 'document';

    const fileName = this.selectedFile.name.toLowerCase();
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) return 'image';
    if (fileName.endsWith('.tif') || fileName.endsWith('.tiff')) return 'image';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'word';
    return 'document';
  }

  get fileTypeLabel(): string {
    const icon = this.fileTypeIcon;
    switch (icon) {
      case 'pdf': return 'Documento PDF';
      case 'image': return 'Imagen';
      case 'word': return 'Documento Word';
      default: return 'Documento';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  validateFile(file: File) {
    return FileHelper.validateFile(file);
  }


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validation = this.validateFile(file);

      if (validation.valid) {
        this.fileSelected.emit(event);
      } else {
        alert(validation.error);
        input.value = ''; // Reset input
      }
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const validation = this.validateFile(file);

      if (validation.valid) {
        // Crear un nuevo evento similar al del input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const fakeInput = document.createElement('input');
        fakeInput.type = 'file';
        fakeInput.files = dataTransfer.files;

        const fakeEvent = new Event('change', { bubbles: true });
        Object.defineProperty(fakeEvent, 'target', { value: fakeInput });

        this.fileSelected.emit(fakeEvent);
      } else {
        alert(validation.error);
      }
    }

    this.dragLeave.emit(event);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.emit(event);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragLeave.emit(event);
  }

  onClearFile(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.clearFile.emit(event);
  }

  openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  getFileIconSvg(): string {
    switch (this.fileTypeIcon) {
      case 'pdf':
        return `<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>`;

      case 'image':
        return `<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>`;

      case 'word':
        return `<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>`;

      default:
        return `<svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>`;
    }
  }
}