import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectorRef } from '@angular/core';
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
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';

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
  isRefreshing = signal(false);

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
  private router = inject(Router);
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

  completedPdfsCount() {
    return this.pdfsList.filter(p => p.status === 'completed').length;
  }

  processingPdfsCount() {
    return this.pdfsList.filter(p => p.status === 'processing' || p.status === 'pending').length;
  }

  pendingPdfsCount() {
    return this.pdfsList.filter(p => p.status === 'pending').length;
  }

  withOcrCount() {
    return this.pdfsList.filter(p => p.used_ocr).length;
  }

  withoutOcrCount() {
    return this.pdfsList.filter(p => p.used_ocr === false).length;
  }

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
  // lotesUsuario: LoteOCR[] = [];
  lotesUsuario = signal<LoteOCR[]>([]);
  isLoadingLotes = signal(false);
  constructor(
    private pdfService: PdfService,
    private cargaMasivaService: CargaMasivaService,
    private cdr: ChangeDetectorRef
    // private spinner: NgxSpinnerService
  ) { }
  private refresh$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.refresh$
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadPdfsList());

    this.refresh$.next();

    // Actualizar cada 4 minutos (240000 ms)
    this.pollTimer = setInterval(() => {
      this.refresh$.next();
    }, 240000);
  }

  // recargar() {

  //   // this.loadPdfsList();
  //   this.loadLotesUsuario();
  // }
  loadLotesUsuario(): void {
    // if (this.isRefreshing()) return;

    this.isRefreshing.set(true);
    this.isLoadingLotes.set(true);

    this.cargaMasivaService.listarLotesUsuario(20, 0)
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.lotesUsuario.set(resp.lotes);
          }
        },
        error: (err) => {
          console.error('Error cargando lotes:', err);
        },
        complete: () => {
          this.isLoadingLotes.set(false);
          this.isRefreshing.set(false);
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
    this.destroy$.next();
    this.destroy$.complete();
  }


  // ========== FUNCIONES PARA BÚSQUEDA INDIVIDUAL ==========
  loadPdfsList(): void {


    // if (this.isRefreshing()) return;    
    // this.isRefreshing.set(true);    // Ejecutar ambos en paralelo
    this.isLoadingLotes.set(true);
    // forkJoin({
    //   lotes: this.cargaMasivaService.listarLotesUsuario(20, 0),
    //   pdfs: this.pdfService.listPdfs()
    // }).subscribe({
    //   next: ({ lotes, pdfs }) => {

    //     // Actualizar lotes
    //     if (lotes.success) {
    //       this.lotesUsuario.set(lotes.lotes);
    //     }

    //     // Actualizar PDFs
    //     const updatedList = (pdfs.pdfs || []).map(p => ({
    //       id: p.id,
    //       filename: p.filename,
    //       pages: (p as any).pages ?? null,
    //       size: (p as any).size_bytes ?? 0,
    //       status: (p as any).status ?? 'pending',
    //       progress: this.calculateProgress(p),
    //       used_ocr: (p as any).used_ocr ?? false
    //     }));

    //     this.pdfsList = updatedList;
    //   },
    //   error: (err) => {
    //     console.error('Error en actualización:', err);
    //   },
    //   complete: () => {
    //      this.isLoadingLotes.set(true);
    //     this.isRefreshing.set(false);
    //   }
    // });
    forkJoin({
      lotes: this.cargaMasivaService.listarLotesUsuario(20, 0),
      pdfs: this.pdfService.listPdfs()
    })
      .pipe(
        finalize(() => {
          this.isLoadingLotes.set(false);
          this.isRefreshing.set(false);
        })
      )
      .subscribe({
        next: ({ lotes, pdfs }) => {
          if (lotes.success) {
            this.lotesUsuario.set(lotes.lotes);
          }

          const updatedList = (pdfs.pdfs || []).map(p => ({
            id: p.id,
            filename: p.filename,
            pages: (p as any).pages ?? null,
            size: (p as any).size_bytes ?? 0,
            status: (p as any).status ?? 'pending',
            progress: this.calculateProgress(p),
            used_ocr: (p as any).used_ocr ?? false
          }));

          this.pdfsList = updatedList;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error en actualización:', err);
          this.cdr.markForCheck();
        }
      });
  }

  // loadPdfsList(): void {
  //   this.loadLotesUsuario();
  //   this.pdfService.listPdfs()
  //     .subscribe({
  //       next: (result) => {
  //         const updatedList = (result.pdfs || []).map(p => ({
  //           id: p.id,
  //           filename: p.filename,
  //           pages: (p as any).pages ?? null,
  //           size: (p as any).size_bytes ?? (p as any).size ?? ((p as any).size_mb ? Math.round((p as any).size_mb * 1024 * 1024) : 0),
  //           status: (p as any).status ?? 'pending',
  //           progress: this.calculateProgress(p as any),
  //           task_id: (p as any).task_id,
  //           upload_time: (p as any).upload_time,
  //           created_at: (p as any).created_at,
  //           completed_at: (p as any).completed_at,
  //           extracted_text_path: (p as any).extracted_text_path,
  //           used_ocr: (p as any).used_ocr ?? false,
  //           error: (p as any).error
  //         } as PDFListItem));

  //         this.pdfsList = updatedList;

  //         this.recentUploads.forEach(upload => {
  //           const matchingPdf = updatedList.find(p => p.filename === upload.filename);
  //           if (matchingPdf && matchingPdf.status === 'completed') {
  //             upload.status = 'completed';
  //             upload.progress = 100;
  //             upload.id = matchingPdf.id;
  //           }
  //         });
  //       },
  //       error: (error) => {
  //         console.error('Error cargando lista de PDFs:', error);
  //       }
  //     });
  // }

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


  /*
    downloadSearchablePDF(pdfId: string): void {
      const pdf = this.pdfsList.find(p => p.id === pdfId);
      if (pdf?.status !== 'completed') {
        this.stateService.showToast('El PDF aún no ha terminado de procesarse', 'error');
        return;
      }
  
      const url = `/docs/${pdf.id}.pdf`;
  
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pdf.filename}`;
      a.click();
    }
  */
  downloadSearchablePDF(pdfId: string): void {
    const pdf = this.pdfsList.find(p => p.id === pdfId);

    if (pdf?.status !== 'completed') {
      this.stateService.showToast('El PDF aún no ha terminado de procesarse', 'error');
      return;
    }

    this.pdfService.getSearchablePdf(pdfId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdf.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(err);
        this.stateService.showToast('Error al descargar el PDF', 'error');
      }
    });
  }

  irAlExplorador(pdf: PDFListItem): void {
    const url = this.buildExploradorUrl(pdf.filename);
    if (url) {
      // el builder devuelve algo como "/admin/explorador?q=123_01_.."; nos quedamos sólo
      // con el valor de la query y utilizamos navigate para que Angular genere
      // correctamente la UrlTree y dispare la suscripción en el explorador.
      const qMatch = url.match(/\?q=(.*)$/);
      const q = qMatch ? qMatch[1] : null;
      if (q) {
        this.router.navigate(['/admin/explorador'], { queryParams: { q } });
      } else {
        // fallback al comportamiento anterior en caso de que el regex falle
        this.router.navigateByUrl(url);
      }
    } else {
      this.stateService.showToast('No se pudo construir la ruta del explorador para este archivo', 'error');
    }
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
            this.cdr.markForCheck(); // Fuerza la actualización a la vista
          };
          reader.readAsText(blob);
        },
        error: (error) => {
          this.stateService.showToast('No se pudo cargar el texto', 'error');
        }
      });
  }

  deletePdf(pdfId: string, filename: string): void {
    // la eliminación de archivos ya no está permitida desde la UI
    this.stateService.showToast('La función de eliminar PDF está deshabilitada', 'error');
    // queda el método vacío para evitar errores si se llamara por accidente
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
    // this.buildExploradorUrl(filename)

    const url = this.buildExploradorUrl(filename);

    if (url) {
      console.log("url")
      console.log(url)
      this.router.navigateByUrl(url);
    } else {
      this.stateService.showToast('No se pudo construir la URL del explorador', 'error');
    }
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
  onUploadCompleted() {
    this.refresh$.next();
  }

  // buildExploradorUrl(nombreArchivo: string): string | null {
  //   if (!nombreArchivo) return null;

  //   // daatos prueba:
  //   // 9982 3-11-01-025 C.pdf
  //   // 411 2-11-10-027 C Terminado (344pag.).pdf
  //   // 2909 2-11-01-025 C Terminado (428 pag.).pdf
  //   // 7929 2-11-64-249 C.pdf

  //   const regex = /(\d+)\s+(\d+)-(\d+)-(\d+)-(\d+)\s+([A-Z])/i;
  //   const match = nombreArchivo.match(regex);

  //   if (!match) return null;

  //   const [
  //     _,
  //     numeroAutorizacion,
  //     municipio,
  //     modalidad,
  //     consecutivo1,
  //     consecutivo2,
  //     tipo
  //   ] = match;

  //   // Formato con ceros
  //   const query = [
  //     numeroAutorizacion,
  //     municipio.padStart(2, '0'),
  //     modalidad.padStart(2, '0'),
  //     consecutivo1.padStart(2, '0'),
  //     consecutivo2.padStart(3, '0'),
  //     tipo.toUpperCase()
  //   ].join('_');

  //   return `http://localhost:4200/admin/explorador?q=${query}`;
  // }
  buildExploradorUrl(nombreArchivo: string): string | null {
    if (!nombreArchivo) return null;

    const regex = /(\d+)\s+(\d+)-(\d+)-(\d+)-(\d+)\s+([A-Z])/i;
    const match = nombreArchivo.match(regex);

    if (!match) return null;

    const [
      _,
      numeroAutorizacion,
      municipio,
      modalidad,
      consecutivo1,
      consecutivo2,
      tipo
    ] = match;

    const query = [
      numeroAutorizacion,
      municipio.padStart(2, '0'),
      modalidad.padStart(2, '0'),
      consecutivo1.padStart(2, '0'),
      consecutivo2.padStart(3, '0'),
      tipo.toUpperCase()
    ].join('_');

    // 
    return `/admin/explorador?q=${query}`;
  }
  estimarTiempoRestante(lote: any): string {
    const progreso = lote?.progresoOCR ?? lote?.porcentaje ?? 0;

    if (!progreso || progreso <= 0 || !lote?.ultimoProceso) {
      return 'Calculando...';
    }

    const ahora = new Date().getTime();
    const inicio = new Date(lote.ultimoProceso).getTime();

    const tiempoTranscurridoMs = ahora - inicio;
    const progresoDecimal = progreso / 100;

    if (progresoDecimal <= 0) return 'Calculando...';

    const estimadoTotal = tiempoTranscurridoMs / progresoDecimal;
    const restanteMs = estimadoTotal - tiempoTranscurridoMs;

    if (restanteMs <= 0) return 'Finalizando...';

    const minutos = Math.floor(restanteMs / 60000);
    const segundos = Math.floor((restanteMs % 60000) / 1000);

    return `${minutos}m ${segundos}s restantes`;
  }
  getProgresoReal(lote: any): number {

    // Si ya terminó correctamente
    if (
      lote?.porcentaje === 100 &&
      lote?.fallados === 0 &&
      lote?.archivosProcesados?.length > 0
    ) {
      return 100;
    }

    // Si está en proceso OCR
    if (lote?.progresoOCR != null) {
      return lote.progresoOCR;
    }

    return lote?.porcentaje ?? 0;
  }
  totalArchivosLotes = computed(() =>
    this.lotesUsuario().reduce((acc, lote) => acc + (lote.totalArchivos || 0), 0)
  );
}
