import { Component, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { MergePdfService } from '../../../services/pdf-merge.service';
import { DocumentoService } from '../../../../../../../core/services/explorador-documento.service';
import { LoadingService } from '../../../../../../../core/services/explorador-loading.service';
import { ExploradorStateService } from '../../../services/explorador-state.service';
import { AuthService } from '../../../../../../../core/services/auth';
import { MunicipioService } from '../../../../../../../core/services/explorador-municipio.service';

@Component({
  selector: 'app-history-tab',
  standalone: false,
  templateUrl: './history-tab.component.html',
  styleUrls: ['./history-tab.component.css']
})
export class HistoryTabComponent {
  @Input() fullScreenMode: boolean = false;
  @Input() selectedNode!: AutorizacionTreeNode | null;
  @Input() documentVersions: any[] = [];

  @Output() openUploadModal = new EventEmitter<void>();
  @Output() downloadVersion = new EventEmitter<any>();
  @Output() restoreVersion = new EventEmitter<any>();
  @Output() versionCreated = new EventEmitter<void>();
  @Output() versionDeleted = new EventEmitter<void>();

  private stateService = inject(ExploradorStateService);
  showUploadMenu = false;
  showMergeSection = signal(false);
  private pdfService = inject(MergePdfService)
  private documentoService = inject(DocumentoService)
  private loadingService = inject(LoadingService)
  private authService = inject(AuthService);
  private municipioService = inject(MunicipioService);
  
  isAdmin = computed(() => this.authService.hasRole('administrador'));

  get versionesActivasCount(): number {
    return this.documentVersions?.filter(v => !v.deleted_at)?.length || 0;
  }

  // --- Permisos de Acceso Territoriales ---
  // --- Permisos de Acceso Territoriales ---
  canEdit(): boolean {
      if(this.isAdmin()) return true;
      const data = this.selectedNode?.data;
      if (!data) return false;
      
      const municipioId = this.selectedNode?.type === 'autorizacion' 
          ? (data.municipioId || data.municipio?.id) 
          : (this.selectedNode?.type === 'municipio' ? data.id : null);
          
      if (!municipioId) return false;
      const territorio = this.municipioService.municipios().find(m => m.id === municipioId);
      const permisos = territorio?.permisos;
      
      if (!permisos || !Array.isArray(permisos)) return false;
      return permisos.includes('editar');
  }

  canDownload(): boolean {
      if(this.isAdmin()) return true;
      const data = this.selectedNode?.data;
      if (!data) return false;
      
      const municipioId = this.selectedNode?.type === 'autorizacion' 
          ? (data.municipioId || data.municipio?.id) 
          : (this.selectedNode?.type === 'municipio' ? data.id : null);
          
      if (!municipioId) return false;
      const territorio = this.municipioService.municipios().find(m => m.id === municipioId);
      const permisos = territorio?.permisos;
      
      if (!permisos || !Array.isArray(permisos)) return false;
      return permisos.includes('descargar');
  }

  @Output() openMergePdf = new EventEmitter<void>();
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  getFileNameFromPath(path?: string): string {
    if (!path) return 'Documento';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  onDownloadVersion(version: any): void {
    this.downloadVersion.emit(version);
  }

  onRestoreVersion(version: any): void {
    this.restoreVersion.emit(version);
  }

  onOpenUploadModal(): void {
    this.openUploadModal.emit();
  }

  toggleUploadMenu(): void {
    this.showUploadMenu = !this.showUploadMenu;
  }

  onUploadNewVersion(): void {
    this.showUploadMenu = false;
    this.openUploadModal.emit();
  }
  onOpenMergePdf(): void {
    this.showUploadMenu = false;
    this.showMergeSection.set(true);
  }

  onMergePdf(event: { version: any; file: File; position: 'start' | 'end' }): void {
  if (!event?.version || !event?.file) return;

    const archivo = event.version.archivosDigitales?.[0];

    if (!archivo?.ruta_almacenamiento) {
      console.error('No se encontró la ruta de almacenamiento');
      return;
    }

    //  Normalizar 
    const firstPdfPath = archivo.ruta_almacenamiento.replace(/\\/g, '/');

    this.loadingService.show();

    this.pdfService.mergeWithOutput(
      firstPdfPath,
      event.file,
      true,
      event.position
    ).subscribe({
      next: async (blob: Blob) => {
        const mergedFile = new File(
          [blob],
          `merged_v${event.version.version + 1}.pdf`,
          { type: 'application/pdf' }
        );

        try {
          await this.documentoService.crearNuevaVersion(
            event.version.id,
            {
              titulo: event.version.titulo,
              descripcion: event.version.descripcion,
              tipoDocumento: event.version.tipo_documento,
              autorizacionId: event.version.autorizacionId
            },
            mergedFile
          ).toPromise();

          this.loadingService.hide();
          this.showMergeSection.set(false);

          this.versionCreated.emit();
          this.stateService.showToast('Nueva versión creada correctamente', 'success');
        } catch (error) {
          this.loadingService.hide();
           this.stateService.showToast('Ocurrió un error', 'error');
           console.error('Error al crear nueva versión:', error);
          }
        },
        error: () => {
        this.stateService.showToast('Error al fusionar los documentos PDF', 'error');
              // this.showToast('Error al fusionar los documentos PDF', 'error');

        this.loadingService.hide();
      }
    });
  }

  onDeleteVersion(version: any): void {
    if (!this.isAdmin()) return;
    
    // Calcular versiones activas
    const versionesActivas = this.documentVersions.filter(v => !v.deleted_at);

    // Si ha sido marcada como eliminada o solo queda 1 version activa globalmente, no se puede borrar
    if (version.deleted_at || versionesActivas.length <= 1) return;

    if (confirm('¿Estás seguro de que deseas eliminar lógicamente esta versión? Esta acción revocará el acceso al archivo.')) {
      this.loadingService.show();
      const parentId = version.documento_padre_id || version.id;

      this.documentoService.eliminarVersion(parentId, version.id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.stateService.showToast('Versión eliminada correctamente', 'success');
          this.versionDeleted.emit();
        },
        error: (err: any) => {
          this.loadingService.hide();
          this.stateService.showToast('Error al eliminar la versión', 'error');
          console.error(err);
        }
      });
    }
  }

}
