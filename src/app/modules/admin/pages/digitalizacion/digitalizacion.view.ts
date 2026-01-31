import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  PdfService,
  PDFUploadResponse,
  SearchResponse,
  PDFInfo,
  PDFListItem,
  SearchResult,
  GlobalSearchResponse,
  DocumentMatch
} from './services/pdf-ocr.service';
import { ExploradorStateService } from '../explorador/services/explorador-state.service';
import { CargaMasivaService, LoteOCR } from '../../../../core/services/digitalizacion-carga-masiva.service';
// import Swal from 'sweetalert2';

@Component({
  standalone: false,
  templateUrl: './digitalizacion.view.html',
})
export class DigitalizacionView implements OnInit, OnDestroy {
  // Cambia la definicion del tipo activeTab para incluir 'files':
  activeTab: 'search' | 'upload' | 'quick' | 'global' | 'files' | 'lotes' = 'upload';

  // Agrega estas propiedades:
  viewMode: 'cards' | 'table' = 'cards';
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuPdf: any = null;

  // Agrega estos metodos:
  onContextMenu(event: MouseEvent, pdf: any) {
    event.preventDefault();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuPdf = pdf;
    this.showContextMenu = true;
  }

  closeContextMenu() {
    this.showContextMenu = false;
    this.contextMenuPdf = null;
  }

  private stateService = inject(ExploradorStateService);
  toast = this.stateService.toast;
  closeToast(): void {
    this.stateService.closeToast();
  }

  pdfsList: PDFListItem[] = [];
  selectedPdfId: string = '';
  searchTerm: string = '';
  caseSensitive: boolean = false;
  searchResults: SearchResponse | null = null;
  selectedPdfInfo: PDFInfo | null = null;

  // Variables para búsqueda rápida
  quickSearchFile: File | null = null;
  quickSearchTerm: string = '';
  quickSearchResults: SearchResponse | null = null;
  quickUseOcr: boolean = true;

  // Variables para búsqueda global
  globalSearchTerm: string = '';
  globalCaseSensitive: boolean = false;
  globalSearchResults: GlobalSearchResponse | null = null;

  // Variables para visualización
  pdfTextContent: string = '';
  showTextModal: boolean = false;

  // Signals para indicadores específicos por operación
  // isUploading = signal(false);
  isSearching = signal(false);
  isQuickSearching = signal(false);
  isGlobalSearching = signal(false);
  loadingMessage = signal('Procesando...');

  // Computed properties para estadísticas
  completedPdfsCount = computed(() => {
    return this.pdfsList.filter(p => p.status === 'completed').length;
  });

  processingPdfsCount = computed(() => {
    return this.pdfsList.filter(p => p.status === 'processing').length;
  });

  pendingPdfsCount = computed(() => {
    return this.pdfsList.filter(p => p.status === 'pending').length;
  });

  withOcrCount = computed(() => {
    return this.pdfsList.filter(p => p.used_ocr).length;
  });

  withoutOcrCount = computed(() => {
    return this.pdfsList.filter(p => p.used_ocr === false).length;
  });

  selectedPdfFilename = computed(() => {
    if (!this.selectedPdfId) return '';
    const pdf = this.pdfsList.find(p => p.id === this.selectedPdfId);
    return pdf ? pdf.filename : '';
  });

  // Estado de procesos recientes
  recentUploads: Array<{
    id: string;
    filename: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    timestamp: Date;
  }> = [];

  // Polling para actualizar la lista automáticamente
  pollIntervalMs: number = 3000; // 3 segundos (más rápido)
  private pollTimer: any = null;
  lotesUsuario: LoteOCR[] = [];
  isLoadingLotes = signal(false);
  constructor(
    private pdfService: PdfService,
    private cargaMasivaService: CargaMasivaService,

    // private spinner: NgxSpinnerService
  ) { }

  ngOnInit() {
    this.loadPdfsList();
    this.loadLotesUsuario();

    // this.startPolling();
  }
  recargar() {

    this.loadPdfsList();
    this.loadLotesUsuario();
  }
  loadLotesUsuario(): void {
    this.isLoadingLotes.set(true);

    this.cargaMasivaService.listarLotesUsuario(20, 0)
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.lotesUsuario = resp.lotes;
          }
          this.isLoadingLotes.set(false);
        },
        error: (err) => {
          console.error('Error cargando lotes:', err);
          this.isLoadingLotes.set(false);
        }
      });
  }
  // startPolling(): void {
  //   this.pollTimer = setInterval(() => {
  //     try {
  //       this.loadPdfsList();
  //       this.updateRecentUploadsStatus();
  //     } catch (e) {
  //       console.error('Error en polling de lista de PDFs:', e);
  //     }
  //   }, this.pollIntervalMs);
  // }
  // Actualizar este método
  updateRecentUploadsStatus(): void {
    this.recentUploads.forEach(upload => {
      const matchingPdf = this.pdfsList.find(p => p.id === upload.id);
      if (matchingPdf) {
        upload.status = matchingPdf.status as any;
        upload.progress = matchingPdf.progress || 0;
      }
    });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.recentUploads = this.recentUploads.filter(upload =>
      upload.status !== 'completed' || upload.timestamp > fiveMinutesAgo
    );
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }


  // ========== FUNCIONES PARA BÚSQUEDA INDIVIDUAL ==========
  loadPdfsList(): void {
    this.pdfService.listPdfs()
      .subscribe({
        next: (result) => {
          const updatedList = (result.pdfs || []).map(p => ({
            id: p.id,
            filename: p.filename,
            pages: (p as any).pages ?? null,
            size: (p as any).size_bytes ?? (p as any).size ?? ((p as any).size_mb ? Math.round((p as any).size_mb * 1024 * 1024) : 0),
            status: (p as any).status ?? 'pending',
            progress: this.calculateProgress(p as any),
            task_id: (p as any).task_id,
            upload_time: (p as any).upload_time,
            created_at: (p as any).created_at,
            completed_at: (p as any).completed_at,
            extracted_text_path: (p as any).extracted_text_path,
            used_ocr: (p as any).used_ocr ?? false,
            error: (p as any).error
          } as PDFListItem));

          this.pdfsList = updatedList;

          this.recentUploads.forEach(upload => {
            const matchingPdf = updatedList.find(p => p.filename === upload.filename);
            if (matchingPdf && matchingPdf.status === 'completed') {
              upload.status = 'completed';
              upload.progress = 100;
              upload.id = matchingPdf.id;
            }
          });
        },
        error: (error) => {
          console.error('Error cargando lista de PDFs:', error);
        }
      });
  }

  calculateProgress(pdf: any): number {
    if (pdf.status === 'completed') return 100;
    if (pdf.status === 'processing') return pdf.progress || 50;
    if (pdf.status === 'pending') return pdf.progress || 10;
    if (pdf.status === 'failed') return 0;
    return 0;
  }

  onPdfSelect(pdfId: string): void {
    this.selectedPdfId = pdfId;
    this.loadPdfInfo(pdfId);
  }

  loadPdfInfo(pdfId: string): void {
    this.pdfService.getPdfInfo(pdfId)
      .subscribe({
        next: (info) => {
          this.selectedPdfInfo = info;
        },
        error: (error) => {
          console.error('Error cargando información del PDF:', error);
        }
      });
  }

  searchInPdf(): void {
    if (!this.selectedPdfId || !this.searchTerm.trim()) {
      // Swal.fire('Advertencia', 'Selecciona un PDF y escribe un término de búsqueda', 'warning');
      this.stateService.showToast('Por favor selecciona un PDF y escribe un término de búsqueda', 'error');
      return;
    }

    this.isSearching.set(true);

    const selectedPdf = this.pdfsList.find(p => p.id === this.selectedPdfId);
    if (selectedPdf?.status !== 'completed') {
      this.stateService.showToast('El PDF aún está siendo procesado. La búsqueda solo está disponible para documentos completados.', 'error');
      this.isSearching.set(false);
      // Swal.fire({
      //   icon: 'warning',
      //   title: 'PDF en proceso',
      //   html: `El PDF "<b>${selectedPdf?.filename}</b>" aún está siendo procesado.<br>
      //          La búsqueda solo está disponible para documentos completados.`,
      //   showCancelButton: true,
      //   confirmButtonText: 'Esperar y continuar',
      //   cancelButtonText: 'Cancelar'
      // }).then((result) => {
      //   if (result.isConfirmed) {
      //     setTimeout(() => this.executeSearch(), 2000);
      //   } else {
      //     this.isSearching.set(false);
      //   }
      // });
    } else {
      this.executeSearch();
    }
  }

  executeSearch(): void {
    this.pdfService.searchPdf(this.selectedPdfId, this.searchTerm, this.caseSensitive)
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          if (results.total_matches === 0) {
            this.stateService.showToast('No se encontraron coincidencias', 'error');
          }
          this.isSearching.set(false);
        },
        error: (error) => {
          this.stateService.showToast(error.error?.detail || 'Error en la búsqueda', 'error');
          this.isSearching.set(false);
        }
      });
  }

  downloadText(pdfId: string): void {
    const pdf = this.pdfsList.find(p => p.id === pdfId);
    if (pdf?.status !== 'completed') {
      this.stateService.showToast('El PDF aún no ha terminado de procesarse', 'error');
      return;
    }

    this.pdfService.getPdfText(pdfId)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${pdf.filename}_texto.txt`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.stateService.showToast('Texto descargado correctamente', 'success');
        },
        error: (error) => {
          this.stateService.showToast('No se pudo descargar el texto', 'error');
        }
      });
  }



  downloadSearchablePDF(pdfId: string): void {
    const pdf = this.pdfsList.find(p => p.id === pdfId);
    if (pdf?.status !== 'completed') {
      this.stateService.showToast('El PDF aún no ha terminado de procesarse', 'error');
      return;
    }

    this.pdfService.getSearchablePdf(pdfId)   // nuevo endpoint que debes crear
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${pdf.filename}_searchable.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.stateService.showToast('PDF con texto descargado correctamente', 'success');
        },
        error: (error) => {
          this.stateService.showToast('No se pudo descargar el PDF con texto', 'error');
        }
      });
  }
  viewText(pdfId: string): void {
    const pdf = this.pdfsList.find(p => p.id === pdfId);
    if (pdf?.status !== 'completed') {
      this.stateService.showToast('El PDF aún no ha terminado de procesarse', 'error');
      return;
    }

    this.pdfService.getPdfText(pdfId)
      .subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            this.pdfTextContent = reader.result as string;
            this.showTextModal = true;
          };
          reader.readAsText(blob);
        },
        error: (error) => {
          this.stateService.showToast('No se pudo cargar el texto', 'error');
        }
      });
  }

  deletePdf(pdfId: string, filename: string): void {
    // mostrart alerta de comfirmacion del navegador reemplazar swal.fire por window.confirm
    const confirmed = window.confirm(`¿Estás seguro de eliminar "${filename}"? Esta acción no se puede deshacer.`);
    // if (!confirmed) return;
    if (confirmed) {
      this.pdfService.deletePdf(pdfId)
        .subscribe({
          next: () => {
            this.loadPdfsList();
            if (this.selectedPdfId === pdfId) {
              this.selectedPdfId = '';
              this.selectedPdfInfo = null;
              this.searchResults = null;
            }
            this.recentUploads = this.recentUploads.filter(u => u.id !== pdfId);
            this.stateService.showToast('PDF eliminado correctamente', 'success');
          },
          error: (error) => {
            this.stateService.showToast(error.error?.detail || 'Error al eliminar', 'error');
          }
        });
    }
  }

  // ========== FUNCIONES PARA BÚSQUEDA RÁPIDA ==========
  onQuickFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.quickSearchFile = file;
      this.stateService.showToast('Archivo seleccionado con éxito', 'success');
    } else {
      this.stateService.showToast('Por favor selecciona un archivo PDF válido', 'error');
      this.quickSearchFile = null;
    }
  }

  quickSearch(): void {
    if (!this.quickSearchFile || !this.quickSearchTerm.trim()) {
      this.stateService.showToast('Selecciona un archivo y escribe un término de búsqueda', 'error');
      return;
    }

    this.isQuickSearching.set(true);

    this.pdfService.quickSearch(this.quickSearchFile, this.quickSearchTerm, this.quickUseOcr)
      .subscribe({
        next: (results) => {
          this.quickSearchResults = results;
          if (results.total_matches === 0) {
            this.stateService.showToast('No se encontraron coincidencias', 'error');
          }
          this.isQuickSearching.set(false);
        },
        error: (error) => {
          this.stateService.showToast(error.error?.detail || 'Error en la búsqueda', 'error');
          this.isQuickSearching.set(false);
        }
      });
  }

  // ========== FUNCIONALIDAD: BÚSQUEDA GLOBAL ==========
  performGlobalSearch(): void {
    if (!this.globalSearchTerm.trim()) {
      this.stateService.showToast('Escribe un término de búsqueda para la búsqueda global', 'error');
      return;
    }

    const completedPdfs = this.pdfsList.filter(p => p.status === 'completed');
    if (completedPdfs.length === 0) {
      this.stateService.showToast('No hay PDFs procesados para buscar', 'error');
      return;
    }

    this.isGlobalSearching.set(true);

    this.pdfService.globalSearch(
      this.globalSearchTerm,
      this.globalCaseSensitive,
      100,
      100
    ).subscribe({
      next: (response) => {
        this.globalSearchResults = response;
        if (response.total_matches === 0) {
          this.stateService.showToast('No se encontraron coincidencias en la búsqueda global', 'error');
        }
        this.isGlobalSearching.set(false);
      },
      error: (error) => {
        this.stateService.showToast(error.error?.detail || 'Error en la búsqueda global', 'error');
        this.isGlobalSearching.set(false);
      }
    });
  }

  goToDocumentSearch(pdfId: string, filename: string = ''): void {
    this.selectedPdfId = pdfId;
    this.searchTerm = this.globalSearchTerm;
    this.caseSensitive = this.globalCaseSensitive;
    this.activeTab = 'search';
    this.onPdfSelect(pdfId);

    this.stateService.showToast(`Navegando a búsqueda en "${filename || 'el documento seleccionado'}"`, 'success');
  }

  // ========== FUNCIONES DE UTILIDAD ==========
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string | Date | undefined): string {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  closeTextModal(): void {
    this.showTextModal = false;
    this.pdfTextContent = '';
  }

  // Helper para verificar estado de proceso
  getProcessingStatus(): string {
    const processing = this.pdfsList.filter(p => p.status === 'processing').length;
    const pending = this.pdfsList.filter(p => p.status === 'pending').length;

    if (processing > 0) return `${processing} en proceso`;
    if (pending > 0) return `${pending} en cola`;
    return 'Todos completados';
  }

  // Propiedades computadas adicionales
  get textContentLength(): number {
    return this.pdfTextContent ? this.pdfTextContent.length : 0;
  }

  get textContentLines(): number {
    return this.pdfTextContent ? this.pdfTextContent.split('\n').length : 0;
  }

  get totalPdfsCount(): number {
    return this.pdfsList.length;
  }
  onUploadCompleted(): void {
    this.loadPdfsList();
  }
}
