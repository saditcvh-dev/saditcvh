import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Breadcrumb } from '../../models/explorador-state.model';
import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';
import { DocumentoService } from '../../../../../../core/services/explorador-documento.service';
import { AuthService } from '../../../../../../core/services/auth';
import { getAllowedTabsByRoles, ViewerTab } from '../../../../../../core/helpers/tabs-permissions.helper';
import { LoadingService } from '../../../../../../core/services/explorador-loading.service';
import { ExploradorStateService } from '../../services/explorador-state.service';

@Component({
  selector: 'app-viewer-panel',
  templateUrl: './viewer-panel.component.html',
  styleUrls: ['./viewer-panel.component.css'],
  standalone: false,
})
export class ViewerPanelComponent {
  // Inputs con two-way data binding
  private _showMainHeader = true;
  private _showControlPanel = true;
  private loadingService = inject(LoadingService)
  @Input()
  get showMainHeader(): boolean {
    return this._showMainHeader;
  }
  set showMainHeader(value: boolean) {
    if (this._showMainHeader !== value) {
      this._showMainHeader = value;
    }
  }
  @Output() showMainHeaderChange = new EventEmitter<boolean>();

  @Input()
  get showControlPanel(): boolean {
    return this._showControlPanel;
  }
  set showControlPanel(value: boolean) {
    if (this._showControlPanel !== value) {
      this._showControlPanel = value;
    }
  }
  @Output() showControlPanelChange = new EventEmitter<boolean>();

  @Input() selectedNode: AutorizacionTreeNode | null = null;
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() activeTab: ViewerTab = 'metadata';
  @Input() pdfUrl!: SafeResourceUrl;
  @Input() documentVersions: any[] = [];

  @Output() breadcrumbClick = new EventEmitter<AutorizacionTreeNode | null>();
  @Output() tabChange = new EventEmitter<ViewerTab>();
  @Output() openUploadModal = new EventEmitter<void>();
  @Output() downloadVersion = new EventEmitter<any>();
  @Output() restoreVersion = new EventEmitter<any>();

  private authService = inject(AuthService);
  constructor(private sanitizer: DomSanitizer) { }
  private documentoService = inject(DocumentoService);
  private stateService = inject(ExploradorStateService);
// private stateService: ExploradorStateService
  get nodeTypeLabel(): string {
    if (!this.selectedNode) return '';

    const typeMap: { [key: string]: string } = {
      'municipio': 'Municipio',
      'tipo': 'Tipo de Autorización',
      'autorizacion': 'Autorización'
    };

    return typeMap[this.selectedNode.type] || this.selectedNode.type;
  }

  get nodeTypeColor(): string {
    if (!this.selectedNode) return '';

    switch (this.selectedNode.type) {
      case 'municipio':
        return `
        bg-blue-100 text-blue-700 border-blue-200
        dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800
      `;
      case 'autorizacion':
        return `
        bg-green-100 text-green-700 border-green-200
        dark:bg-green-900/30 dark:text-green-300 dark:border-green-800
      `;
      default:
        return `
        bg-gray-100 text-gray-600 border-gray-200
        dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700
      `;
    }
  }

  getNodeIcon(node: AutorizacionTreeNode): string {
    const iconMap = {
      'municipio': '/assets/icons/folder.svg',
      'tipo': '/assets/icons/file.svg',
      'autorizacion': '/assets/icons/pdf.svg'
    };

    return '/assets/icons/folder.svg';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'No disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  onBreadcrumbClick(node: AutorizacionTreeNode | null): void {
    this.breadcrumbClick.emit(node);
  }

  onTabChange(tab: ViewerTab): void {
    this.tabChange.emit(tab);
  }

  onOpenUploadModal(): void {
    this.openUploadModal.emit();
  }

  onDownloadVersion(version: any): void {
    const archivo = version.archivosDigitales?.[0];
    if (!archivo) return;

 this.documentoService.descargarArchivo(archivo.id)
    .subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = archivo.nombre_archivo;
        a.click();
        window.URL.revokeObjectURL(url);

        this.stateService.showToast('Descarga iniciada correctamente', 'success');
      },
      error: () => {
        this.stateService.showToast('Error al descargar el archivo', 'error');
      }
    });
  }

  onRestoreVersion(version: any): void {
    this.restoreVersion.emit(version);
  }

  getNodeMetadata(): any {
    if (!this.selectedNode) return null;

    return {
      id: this.selectedNode.id,
      nombre: this.selectedNode.nombre,
      tipo: this.nodeTypeLabel,
      fechaCreacion: this.formatDate(this.selectedNode.data?.fecha_creacion),
      solicitante: this.selectedNode.data?.solicitante,
      modalidad: this.selectedNode.data?.modalidad_nombre,
      municipio: this.selectedNode.data?.municipio_nombre,
      estado: this.selectedNode.data?.estado || 'ACTIVO'
    };
  }

  shouldShowTabs(): boolean {
    return this.selectedNode?.type === 'autorizacion';
  }

  getSelectedNodeDetails(): {
    title: string;
    description: string;
    icon: string;
  } {
    if (!this.selectedNode) {
      return {
        title: 'Sin selección',
        description: 'Selecciona un elemento del explorador para ver sus detalles',
        icon: 'folder'
      };
    }

    const detailsMap: { [key: string]: any } = {
      'municipio': {
        title: this.selectedNode.nombre || 'Municipio',
        description: 'Contiene tipos de autorización y documentos',
        icon: 'folder'
      },
      'tipo': {
        title: this.selectedNode.nombre || 'Tipo de Autorización',
        description: 'Categoría específica de autorizaciones',
        icon: 'category'
      },
      'autorizacion': {
        title: this.selectedNode.nombre || 'Autorización',
        description: this.selectedNode.data?.descripcion || 'Documento de autorización',
        icon: 'document'
      }
    };

    return detailsMap[this.selectedNode.type] || {
      title: this.selectedNode.nombre || 'Elemento',
      description: 'Sin descripción disponible',
      icon: 'file'
    };
  }

  get userRoles(): string[] {
    return this.authService.currentUser()?.roles ?? [];
  }

  get allowedTabs(): ViewerTab[] {
    return getAllowedTabsByRoles(this.userRoles);
  }

  // Métodos para cambiar los estados
  toggleMainHeader(): void {
    const newValue = !this.showMainHeader;
    this._showMainHeader = newValue;
    this.showMainHeaderChange.emit(newValue);
  }

  toggleControlPanel(): void {
    const newValue = !this.showControlPanel;
    this._showControlPanel = newValue;
    this.showControlPanelChange.emit(newValue);
  }

  hideMainHeader(): void {
    this._showMainHeader = false;
    this.showMainHeaderChange.emit(false);
  }

  showMainHeaderPanel(): void {
    this._showMainHeader = true;
    this.showMainHeaderChange.emit(true);
  }

  // Estos métodos son llamados desde app-tabs-navigation
  onShowMainHeaderChange(value: boolean): void {
    this._showMainHeader = value;
    this.showMainHeaderChange.emit(value);
  }

  onShowControlPanelChange(value: any): void {
    this._showControlPanel = value;
    this.showControlPanelChange.emit(value);
  }
reloadVersions(): void {
  if (!this.selectedNode?.data?.id) return;

  this.loadingService.show();

  this.documentoService
    .cargarDocumentosPorAutorizacion(this.selectedNode.data.id)
    .subscribe({
      next: (docs) => {
        this.documentVersions = docs;
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
      }
    });
}


}