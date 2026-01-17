import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ModalState, UploadModalState } from '../../../models/explorador-state.model';
// import { ModalState, UploadModalState } from '../../models/explorador-state.model';

@Component({
  selector: 'app-modal-container', standalone: false,
  templateUrl: './modal-container.component.html',
  styleUrls: ['./modal-container.component.css']
})
export class ModalContainerComponent {
  @Input() modalState!: ModalState;
  @Input() uploadModalState!: UploadModalState;
  @Input() isDragging!: boolean;
  @Input() selectedFile: File | null = null;
  @Input() isUploading!: boolean;
  @Input() modalidades: any[] = [];
  @Input() tiposAutorizacion: any[] = [];
  @Input() selectedNode: any = null;

  @Output() modalAction = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();
  @Output() closeUploadModal = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() fileDropped = new EventEmitter<DragEvent>();
  @Output() dragOver = new EventEmitter<DragEvent>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() clearFile = new EventEmitter<Event | undefined>();
  @Output() uploadFile = new EventEmitter<void>();
  @Output() modalDataChange = new EventEmitter<any>();

  @ViewChild('fileInput') fileInput!: ElementRef;

  get showModal(): boolean {
    return this.modalState.visible || this.uploadModalState.visible;
  }

  get activeModalType(): string | null {
    if (this.uploadModalState.visible) return 'upload';
    if (this.modalState.visible) return this.modalState.type;
    return null;
  }

  get modalTitle(): string {
    if (this.uploadModalState.visible) return this.uploadModalState.title;
    return this.modalState.title;
  }

  get isVersionModal(): boolean {
    return this.uploadModalState.visible && this.uploadModalState.mode === 'version';
  }

  get isNewDocumentModal(): boolean {
    return this.modalState.type === 'create_documento';
  }

  get uploadButtonText(): string {
    if (this.isUploading) return 'Subiendo...';
    if (this.isVersionModal) return 'Subir versión';
    return 'Crear documento';
  }

  get actionButtonText(): string {
    switch (this.modalState.type) {
      case 'delete': return 'Eliminar';
      case 'create_autorizacion': return 'Crear';
      case 'create_documento': return 'Crear documento';
      default: return 'Confirmar';
    }
  }

  onModalAction(): void {
    this.modalAction.emit(this.modalState.data);
  }

  onCloseModal(): void {
    if (this.uploadModalState.visible) {
      this.closeUploadModal.emit();
    } else {
      this.closeModal.emit();
    }
  }

  onFileSelected(event: Event): void {
    this.fileSelected.emit(event);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropped.emit(event);
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
    if (event) event.stopPropagation();

    this.resetFileInput();
    this.clearFile.emit();
  }
  resetFileInput(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
  // onClearFile(event?: Event): void {
  //   if (event) event.stopPropagation();
  //   this.clearFile.emit(event);
  // }

  onUploadFile(): void {
    this.uploadFile.emit();
  }

  onModalDataChange(data: any): void {
    this.modalDataChange.emit(data);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  getSelectedNodeName(): string {
    // console
    return this.selectedNode?.nombre;
  }
}