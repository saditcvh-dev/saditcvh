import { Component, Input, inject } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { DocumentoService } from '../../../../../../../core/services/explorador-documento.service';

@Component({
  selector: 'app-additional-actions-tab',
  standalone: false,
  templateUrl: './additional-actions-tab.component.html',
  styleUrls: ['./additional-actions-tab.component.css']
})
export class AdditionalActionsTabComponent {
  @Input() selectedNode!: AutorizacionTreeNode | null;
  private documentoService = inject(DocumentoService);

  pageToDelete: number | null = null;
  isDeleting: boolean = false;

  get archivoDigital() {
    if (this.selectedNode?.type === 'autorizacion' && this.selectedNode.data?.archivosDigitales?.length > 0) {
      return this.selectedNode.data.archivosDigitales[0];
    }
    return null;
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
}
