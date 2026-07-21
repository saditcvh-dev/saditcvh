import { Component, Input, OnInit, inject, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { AuthService } from '../../../../../../../core/services/auth';
import { DocumentoService } from '../../../../../../../core/services/explorador-documento.service';
import { CargaMasivaService } from '../../../../../../../core/services/digitalizacion-carga-masiva.service';

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
  private cargaMasivaService = inject(CargaMasivaService);
  private cdr = inject(ChangeDetectorRef);

  searchTerm: string = '';
  isSearching: boolean = false;
  hasSearched: boolean = false;
  searchResults: any[] = []; 

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
    this.cdr.markForCheck();

    this.documentoService.searchOcrEnArchivo(this.archivoDigital.id, this.searchTerm).subscribe({
      next: (response) => {
        this.isSearching = false;
        this.searchResults = response.data?.results || response.results || [];
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error en búsqueda OCR:', error);
        this.isSearching = false;
        this.searchResults = [];
        this.cdr.markForCheck();
      }
    });
  }

  procesarOcrManual(): void {
    if (!this.canProcessOcr || !this.archivoDigital) return;

    this.archivoDigital.estado_ocr = 'procesando';
    this.cdr.markForCheck();

    this.cargaMasivaService.procesarDocumentoOcr(this.archivoDigital.id).subscribe({
      next: (response) => {
        console.log('Procesamiento iniciado:', response.message);
      },
      error: (error) => {
        console.error('Error iniciando procesamiento OCR:', error);
        this.archivoDigital.estado_ocr = 'fallido';
        this.cdr.markForCheck();
      }
    });
  }
}
