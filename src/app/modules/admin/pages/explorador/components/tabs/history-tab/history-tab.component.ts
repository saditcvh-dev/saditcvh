import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { MergePdfService } from '../../../services/pdf-merge.service';
import { DocumentoService } from '../../../../../../../core/services/explorador-documento.service';
import { LoadingService } from '../../../../../../../core/services/explorador-loading.service';
import { ExploradorStateService } from '../../../services/explorador-state.service';

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

  private stateService = inject(ExploradorStateService);
  showUploadMenu = false;
  showMergeSection = signal(false);
  private pdfService = inject(MergePdfService)
  private documentoService = inject(DocumentoService)
  private loadingService = inject(LoadingService)
  //  documentoService: DocumentoService,
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
    console.log("event?.version")
    console.log(event?.version)
    if (!event?.version || !event?.file) return;
    const archivo = event.version.archivosDigitales?.[0];

    if (!archivo?.ruta_almacenamiento) {
      console.error('No se encontró la ruta de almacenamiento');
      return;
    }

    // Soporta tanto \ como /
    const nombreArchivo = archivo.ruta_almacenamiento.split(/[/\\]/).pop();

    if (!nombreArchivo) {
      console.error('No se pudo obtener el nombre del archivo');
      return;
    }

    const firstPdfId = nombreArchivo.replace(/\.pdf$/i, '');
    this.loadingService.show();

    this.pdfService.mergeWithOutput(
      firstPdfId,
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





}