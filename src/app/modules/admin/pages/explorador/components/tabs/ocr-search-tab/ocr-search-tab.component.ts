import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { AuthService } from '../../../../../../../core/services/auth';
import { DocumentoService } from '../../../../../../../core/services/explorador-documento.service';

@Component({
  selector: 'app-ocr-search-tab',
  standalone: false,
  templateUrl: './ocr-search-tab.component.html',
  styleUrls: ['./ocr-search-tab.component.css']
})
export class OcrSearchTabComponent implements OnInit {
  @Input() selectedNode!: AutorizacionTreeNode | null;
  @Output() navigateToPage = new EventEmitter<number>();

  private authService = inject(AuthService);
  private documentoService = inject(DocumentoService);

  searchTerm: string = '';
  isSearching: boolean = false;
  hasSearched: boolean = false;
  searchResults: any[] = []; // Se adaptará a la respuesta del futuro endpoint

  ngOnInit(): void {
  }

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

  get canProcessOcr(): boolean {
    return !this.authService.hasRole('consulta');
  }

  onSearch(): void {
    if (!this.searchTerm.trim() || !this.archivoDigital) return;
    
    this.isSearching = true;
    this.hasSearched = true;

    this.documentoService.searchOcrEnArchivo(this.archivoDigital.id, this.searchTerm).subscribe({
      next: (response) => {
        this.isSearching = false;
        // Asumiendo que el backend devuelve { success: true, data: { results: [...] } } o { results: [...] }
        this.searchResults = response.data?.results || response.results || [];
      },
      error: (error) => {
        console.error('Error en búsqueda OCR:', error);
        this.isSearching = false;
        this.searchResults = [];
      }
    });
  }

  procesarOcrManual(): void {
    if (!this.canProcessOcr || !this.archivoDigital) return;

    console.log('Procesando OCR manualmente para:', this.archivoDigital.id);
    alert('Mock: Acción para procesar OCR (Se conectará al futuro endpoint en Node)');
  }
}
