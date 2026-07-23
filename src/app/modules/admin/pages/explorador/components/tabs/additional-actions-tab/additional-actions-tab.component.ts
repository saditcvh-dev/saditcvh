import { Component, Input, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { DocumentoService } from '../../../../../../../core/services/explorador-documento.service';
import { CargaMasivaService } from '../../../../../../../core/services/digitalizacion-carga-masiva.service';
import { ModalService } from '../../../services/modal.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-additional-actions-tab',
  standalone: false,
  templateUrl: './additional-actions-tab.component.html',
  styleUrls: ['./additional-actions-tab.component.css']
})
export class AdditionalActionsTabComponent implements OnDestroy {
  @Input() selectedNode!: AutorizacionTreeNode | null;
  private documentoService = inject(DocumentoService);
  private cargaMasivaService = inject(CargaMasivaService);
  private cdr = inject(ChangeDetectorRef);
  private modalService = inject(ModalService);
  private pollingSubscription?: Subscription;

  pageToDelete: number | null = null;
  isDeleting: boolean = false;
  isProcessing: boolean = false;

  get archivoDigital() {
    if (this.selectedNode?.type === 'autorizacion') {
      const autorizacionId = this.selectedNode.data?.id;
      if (!autorizacionId) return null;

      const documentos = this.documentoService.documentos();
      let todasLasVersiones: any[] = [];

      documentos.filter(d => d.autorizacionId === autorizacionId).forEach(doc => {
        todasLasVersiones.push({ ...doc, versiones: [] });
        if (doc.versiones && Array.isArray(doc.versiones)) {
          todasLasVersiones.push(...doc.versiones);
        }
      });

      const versionesActivas = todasLasVersiones.filter(d => !d.deleted_at);
      const ultimoDocumento = versionesActivas.sort((a, b) => b.version - a.version)[0];

      if (ultimoDocumento?.archivosDigitales?.length > 0) {
        return ultimoDocumento.archivosDigitales[0];
      }
    }
    return null;
  }

  get estadoOcr(): string {
    return this.archivoDigital?.estado_ocr || 'pendiente';
  }

  eliminarPagina(): void {
    if (!this.pageToDelete || this.pageToDelete <= 0 || !this.archivoDigital) return;

    if (confirm(`¿Estás seguro que deseas eliminar la página ${this.pageToDelete}? Esto creará una nueva versión del documento y conservará el OCR actual hasta que lo reproceses.`)) {
      this.isDeleting = true;
      
      this.documentoService.eliminarPagina(this.archivoDigital.id, this.pageToDelete).subscribe({
        next: (response) => {
          this.isDeleting = false;
          if (response.success) {
            alert('Página eliminada correctamente. Se ha creado una nueva versión del documento.');
            this.pageToDelete = null;
            // Emitir evento para recargar si es necesario
            if (this.selectedNode?.type === 'autorizacion' && this.selectedNode.data?.id) {
              this.documentoService.cargarDocumentosPorAutorizacion(this.selectedNode.data.id, true).subscribe();
              this.cdr.markForCheck();
            }
          }
        },
        error: (error) => {
          console.error('Error al eliminar página:', error);
          this.isDeleting = false;
          alert('Error al eliminar la página: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  abrirModalTransferencia(): void {
    if (this.selectedNode?.type === 'autorizacion') {
      this.modalService.openTransferirAutorizacionModal(this.selectedNode);
    }
  }

  procesarDocumento(): void {
    if (!this.archivoDigital) return;

    this.isProcessing = true;
    this.archivoDigital.estado_ocr = 'procesando';
    this.cdr.markForCheck();

    this.cargaMasivaService.procesarDocumentoOcr(this.archivoDigital.id).subscribe({
      next: (response) => {
        console.log('Procesamiento iniciado:', response.message);
        this.isProcessing = false;
        this.cdr.markForCheck();
        this.iniciarPolling();
      },
      error: (error) => {
        console.error('Error iniciando procesamiento OCR:', error);
        this.archivoDigital.estado_ocr = 'fallido';
        this.isProcessing = false;
        this.cdr.markForCheck();
      }
    });
  }

  private iniciarPolling(): void {
    this.detenerPolling();
    const autorizacionId = this.selectedNode?.data?.id;
    if (!autorizacionId) return;

    this.pollingSubscription = interval(5000).subscribe(() => {
      this.documentoService.cargarDocumentosPorAutorizacion(autorizacionId, true).subscribe({
        next: () => {
          this.cdr.markForCheck();
          if (this.archivoDigital && this.archivoDigital.estado_ocr !== 'procesando') {
             this.detenerPolling();
          }
        },
        error: () => this.detenerPolling()
      });
    });
  }

  private detenerPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }
}
