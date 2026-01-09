import { Injectable, signal } from '@angular/core';
import { ModalState, UploadModalState } from '../models/explorador-state.model';
import { FileHelper } from '../utils/file.helper';
import { StateHelper } from '../utils/state.helper';
import { DocumentoRequest, DocumentoService } from '../../../../../core/services/explorador-documento.service';
import { AutorizacionService } from '../../../../../core/services/explorador-autorizacion.service';
import { AutorizacionTreeNode } from '../../../../../core/models/autorizacion-tree.model';
import { LoadingService } from '../../../../../core/services/explorador-loading.service';
import { ExploradorStateService } from './explorador-state.service';

@Injectable()
export class ModalService {
  // Signals
  modalState = signal<ModalState>(StateHelper.createInitialModalState());
  uploadModalState = signal<UploadModalState>(StateHelper.createInitialUploadModalState());
  isDragging = signal(false);
  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  uploadProgress = signal(0);
  selectedNodeForUpload = signal<AutorizacionTreeNode | null>(null);

  private documentVersions = signal<any[]>([]);
  constructor(
    private documentoService: DocumentoService,
    private loadingService: LoadingService,
    private autorizacionService: AutorizacionService,
    private toast: ExploradorStateService
  ) { }
  openCreateAutorizacionModal(node: AutorizacionTreeNode): void {
    if (node.type !== 'municipio' && node.type !== 'tipo') return;

    let municipioId: number | null = null;
    let tipoId: number | string = '';

    if (node.type === 'municipio') {
      municipioId = node.data?.id ?? this.extractMunicipioId(node.id);
    }

    if (node.type === 'tipo') {
      tipoId = node.data?.id;
      municipioId = node.children?.[0]?.data?.municipioId ?? null;
    }


    this.modalState.set({
      visible: true,
      type: 'create_autorizacion',
      title: 'Nueva Autorización',
      data: {
        municipioId,
        tipoId,
        modalidadId: '1',
        solicitante: '',
        hideTipoSelect: node.type === 'tipo'
      }
    });
  }


  openDeleteModal(node: AutorizacionTreeNode): void {
    this.modalState.set({
      visible: true,
      type: 'delete',
      title: 'Eliminar Elemento',
      message: `¿Estás seguro de eliminar "${node.nombre}"?`
    });
  }

  async openUploadModal(autorizacionId: number, node: AutorizacionTreeNode | null): Promise<void> {
    console.log("node")
    console.log(node)
    try {
      const hasDocs = await this.documentoService
        .verificarDocumentosPorAutorizacion(autorizacionId)
        .toPromise();

      if (hasDocs) {
        this.openVersionModal();
      } else {
        this.openNewDocumentModal(autorizacionId, node);
      }
    } catch (error) {
      console.error('Error al verificar documentos:', error);
    }
  }

  closeModal(): void {
    this.modalState.set(StateHelper.createInitialModalState());
    this.clearSelectedFile();
  }

  closeUploadModal(): void {
    this.uploadModalState.set(StateHelper.createInitialUploadModalState());
    this.clearSelectedFile();
  }

  // Métodos de archivos
  handleFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  handleFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  clearSelectedFile(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFile.set(null);
  }

  async uploadFile(autorizacionId: number | null, selectedNode: AutorizacionTreeNode | null, documentVersions: any[], stateService: any): Promise<void> {
    if (!this.selectedFile() || !autorizacionId || !selectedNode) {
      return;
    }

    this.isUploading.set(true);

    try {
      if (this.uploadModalState().mode === 'version') {
        await this.uploadNewVersion(documentVersions, stateService);
      } else {
        alert("this.uploadNewDocument(autorizacionId, selectedNode);")
        // await this.uploadNewDocument(autorizacionId, selectedNode);
      }
    } catch (error) {
      console.error('Error al subir archivo:', error);
    } finally {
      this.isUploading.set(false);
    }
  }

  handleModalAction(data: any, stateService: any): void {
    const modal = this.modalState();

    switch (modal.type) {
      case 'delete':
        this.deleteNode(modal.data?.node, stateService);
        break;

      case 'create_autorizacion':
        this.createAutorizacion(modal.data, stateService);
        break;

      case 'create_documento':
        this.createDocumento(modal.data);
        break;

      default:
        this.closeModal();
    }
  }

  formatFileSize(bytes: number): string {
    return FileHelper.formatFileSize(bytes);
  }

  private openVersionModal(): void {
    this.uploadModalState.set({
      visible: true,
      mode: 'version',
      title: 'Crear Nueva Versión'
    });
  }

  private openNewDocumentModal(autorizacionId: number, node: AutorizacionTreeNode | null): void {
    console.log("node")
    this.modalState.set({
      visible: true,
      type: 'create_documento',
      title: 'Subir Nuevo archivo',
      data: {
        titulo: node?.nombre,
        autorizacionId,
        archivo: null
      }
    });
  }

  private validateAndSetFile(file: File): void {
    const validation = FileHelper.validateFile(file);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    this.selectedFile.set(file);
  }

  private async uploadNewVersion(documentos: any[], stateService: any): Promise<void> {
    this.loadingService.show()
    if (!documentos || documentos.length === 0) {
      this.loadingService.hide()
      stateService.showToast('No se encontró documento base', 'error');
      return;
    }

    const ultimoDocumento = documentos[0];
    const selectedFile = this.selectedFile();

    if (!selectedFile) {
      this.loadingService.hide()
      stateService.showToast('Selecciona un archivo', 'error');
      return;
    }

    try {
      await this.documentoService.crearNuevaVersion(
        ultimoDocumento.id,
        {
          titulo: ultimoDocumento.titulo,
          descripcion: ultimoDocumento.descripcion,
          tipoDocumento: ultimoDocumento.tipoDocumento,
          autorizacionId: ultimoDocumento.autorizacionId
        },
        selectedFile
      ).toPromise();
      this.loadingService.hide()
      stateService.showToast('Nueva versión creada correctamente', 'success');
       this.selectedFile.set(null)
       this.uploadModalState.update(state => ({ ...state, visible: false }));
       
      } catch (error) {
      // this.selectedFile.set(null)
      this.loadingService.hide()
      stateService.showToast('Error al crear nueva versión', 'error');
    }
  }

  private deleteNode(node: AutorizacionTreeNode | undefined, stateService: any): void {
    if (!node || node.type !== 'autorizacion') {
      stateService.showToast('Solo se pueden eliminar autorizaciones', 'error');
      this.closeModal();
      return;
    }

    const autorizacionId = node.data?.id;
    if (!autorizacionId) return;

    this.autorizacionService.eliminarAutorizacion(autorizacionId).subscribe({
      next: () => {
        stateService.showToast(`Autorización "${node.nombre}" eliminada correctamente`, 'success');
        this.closeModal();
      },
      error: (error) => {
        stateService.showToast('Error al eliminar autorización', 'error');
        console.error('Error:', error);
      }
    });
  }

  private createAutorizacion(data: any, stateService: any): void {
    this.loadingService.show()
    if (!data.municipioId || !data.modalidadId || !data.tipoId || !data.solicitante) {
      stateService.showToast('Completa todos los campos obligatorios', 'error');
      return;
    }

    const payload = {
      municipio_id: data.municipioId,
      modalidad_id: Number(data.modalidadId),
      tipo_id: Number(data.tipoId),
      solicitante: data.solicitante,
    };

    this.autorizacionService.crearAutorizacion(payload).subscribe({
      next: () => {
        this.loadingService.hide()
        stateService.showToast('Autorización creada correctamente', 'success');
        this.closeModal();
      },
      error: (error) => {
        this.loadingService.hide()
        stateService.showToast('Error al crear autorización', 'error');
        console.error('Error:', error);
      }
    });
  }

  private createDocumento(data: any): void {
    this.loadingService.show()
    data.archivo = this.selectedFile();

    if (!data.titulo || !data.autorizacionId || !data.archivo) {
      this.loadingService.hide()
      this.toast.showToast('Título, autorización y archivo son obligatorios', 'error');
      return;
    }

    const payload: DocumentoRequest = {
      titulo: data.titulo,
      descripcion: data.descripcion,
      tipoDocumento: data.tipoDocumento,
      fechaDocumento: data.fechaDocumento,
      autorizacionId: data.autorizacionId,
    };

    this.documentoService.crearDocumento(payload, data.archivo).subscribe({
      next: () => {
        this.loadingService.hide()
        this.toast.showToast('Documento creado correctamente');
        this.closeModal();
      },
      error: () => {
        this.loadingService.hide()
        this.toast.showToast('Error al crear el documento', 'error');
      }
    });
  }
  private extractMunicipioId(nodeId: string): number | null {
    const match = nodeId.match(/municipio-(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}