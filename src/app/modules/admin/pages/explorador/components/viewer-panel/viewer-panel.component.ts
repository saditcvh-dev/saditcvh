import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Breadcrumb } from '../../models/explorador-state.model';
import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';
import { DocumentoService } from '../../../../../../core/services/explorador-documento.service';
import { AuthService } from '../../../../../../core/services/auth';
import { getAllowedTabsByRoles, ViewerTab } from '../../../../../../core/helpers/tabs-permissions.helper';

@Component({
  selector: 'app-viewer-panel',
  templateUrl: './viewer-panel.component.html',
  styleUrls: ['./viewer-panel.component.css'],
  standalone: false,
})
export class ViewerPanelComponent {
  @Input() selectedNode: AutorizacionTreeNode | null = null;
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() activeTab: ViewerTab = 'metadata';

  @Input() pdfUrl: SafeResourceUrl | null = null;
  @Input() documentVersions: any[] = [];
  
  @Output() breadcrumbClick = new EventEmitter<AutorizacionTreeNode | null>();
  @Output() tabChange = new EventEmitter<ViewerTab>();
  @Output() openUploadModal = new EventEmitter<void>();
  @Output() downloadVersion = new EventEmitter<any>();
  @Output() restoreVersion = new EventEmitter<any>();
  private authService = inject(AuthService);
  constructor(private sanitizer: DomSanitizer) {}
  private documentoService = inject(DocumentoService);
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
    if (!this.selectedNode) return 'gray';
    
    switch (this.selectedNode.type) {
      case 'municipio':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'autorizacion':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  getNodeIcon(node: AutorizacionTreeNode): string {
    const iconMap = {
      'municipio': '/assets/icons/folder.svg',
      'tipo': '/assets/icons/file.svg',
      'autorizacion': '/assets/icons/pdf.svg'
    };
    
    return  '/assets/icons/folder.svg';
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
    .subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.nombre_archivo;
      a.click();
      window.URL.revokeObjectURL(url);
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
  // -----accesos a tabs  por rol
  get userRoles(): string[] {
    return this.authService.currentUser()?.roles ?? [];
  }
  get allowedTabs(): ViewerTab[] {
    return getAllowedTabsByRoles(this.userRoles);
  }


}