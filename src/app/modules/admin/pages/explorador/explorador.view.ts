import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AutorizacionTreeNode } from '../../../../core/models/autorizacion-tree.model';
import { AutorizacionTreeService } from '../../../../core/services/explorador-autorizacion-tree.service';
import { AutorizacionService } from '../../../../core/services/explorador-autorizacion.service';
import { TiposAutorizacionService } from '../../../../core/services/explorador-tipos-autorizacion.service';
import { ModalidadService } from '../../../../core/services/explorador-modalidad.service';
import { DocumentoService } from '../../../../core/services/explorador-documento.service';
import { ExploradorStateService } from './services/explorador-state.service';
import { ModalService } from './services/modal.service';
import { DomSanitizer } from '@angular/platform-browser';
import { LoadingService } from '../../../../core/services/explorador-loading.service';
import { ViewerTab } from '../../../../core/helpers/tabs-permissions.helper';
import { ArchivoUrlService } from './services/archivo-url.service';

@Component({
  selector: 'app-explorador', standalone: false,
  templateUrl: './explorador.view.html',
  providers: [ExploradorStateService, ModalService]
})
export class ExploradorView implements OnInit {
  showControlPanel = signal<boolean>(false);  // Añade esta señal si quieres controlarlo
  // Servicios
  showMainHeader: boolean = true;
  private treeService = inject(AutorizacionTreeService);
  private stateService = inject(ExploradorStateService);
  private modalService = inject(ModalService);
  private autorizacionService = inject(AutorizacionService);
  private tiposAutorizacionSvc = inject(TiposAutorizacionService);
  private modalidadSvc = inject(ModalidadService);
  private documentoService = inject(DocumentoService);
  private sanitizer = inject(DomSanitizer);
  private archivoUrlService = inject(ArchivoUrlService);
  private loading = inject(LoadingService);
  tree = this.stateService.tree;
  selectedNode = this.stateService.selectedNode;
  breadcrumbs = this.stateService.breadcrumbs;
  activeTab = this.stateService.activeTab;
  // pdfUrl = this.stateService.pdfUrl;
  contextMenu = this.stateService.contextMenu;
  toast = this.stateService.toast;
  floatingNodeState: {
    visible: boolean;
    node: AutorizacionTreeNode | null;
    x: number;
    y: number;
  } = {
      visible: false,
      node: null,
      x: 0,
      y: 0
    };
  floatingState: {
    node: AutorizacionTreeNode | null;
    x: number;
    y: number;
  } | null = null;

  // Signals expuestos del modal service
  modalState = this.modalService.modalState;
  uploadModalState = this.modalService.uploadModalState;
  isDragging = this.modalService.isDragging;
  selectedFile = this.modalService.selectedFile;
  isUploading = this.modalService.isUploading;

  // Signals locales
  selectedAutorizacionId = signal<number | null>(null);

  // Computed
  tiposAutorizacion = this.tiposAutorizacionSvc.tipos;
  modalidades = this.modalidadSvc.modalidadesOrdenadas;
    private autorizacionIdCargado = signal<number | null>(null);
  documentVersions = computed(() => {
    const autorizacionId = this.selectedAutorizacionId();
    const documentos = this.documentoService.documentos();
    if (!autorizacionId) return [];
    return documentos
      .filter(d => d.autorizacionId === autorizacionId)
      .sort((a, b) => b.version - a.version);
  });
  isCollapsed = false;

  toggleExplorer() {
    this.isCollapsed = !this.isCollapsed;
  }
  // constructor() {
  //   effect(() => {
  //     const node = this.selectedNode();

  //     if (node?.type === 'autorizacion') {
  //       const autorizacionId = node.data.id;

  //       this.selectedAutorizacionId.set(autorizacionId);
  //       this.documentoService.cargarDocumentosPorAutorizacion(autorizacionId);
  //     }
  //   });
  // }  
    private route = inject(ActivatedRoute);

  constructor() {
    effect(() => {
      const node = this.selectedNode();
      const autorizacionId = node?.data?.id;

      if (node?.type === 'autorizacion' && autorizacionId) {
        // Solo cargar si es diferente al último cargado
        if (this.autorizacionIdCargado() !== autorizacionId) {
          this.autorizacionIdCargado.set(autorizacionId);
          this.selectedAutorizacionId.set(autorizacionId);
          
          console.log(` Efecto: Cargando documentos para autorización ${autorizacionId}`);
          
          // Usar la versión que retorna Observable para mejor control
          this.documentoService.cargarDocumentosPorAutorizacion(autorizacionId)
            .subscribe({
              next: (docs) => console.log(`Documentos cargados: ${docs.length}`),
              error: (err) => console.error(' Error cargando documentos:', err)
            });
        } else {
          console.log(` Usando datos existentes para autorización ${autorizacionId}`);
        }
      }
    });
  }


  onShowControlPanelChange(value: boolean): void {
    this.showControlPanel.set(value);
  }
  // // En ExploradorView
  pdfUrl = computed(() => {
    const autorizacionId = this.selectedAutorizacionId();
    const documentos = this.documentoService.documentos();
    // debugger
    // console.log('DEBUG pdfUrl:', {
    //   autorizacionId,
    //   documentosCount: documentos.length,
    //   documentos: documentos
    // });

    // if (!autorizacionId) {
    //   // console.log('DEBUG: No autorizacionId');
    //   return this.archivoUrlService.empty();
    // }

    // if (documentos.length === 0) {
    //   // console.log('DEBUG: No documentos');
    //   return this.archivoUrlService.empty();
    // }

    const documentosFiltrados = documentos.filter(d => d.autorizacionId === autorizacionId);
    // // console.log('DEBUG: Documentos filtrados:', documentosFiltrados);

    // if (documentosFiltrados.length === 0) {
    //   // console.log('DEBUG: No documentos para esta autorización');
    //   return this.archivoUrlService.empty();
    // }

    const ultimoDocumento = documentosFiltrados.sort((a, b) => b.version - a.version)[0];
    // // console.log('DEBUG: Último documento:', ultimoDocumento);

    const archivo = ultimoDocumento?.archivosDigitales?.[0];
    // // console.log('DEBUG: Archivo:', archivo);

    const url = this.archivoUrlService.buildPreviewUrl(archivo?.id);
    // console.log('DEBUG: URL generada:', url);

    return url;
  });
  ngOnInit() {
    this.treeService.init();
    this.initializeServices();
    this.subscribeToTree();

    // también reaccionamos a cambios en el parámetro "q" para que la
    // selección se aplique incluso si el usuario viene desde otra ruta.
    this.route.queryParamMap.subscribe(map => {
      const q = map.get('q');
      if (q) {
        this.stateService.selectNodeByQuery(q);
      }
    });
  }

  private initializeServices(): void {
    this.tiposAutorizacionSvc.getAll();
    this.modalidadSvc.loadModalidades();
    this.autorizacionService.autorizacionesPaginadas();

    // this.autorizacionService.autorizacionesPaginadas;
  }

  private subscribeToTree(): void {
    this.treeService.tree$.subscribe({
      next: tree => this.stateService.updateTree(tree),
      error: err => console.error('Error loading tree:', err)
    });
  }

  // Event Handlers
  onSelectNode(node: AutorizacionTreeNode): void {
    this.stateService.selectNode(node, true);
    if (node.type === 'autorizacion') {

      this.selectedAutorizacionId.set(node.data.id);
      // this.documentoService.cargarDocumentosPorAutorizacion(node.data.id);

    }
  }
  onNodeRightClick(event: { mouseEvent: MouseEvent, node: AutorizacionTreeNode }): void {
    // console.log("onNodeRightClick")
    this.stateService.showContextMenu(event.mouseEvent, event.node);
    // No llamar selectNode aquí ya que showContextMenu lo llama internamente
  }


  handleContextAction(action: string): void {
    const node = this.stateService.contextMenu().node;
    if (!node) return;

    switch (action) {
      case 'open':
        this.stateService.selectNode(node, true, true);

        if (node.children) {
          this.stateService.showToast('Carpeta expandida');
        } else {
          this.stateService.showToast('Documento cargado en visor');
        }
        break;


      case 'add_autorizacion':
        this.modalService.openCreateAutorizacionModal(node);
        break;

      case 'security':
        this.stateService.setActiveTab('security');
        break;

      case 'delete':
        this.modalService.openDeleteModal(node);
        break;

      case 'add_documento':
        this.openUploadModal();
        break;
    }
  }

  onBreadcrumbClick(node: AutorizacionTreeNode | null): void {
    if (node) {
      this.stateService.selectNode(node);
    } else {
      this.stateService.clearSelection();
    }
  }
  onTabChange(tab: ViewerTab): void {
    this.stateService.setActiveTab(tab);
  }

  // Métodos de archivos (delegados al modal service)
  onFileSelected(event: Event): void {
    this.modalService.handleFileSelected(event);
  }

  onFileDrop(event: DragEvent): void {
    this.modalService.handleFileDrop(event);
  }

  onDragOver(event: DragEvent): void {
    this.modalService.handleDragOver(event);
  }

  onDragLeave(event: DragEvent): void {
    this.modalService.handleDragLeave(event);
  }

  clearSelectedFile(event?: Event): void {
    this.modalService.clearSelectedFile(event);
  }

  async uploadFile(): Promise<void> {
    await this.modalService.uploadFile(
      this.selectedAutorizacionId(),
      this.selectedNode(),
      this.documentVersions(), this.stateService
    );
  }

  // Métodos modales
  openUploadModal(): void {
    const autorizacionId = this.selectedAutorizacionId();
    // console.log("autorizacionId")
    // console.log(autorizacionId)
    if (!autorizacionId) {
      this.stateService.showToast('Selecciona una autorización primero', 'error');
      return;
    }

    this.modalService.openUploadModal(autorizacionId, this.selectedNode());
  }

  handleModalAction(data: any): void {
    this.modalService.handleModalAction(data, this.stateService);
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  closeUploadModal(): void {
    this.modalService.closeUploadModal();
  }

  closeContextMenu(): void {
    this.stateService.closeContextMenu();
  }

  closeToast(): void {
    this.stateService.closeToast();
  }

  // Métodos auxiliares
  downloadVersion(version: any): void {
    // console.log('Descargando versión:', version);
    // Implementar lógica de descarga
  }

  restoreVersion(version: any): void {
    if (confirm(`¿Estás seguro de que deseas restaurar la versión ${version.version}?`)) {
      // console.log('Restaurando versión:', version);
      // Implementar lógica de restauración
    }
  }

  formatFileSize(bytes: number): string {
    return this.modalService.formatFileSize(bytes);
  }
  onModalDataChange(data: any): void {
    this.modalState.update(state => ({
      ...state,
      data: data
    }));
  }

}
