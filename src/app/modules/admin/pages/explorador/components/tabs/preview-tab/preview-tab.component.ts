import {
  Component,
  Input,
  SimpleChanges,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
  signal,
  SecurityContext,
  AfterViewInit
} from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';

declare const pdfjsLib: any;

// Interfaces para el sistema de comentarios
interface PdfComment {
  id: number;
  page: number;
  text: string;
  date: Date;
  position?: { x: number; y: number };
  color: string;
}

interface SearchResult {
  page: number;
  matches: number;
  positions: any[];
}

interface PageThumbnail {
  page: number;
  element: HTMLElement;
}

interface DocumentInfo {
  fileName: string;
  fileSize: number;
  totalPages: number;
  lastOpened: string;
}

@Component({
  selector: 'app-preview-tab',
  standalone: false,
  templateUrl: './preview-tab.component.html',
  styleUrls: ['./preview-tab.component.css'],
})
export class PreviewTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() selectedNode: AutorizacionTreeNode | null = null;
  @Input() pdfUrl: SafeResourceUrl | null = null;

  @ViewChild('pdfContainer', { static: true })
  pdfContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('commentTextarea', { static: false })
  commentTextarea!: ElementRef<HTMLTextAreaElement>;

  @ViewChild('searchInput', { static: false })
  searchInput!: ElementRef<HTMLInputElement>;

  scaledWidth: number = 800; // Ancho base, ajustar según necesidad

  // Variables para el zoom táctil
  private initialDistance: number = 0;
  private initialScale: number = 1;
  isPinching: boolean = false;
  private lastTouch1: Touch | null = null;
  private lastTouch2: Touch | null = null;

  // Nuevas propiedades para control de renderizado
  private isRendering = false;
  private currentRenderId = 0;

  // Propiedades del documento PDF
  pdfDoc: any = null;
  totalPages = 0;
  scale = 1.0;
  isLoading = false;
  isLoadingPages = false;
  loadingProgress = 0;
  currentFileName: string = '';
  currentFileSize: number = 0;
  isFullscreen = false;

  // Sistema de comentarios
  comments: PdfComment[] = [];
  newCommentText: string = '';
  selectedComment: PdfComment | null = null;
  showCommentsPanel = false;
  nextCommentId = 1;

  // Colores para comentarios
  commentColors: string[] = [
    '#3B82F6', // Azul
    '#10B981', // Verde
    '#F59E0B', // Amarillo
    '#EF4444', // Rojo
    '#8B5CF6', // Púrpura
    '#6B7280'  // Gris
  ];

  selectedColor = this.commentColors[0];
  commentModeActive = false;
  filterByPage: number | null = null;
  searchQuery = '';
  jumpToPage: number | null = null;

  // Sistema de búsqueda
  searchText: string = '';
  searchResults: SearchResult[] = [];
  currentSearchResultIndex = 0;
  totalSearchMatches = 0;
  isSearching = false;
  showSearchPanel = false;

  // Gestión de páginas visibles
  visiblePages: number[] = [];
  pageThumbnails: PageThumbnail[] = [];
  showAllThumbnails = false;
  currentVisiblePage = 1;
  pagesRendered = new Set<number>();
  showScrollTop = false;

  // Variables temporales para comentarios
  private selectedCommentPosition: { x: number; y: number; page: number } | null = null;
  private textLayers: Map<number, HTMLDivElement> = new Map();

  // Configuración
  autoSaveInterval: any;
  readonly AUTO_SAVE_INTERVAL = 30000;
  readonly PAGES_PER_LOAD = 5;
  readonly MAX_FILE_SIZE = 500 * 1024 * 1024;

  private scrollTimeout: any;
  private resizeObserver: ResizeObserver | null = null;

  // Estados originales del componente
  hasError = signal(false);

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.setupAutoSave();
    this.loadSavedState();
    this.setupKeyboardShortcuts();

    // Cargar pdfjs si no está disponible
    if (typeof pdfjsLib === 'undefined') {
      this.loadPdfJsLibrary();
    }
    this.calculateScaledWidth();
    this.loadZoomState();
  }

  ngAfterViewInit() {
    // Ahora los ViewChild están disponibles
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pdfUrl'] && this.pdfUrl) {
      this.hasError.set(false);
      if (this.isAutorizacion) {
        this.loadPdfFromUrl();
      }
    }

    if (changes['selectedNode']) {
      if (this.selectedNode?.type === 'autorizacion') {
        // Resetear el visor cuando cambia el nodo
        this.resetDocument();
        this.hasError.set(false);
      }
    }
  }

  // ========== MÉTODOS PÚBLICOS ==========

  get isAutorizacion(): boolean {
    return this.selectedNode?.type === 'autorizacion';
  }

  get hasPreview(): boolean {
    return this.isAutorizacion && !!this.pdfUrl;
  }

  getFileType(): 'pdf' | 'image' | 'document' | 'unknown' {
    if (!this.selectedNode?.nombre) return 'unknown';

    const name = this.selectedNode.nombre.toLowerCase();

    if (name.endsWith('.pdf')) return 'pdf';
    if (/\.(jpg|jpeg|png|tif|tiff)$/.test(name)) return 'image';
    if (/\.(doc|docx)$/.test(name)) return 'document';

    return 'unknown';
  }

  getNodeIcon(node: AutorizacionTreeNode | null): string {
    if (!node) return '';

    switch (node.type) {
      case 'municipio':
        return `
        <svg class="w-full h-full text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>`;
      case 'autorizacion':
        return `
        <svg class="w-full h-full text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 2l5 5v15a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2h3z" />
        </svg>`;
      default:
        return '';
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileSize(): string {
    if (this.currentFileSize === 0) return '';
    return this.formatBytes(this.currentFileSize);
  }

  getZoomPercentage(): number {
    return Math.round(this.scale * 100);
  }

  // ========== MANEJO DE PDF ==========

  private loadPdfJsLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
    script.onload = () => {
      console.log('PDF.js library loaded');
    };
    script.onerror = () => {
      console.error('Failed to load PDF.js library');
      this.showToast('Error al cargar el visor de PDF', 'error');
    };
    document.head.appendChild(script);
  }

  private async loadPdfFromUrl() {
    if (!this.pdfUrl || !this.selectedNode) return;

    // Limpiar completamente antes de cargar nuevo PDF
    this.clearPageContainers();

    this.isLoading = true;
    this.loadingProgress = 0;
    this.currentFileName = this.selectedNode.nombre || 'documento.pdf';
    this.currentFileSize = 0;
    this.searchText = '';
    this.searchResults = [];

    try {
      this.loadingProgress = 10;

      // Obtener URL de forma segura
      const url = this.sanitizer.sanitize(SecurityContext.URL, this.pdfUrl);
      if (!url) {
        throw new Error('URL no válida');
      }

      // Configurar carga del PDF
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
        cMapPacked: true,
        enableXfa: true,
        disableAutoFetch: false,
        disableStream: false
      });

      loadingTask.onProgress = (progressData: any) => {
        if (progressData.total) {
          this.loadingProgress = Math.round((progressData.loaded / progressData.total) * 100);
          this.cdr.detectChanges();
        }
      };

      this.pdfDoc = await loadingTask.promise;
      this.loadingProgress = 100;

      this.totalPages = this.pdfDoc.numPages;

      // Crear estructura de páginas
      this.initializePageContainers();

      // Guardar información del documento
      this.saveDocumentInfo();

      // Cargar comentarios
      this.loadComments();

      // Cargar y renderizar primeras páginas
      await this.loadInitialPages();

      this.showToast('PDF cargado correctamente', 'success');

    } catch (error: any) {
      console.error('Error al cargar el PDF:', error);
      this.hasError.set(true);

      // Manejo de errores específicos
      if (error.name === 'PasswordException') {
        this.showToast('Este PDF está protegido con contraseña', 'error');
      } else if (error.name === 'InvalidPDFException') {
        this.showToast('El archivo PDF parece estar dañado o no es válido', 'error');
      } else {
        this.showToast(`Error al cargar el PDF: ${error.message || 'Error desconocido'}`, 'error');
      }

      this.resetDocument();
    } finally {
      this.isLoading = false;
      this.loadingProgress = 0;
      this.cdr.detectChanges();
    }
  }

  resetDocument() {
    this.pdfDoc = null;
    this.totalPages = 0;
    this.currentFileName = '';
    this.currentFileSize = 0;
    this.visiblePages = [];
    this.pagesRendered.clear();
    this.pageThumbnails = [];
    this.currentVisiblePage = 1;
    this.textLayers.clear();
    this.comments = [];
    this.nextCommentId = 1;

    this.clearPageContainers();
  }

  // ========== GESTIÓN DE PÁGINAS ==========

  private async loadInitialPages() {
    if (!this.pdfDoc || this.totalPages === 0) return;

    // Evitar múltiples cargas simultáneas
    if (this.isLoadingPages) return;

    this.isLoadingPages = true;

    try {
      // Crear un ID único para esta operación de renderizado
      const renderId = ++this.currentRenderId;

      // Cargar primeras páginas
      const pagesToLoad = Math.min(this.PAGES_PER_LOAD, this.totalPages);

      // Agregar páginas que aún no están en visiblePages
      for (let i = 1; i <= pagesToLoad; i++) {
        if (!this.visiblePages.includes(i)) {
          this.visiblePages.push(i);
        }
      }

      // Solo renderizar si este sigue siendo el renderizado actual
      if (renderId === this.currentRenderId) {
        await this.renderVisiblePages();
        this.cdr.detectChanges();
      }

    } catch (error) {
      console.error('Error al cargar páginas iniciales:', error);
      this.showToast('Error al cargar páginas', 'error');
    } finally {
      this.isLoadingPages = false;
      this.cdr.detectChanges();
    }
  }

  private async loadMorePages() {
    if (!this.pdfDoc || this.isLoadingPages || this.visiblePages.length >= this.totalPages) return;

    this.isLoadingPages = true;

    try {
      const startPage = this.visiblePages.length + 1;
      const pagesToLoad = Math.min(this.PAGES_PER_LOAD, this.totalPages - this.visiblePages.length);

      for (let i = startPage; i < startPage + pagesToLoad; i++) {
        this.visiblePages.push(i);
      }

      // Renderizar nuevas páginas
      await this.renderPages(startPage, startPage + pagesToLoad - 1);

    } catch (error) {
      console.error('Error al cargar más páginas:', error);
    } finally {
      this.isLoadingPages = false;
    }
  }

  private async renderVisiblePages() {
    if (!this.pdfDoc || this.visiblePages.length === 0 || this.isRendering) return;

    this.isRendering = true;

    try {
      // Filtrar solo páginas que necesitan ser renderizadas
      const pagesToRender = this.visiblePages.filter(pageNum =>
        !this.pagesRendered.has(pageNum) &&
        !document.querySelector(`canvas[data-page-number="${pageNum}"]`)
      );

      if (pagesToRender.length === 0) {
        return;
      }

      // Renderizar páginas en lotes para mejor performance
      const batchSize = 2;
      for (let i = 0; i < pagesToRender.length; i += batchSize) {
        const batch = pagesToRender.slice(i, i + batchSize);
        const promises = batch.map(pageNum => this.renderPage(pageNum));
        await Promise.all(promises);

        // Pequeña pausa entre lotes para no bloquear la UI
        if (i + batchSize < pagesToRender.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

    } catch (error) {
      console.error('Error al renderizar páginas visibles:', error);
    } finally {
      this.isRendering = false;
    }
  }

  private async renderPages(startPage: number, endPage: number) {
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      await this.renderPage(pageNum);
    }
  }

  private async renderPage(pageNum: number) {
    if (!this.pdfDoc || this.pagesRendered.has(pageNum)) {
      return; // Ya está renderizada o no hay documento
    }

    // Verificar si ya hay un canvas para esta página
    const existingCanvas = document.querySelector(`canvas[data-page-number="${pageNum}"]`);
    if (existingCanvas) {
      // Marcar como renderizada y salir
      this.pagesRendered.add(pageNum);
      return;
    }

    try {
      // Marcar como renderizada inmediatamente para evitar múltiples renderizados
      this.pagesRendered.add(pageNum);

      // Asegurarse de que exista el contenedor
      let pageContainer = document.getElementById(`page-${pageNum}`);
      if (!pageContainer) {
        // Crear contenedor si no existe
        pageContainer = this.createPageContainer(pageNum);
      }

      // Remover indicador de carga si existe
      const loadingIndicator = pageContainer.querySelector('.page-loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      const page = await this.pdfDoc.getPage(pageNum);

      // IMPORTANTE: Usar el scale actual del componente
      const viewport = page.getViewport({ scale: this.scale });

      // Verificar nuevamente si ya se creó el canvas mientras se cargaba
      const checkCanvas = document.querySelector(`canvas[data-page-number="${pageNum}"]`);
      if (checkCanvas) {
        return;
      }

      // Crear estructura de página
      const pdfPageWrapper = document.createElement('div');
      pdfPageWrapper.className = 'pdf-page-wrapper';
      pdfPageWrapper.style.position = 'relative';
      pdfPageWrapper.style.width = `${viewport.width}px`;
      pdfPageWrapper.style.height = `${viewport.height}px`;
      pdfPageWrapper.style.backgroundColor = 'white';
      pdfPageWrapper.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      pdfPageWrapper.style.borderRadius = '4px';
      pdfPageWrapper.style.margin = '0 auto 20px auto';
      pdfPageWrapper.style.overflow = 'hidden';

      // Crear canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo obtener el contexto 2D');

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = 'block';
      canvas.dataset['pageNumber'] = pageNum.toString();

      // Configurar eventos de clic para comentarios
      if (this.commentModeActive) {
        canvas.style.cursor = 'crosshair';
        canvas.onclick = (event: MouseEvent) => {
          this.handleCanvasClick(event, canvas, pageNum);
        };
      }

      // Capa de texto
      const textLayer = document.createElement('div');
      textLayer.className = 'text-layer';
      textLayer.style.position = 'absolute';
      textLayer.style.left = '0';
      textLayer.style.top = '0';
      textLayer.style.width = '100%';
      textLayer.style.height = '100%';
      textLayer.style.overflow = 'hidden';
      textLayer.style.pointerEvents = 'none';
      textLayer.style.zIndex = '2';

      this.textLayers.set(pageNum, textLayer);

      // Capa de comentarios
      const commentLayer = document.createElement('div');
      commentLayer.className = 'comment-layer';
      commentLayer.style.position = 'absolute';
      commentLayer.style.left = '0';
      commentLayer.style.top = '0';
      commentLayer.style.width = '100%';
      commentLayer.style.height = '100%';
      commentLayer.style.pointerEvents = 'none';
      commentLayer.style.zIndex = '3';

      // Número de página
      const pageHeader = document.createElement('div');
      pageHeader.className = 'page-header';
      pageHeader.style.position = 'absolute';
      pageHeader.style.top = '-35px';
      pageHeader.style.left = '0';
      pageHeader.style.right = '0';
      pageHeader.style.textAlign = 'center';

      const pageNumberBadge = document.createElement('span');
      pageNumberBadge.className = 'page-number-badge';
      pageNumberBadge.textContent = `Página ${pageNum} de ${this.totalPages}`;
      pageNumberBadge.style.backgroundColor = '#3B82F6';
      pageNumberBadge.style.color = 'white';
      pageNumberBadge.style.padding = '4px 16px';
      pageNumberBadge.style.borderRadius = '20px';
      pageNumberBadge.style.fontSize = '12px';
      pageNumberBadge.style.fontWeight = '500';
      pageNumberBadge.style.display = 'inline-block';

      pageHeader.appendChild(pageNumberBadge);

      // Ensamblar
      pdfPageWrapper.appendChild(canvas);
      pdfPageWrapper.appendChild(textLayer);
      pdfPageWrapper.appendChild(commentLayer);

      pageContainer.appendChild(pageHeader);
      pageContainer.appendChild(pdfPageWrapper);

      // Renderizar contenido
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Renderizar capa de texto
      await this.renderTextLayer(page, pageNum, viewport);

      // Dibujar comentarios
      this.drawCommentMarkers(commentLayer, viewport, pageNum);

      // Agregar a miniaturas
      this.addPageThumbnail(pageNum, pageContainer);

      // Forzar detección de cambios
      this.cdr.detectChanges();

    } catch (error) {
      console.error(`Error al renderizar página ${pageNum}:`, error);

      // Remover del set de renderizadas para permitir reintento
      this.pagesRendered.delete(pageNum);

      // Mostrar error en la página
      const pageContainer = document.getElementById(`page-${pageNum}`);
      if (pageContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'page-error';
        errorDiv.innerHTML = `
          <div style="color: #ef4444; padding: 20px; text-align: center;">
            Error al cargar página ${pageNum}
          </div>
        `;
        pageContainer.appendChild(errorDiv);
      }
    }
  }

  // Método auxiliar para crear contenedor de página
  private createPageContainer(pageNum: number): HTMLElement {
    let container = document.getElementById('pdfPagesContainer');
    if (!container) {
      const newContainer = document.createElement('div');
      newContainer.id = 'pdfPagesContainer';
      if (this.pdfContainer?.nativeElement) {
        this.pdfContainer.nativeElement.appendChild(newContainer);
      }
      container = newContainer;
    }

    const pageDiv = document.createElement('div');
    pageDiv.id = `page-${pageNum}`;
    pageDiv.className = 'page-container';
    pageDiv.style.position = 'relative';
    pageDiv.style.marginBottom = '40px';
    pageDiv.style.minHeight = '100px';

    container.appendChild(pageDiv);

    return pageDiv;
  }

  private async renderTextLayer(page: any, pageNum: number, viewport: any) {
    try {
      const textContent = await page.getTextContent();
      const textLayer = this.textLayers.get(pageNum);

      if (!textLayer) return;

      // Limpiar completamente
      textLayer.innerHTML = '';
      textLayer.style.cssText = '';

      // Usar el método oficial de PDF.js para crear la capa de texto
      textLayer.className = 'textLayer';
      textLayer.style.position = 'absolute';
      textLayer.style.left = '0';
      textLayer.style.top = '0';
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;
      textLayer.style.overflow = 'hidden';
      textLayer.style.opacity = '0.2'; // Temporal para verificar alineación
      textLayer.style.lineHeight = '1';
      textLayer.style.zIndex = '2';
      textLayer.style.pointerEvents = 'auto';

      // Crear elementos de texto con transformación de matriz completa
      const transform = viewport.transform || [1, 0, 0, 1, 0, 0];

      textContent.items.forEach((item: any) => {
        // Crear span para cada elemento de texto
        const span = document.createElement('span');
        span.textContent = item.str;

        // Estilos base
        span.style.cssText = `
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        font-family: ${item.fontName || 'sans-serif'}, sans-serif;
        font-size: ${item.height || 12}px;
        line-height: 1;
        transform-origin: 0% 0%;
        user-select: text;
        -webkit-user-select: text;
      `;

        // Aplicar transformación de matriz completa
        if (item.transform) {
          // La matriz de transformación del texto en el PDF
          const m = item.transform;

          // Normalizar para coordenadas del viewport
          // x' = m[0]*x + m[2]*y + m[4]
          // y' = m[1]*x + m[3]*y + m[5]

          // Para un texto simple, usamos m[4] y m[5] como posición
          const x = m[4];
          const y = m[5];

          // Invertir Y (sistema de coordenadas diferente)
          const canvasY = viewport.height - y - (item.height || 0);

          // Aplicar escala global
          const scaledX = x * this.scale;
          const scaledY = canvasY * this.scale;

          span.style.left = `${scaledX}px`;
          span.style.top = `${scaledY}px`;

          // Calcular rotación
          const angle = Math.atan2(m[1], m[0]);
          if (Math.abs(angle) > 0.0001) {
            span.style.transform = `matrix(${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, 0, 0)`;
          }
        }

        textLayer.appendChild(span);
      });

    } catch (error) {
      console.error(`Error en capa de texto página ${pageNum}:`, error);
    }
  }

  private initializePageContainers() {
    let container = document.getElementById('pdfPagesContainer');
    if (!container) {
      const newContainer = document.createElement('div');
      newContainer.id = 'pdfPagesContainer';
      if (this.pdfContainer?.nativeElement) {
        this.pdfContainer.nativeElement.appendChild(newContainer);
      }
      container = newContainer;
    }

    // Limpiar contenedor
    container.innerHTML = '';

    // Crear contenedores para cada página
    for (let i = 1; i <= Math.min(this.PAGES_PER_LOAD, this.totalPages); i++) {
      const pageDiv = document.createElement('div');
      pageDiv.id = `page-${i}`;
      pageDiv.className = 'page-container';
      pageDiv.style.position = 'relative';
      pageDiv.style.marginBottom = '40px';
      pageDiv.style.minHeight = '100px';
      container.appendChild(pageDiv);

      // Agregar indicador de carga solo si no está renderizada
      if (!this.pagesRendered.has(i)) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'page-loading';
        loadingDiv.innerHTML = `
          <div class="loading-spinner">
            <div class="spinner"></div>
            <div>Cargando página ${i}...</div>
          </div>
        `;
        pageDiv.appendChild(loadingDiv);
      }
    }
  }

  // Método para limpiar completamente los contenedores
  private clearPageContainers() {
    const container = document.getElementById('pdfPagesContainer');
    if (container) {
      container.innerHTML = '';
    }

    this.pagesRendered.clear();
    this.visiblePages = [];
    this.pageThumbnails = [];
    this.textLayers.clear();

    // Resetear estado de renderizado
    this.isRendering = false;
    this.currentRenderId = 0;
  }

  private resetDocumentState() {
    this.visiblePages = [];
    this.pagesRendered.clear();
    this.pageThumbnails = [];
    this.currentVisiblePage = 1;
    this.textLayers.clear();
    this.comments = [];
    this.nextCommentId = 1;
  }

  // ========== ZOOM Y AJUSTES ==========

  calculateScaledWidth() {
    // Si tenemos el PDF cargado, calcular el ancho basado en la primera página
    if (this.pdfDoc) {
      this.pdfDoc.getPage(1).then((page: any) => {
        const viewport = page.getViewport({ scale: 1 });
        const baseWidth = viewport.width;
        this.scaledWidth = baseWidth * this.scale;
        this.cdr.detectChanges();
      }).catch(() => {
        // Fallback si no se puede obtener la página
        const baseWidth = 800; // Ancho base de las páginas
        this.scaledWidth = baseWidth * this.scale;
      });
    } else {
      // Fallback si no hay PDF cargado
      const baseWidth = 800; // Ancho base de las páginas
      this.scaledWidth = baseWidth * this.scale;
    }
  }

  async zoomIn() {
    if (!this.pdfDoc) {
      this.showToast('No hay PDF cargado', 'warning');
      return;
    }

    this.scale = Math.min(3, this.scale + 0.1);
    await this.rerenderAllPages();
    this.showToast(`Zoom: ${this.getZoomPercentage()}%`, 'info');
  }

  async zoomOut() {
    if (!this.pdfDoc) {
      this.showToast('No hay PDF cargado', 'warning');
      return;
    }

    this.scale = Math.max(0.25, this.scale - 0.1);
    await this.rerenderAllPages();
    this.showToast(`Zoom: ${this.getZoomPercentage()}%`, 'info');
  }

  async resetZoom() {
    if (!this.pdfDoc) {
      this.showToast('No hay PDF cargado', 'warning');
      return;
    }

    this.scale = 1.0;
    await this.rerenderAllPages();
    this.showToast('Zoom restablecido al 100%', 'success');
  }

  async fitToWidth() {
    if (!this.pdfDoc) return;

    try {
      // Obtener ancho del contenedor
      const container = this.pdfContainer.nativeElement;
      const containerWidth = container.clientWidth - 80; // Margen

      // Obtener ancho de la primera página
      const page = await this.pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const scaleX = containerWidth / viewport.width;

      this.scale = scaleX;
      await this.rerenderAllPages();
      this.showToast('Ajustado al ancho', 'success');

    } catch (error) {
      console.error('Error al ajustar ancho:', error);
    }
  }

  async fitToPage() {
    if (!this.pdfDoc) return;

    try {
      const container = this.pdfContainer.nativeElement;
      const page = await this.pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });

      const containerWidth = container.clientWidth - 80;
      const containerHeight = container.clientHeight - 80;

      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;

      this.scale = Math.min(scaleX, scaleY);
      await this.rerenderAllPages();
      this.showToast('Ajustado a la página', 'success');

    } catch (error) {
      console.error('Error al ajustar página:', error);
    }
  }
  private async rerenderAllPages() {
    try {
      // Limpiar caches de renderizado
      this.pagesRendered.clear();
      this.textLayers.clear();

      // Calcular nuevo ancho escalado
      this.calculateScaledWidth();

      // Limpiar contenedores existentes
      const container = document.getElementById('pdfPagesContainer');
      if (container) {
        container.innerHTML = '';
      }

      // Recrear contenedores
      this.initializePageContainers();

      // Renderizar páginas visibles
      await this.renderVisiblePages();

      // Actualizar eventos de canvas
      this.updateCanvasEvents();

    } catch (error) {
      console.error('Error al rerenderizar páginas:', error);
    }
  }

  // ========== ZOOM TÁCTIL ==========

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // Inicio del gesto de pellizco
      this.isPinching = true;
      this.lastTouch1 = event.touches[0];
      this.lastTouch2 = event.touches[1];
      this.initialDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
      this.initialScale = this.scale;
      event.preventDefault();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.isPinching && event.touches.length === 2) {
      // Calcular nueva distancia entre dedos
      const currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);

      // Calcular factor de zoom basado en el cambio de distancia
      const zoomFactor = currentDistance / this.initialDistance;

      // Aplicar zoom suavizado
      const newScale = this.initialScale * zoomFactor;

      // Limitar el zoom mínimo y máximo
      this.scale = Math.max(0.5, Math.min(3, newScale));

      // Recalcular ancho escalado
      this.calculateScaledWidth();

      // Actualizar controles de zoom
      this.updateZoomDisplay();

      // Prevenir el scroll mientras se hace zoom
      event.preventDefault();

      this.lastTouch1 = event.touches[0];
      this.lastTouch2 = event.touches[1];
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) {
      // Fin del gesto de pellizco
      this.isPinching = false;
      this.lastTouch1 = null;
      this.lastTouch2 = null;

      // Guardar el estado del zoom
      this.saveZoomState();
    }
  }

  // Método auxiliar para calcular distancia entre dos puntos táctiles
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Método para actualizar la visualización del zoom
  private updateZoomDisplay(): void {
    this.cdr.detectChanges();
  }

  // Método para guardar el estado del zoom
  private saveZoomState(): void {
    localStorage.setItem('pdfZoomLevel', this.scale.toString());
  }

  // Método para cargar el estado del zoom
  private loadZoomState(): void {
    const savedZoom = localStorage.getItem('pdfZoomLevel');
    if (savedZoom) {
      this.scale = parseFloat(savedZoom);
      this.calculateScaledWidth();
    }
  }

  // ========== COMENTARIOS ==========

  private handleCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement, pageNum: number) {
    const rect = canvas.getBoundingClientRect();

    // Calcular posición relativa (0-1)
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    // Validar que el clic esté dentro del canvas
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      if (this.commentModeActive) {
        // Activar el textarea para escribir comentario
        this.showCommentsPanel = true;
        setTimeout(() => {
          if (this.commentTextarea) {
            this.commentTextarea.nativeElement.focus();
            this.commentTextarea.nativeElement.placeholder = `Comentario en página ${pageNum} (${Math.round(x * 100)}%, ${Math.round(y * 100)}%)`;
          }
        }, 100);

        // Guardar posición para cuando se escriba el comentario
        this.selectedCommentPosition = { x, y, page: pageNum };
      }
    }
  }

  private drawCommentMarkers(container: HTMLDivElement, viewport: any, pageNum: number) {
    const pageComments = this.comments.filter(comment => comment.page === pageNum);

    pageComments.forEach((comment, index) => {
      if (comment.position) {
        const marker = document.createElement('div');
        marker.className = 'comment-marker';
        marker.dataset['commentId'] = comment.id.toString();

        // Posición
        marker.style.position = 'absolute';
        marker.style.left = `${comment.position.x * 100}%`;
        marker.style.top = `${comment.position.y * 100}%`;
        marker.style.transform = 'translate(-50%, -50%)';

        // Estilo del marcador
        marker.style.width = '24px';
        marker.style.height = '24px';
        marker.style.backgroundColor = comment.color;
        marker.style.borderRadius = '50%';
        marker.style.cursor = 'pointer';
        marker.style.display = 'flex';
        marker.style.alignItems = 'center';
        marker.style.justifyContent = 'center';
        marker.style.color = 'white';
        marker.style.fontWeight = 'bold';
        marker.style.fontSize = '12px';
        marker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        marker.style.zIndex = '100';
        marker.style.border = '2px solid white';
        marker.style.transition = 'all 0.2s ease';
        marker.style.pointerEvents = 'auto';

        // Ícono
        marker.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;

        // Efectos hover
        marker.addEventListener('mouseenter', () => {
          marker.style.transform = 'translate(-50%, -50%) scale(1.1)';
          marker.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });

        marker.addEventListener('mouseleave', () => {
          marker.style.transform = 'translate(-50%, -50%)';
          marker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        });

        // Evento de clic
        marker.addEventListener('click', (event) => {
          event.stopPropagation();
          event.preventDefault();
          this.selectComment(comment);
        });

        // Tooltip
        marker.title = comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text;

        container.appendChild(marker);
      }
    });
  }

  private addPageThumbnail(pageNum: number, element: HTMLElement) {
    // Evitar duplicados
    const existingIndex = this.pageThumbnails.findIndex(t => t.page === pageNum);
    if (existingIndex === -1) {
      this.pageThumbnails.push({
        page: pageNum,
        element: element
      });
    }
  }

  addComment(event?: Event) {
    if (event) event.preventDefault();

    if (!this.newCommentText.trim() || this.newCommentText.length > 1000) {
      this.showToast('El comentario debe tener entre 1 y 1000 caracteres', 'warning');
      return;
    }

    const position = this.selectedCommentPosition ? {
      x: this.selectedCommentPosition.x,
      y: this.selectedCommentPosition.y
    } : undefined;

    const newComment: PdfComment = {
      id: this.nextCommentId++,
      page: this.selectedCommentPosition ? this.selectedCommentPosition.page : this.currentVisiblePage,
      text: this.newCommentText,
      date: new Date(),
      position: position,
      color: this.selectedColor
    };

    this.comments.push(newComment);
    this.newCommentText = '';
    this.selectedCommentPosition = null;
    this.commentModeActive = false;
    this.saveComments();

    this.updateCanvasEvents();
    this.renderPage(newComment.page);
    this.selectComment(newComment);
    this.showToast('Comentario agregado', 'success');

    setTimeout(() => {
      if (this.commentTextarea) {
        this.commentTextarea.nativeElement.placeholder = 'Escribe tu comentario aquí...';
      }
    }, 100);
  }

  deleteComment(comment: PdfComment) {
    if (confirm('¿Eliminar este comentario?')) {
      const index = this.comments.indexOf(comment);
      if (index > -1) {
        this.comments.splice(index, 1);
        this.saveComments();

        if (this.selectedComment?.id === comment.id) {
          this.selectedComment = null;
        }

        this.renderPage(comment.page);
        this.showToast('Comentario eliminado', 'warning');
      }
    }
  }

  selectComment(comment: PdfComment) {
    this.selectedComment = comment;
    this.scrollToPage(comment.page);
    this.showCommentsPanel = true;

    setTimeout(() => {
      if (this.commentTextarea) {
        this.commentTextarea.nativeElement.focus();
      }
    }, 100);
  }

  toggleCommentMode() {
    this.commentModeActive = !this.commentModeActive;
    this.updateCanvasEvents();

    if (this.commentModeActive) {
      this.showToast('Modo comentario activado. Haz clic en el PDF para posicionar.', 'info');
    } else {
      this.selectedCommentPosition = null;
      this.showToast('Modo comentario desactivado', 'info');
    }
  }

  private updateCanvasEvents() {
    this.visiblePages.forEach(pageNum => {
      const canvas = document.querySelector(`canvas[data-page-number="${pageNum}"]`) as HTMLCanvasElement;
      if (canvas) {
        if (this.commentModeActive) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.cursor = 'crosshair';
          canvas.onclick = (event: MouseEvent) => {
            this.handleCanvasClick(event, canvas, pageNum);
          };
        } else {
          canvas.style.pointerEvents = 'none';
          canvas.style.cursor = 'default';
          canvas.onclick = null;
        }
      }
    });
  }

  toggleCommentsPanel() {
    this.showCommentsPanel = !this.showCommentsPanel;
  }

  getCurrentPageComments() {
    return this.comments.filter(comment => comment.page === this.currentVisiblePage);
  }

  get filteredComments() {
    let filtered = this.comments;

    // Filtrar por página
    if (this.filterByPage) {
      filtered = filtered.filter(c => c.page === this.filterByPage);
    }

    // Filtrar por búsqueda
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.text.toLowerCase().includes(query) ||
        c.page.toString().includes(query)
      );
    }

    // Ordenar por fecha
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ========== BÚSQUEDA ==========

  async searchInPDF() {
    if (!this.pdfDoc || !this.searchText.trim()) {
      this.showToast('Ingresa un texto para buscar', 'warning');
      return;
    }

    this.isSearching = true;
    this.searchResults = [];
    this.totalSearchMatches = 0;
    this.currentSearchResultIndex = 0;

    try {
      const searchText = this.searchText.toLowerCase();

      // Limpiar resultados anteriores
      this.clearSearchHighlights();

      // Buscar en cada página
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        const page = await this.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        const matches: any[] = [];

        // Buscar en los items de texto
        textContent.items.forEach((item: any) => {
          const text = item.str.toLowerCase();
          if (text.includes(searchText)) {
            matches.push(item);
          }
        });

        if (matches.length > 0) {
          this.searchResults.push({
            page: pageNum,
            matches: matches.length,
            positions: matches
          });

          this.totalSearchMatches += matches.length;

          // Resaltar en la página si está visible
          if (this.pagesRendered.has(pageNum)) {
            this.highlightSearchResults(pageNum, matches);
          }
        }
      }

      if (this.totalSearchMatches > 0) {
        this.showToast(`Encontradas ${this.totalSearchMatches} coincidencias en ${this.searchResults.length} páginas`, 'success');
        this.goToNextSearchResult();
        this.showSearchPanel = true;
      } else {
        this.showToast('No se encontraron coincidencias', 'info');
      }

    } catch (error) {
      console.error('Error al buscar en el PDF:', error);
      this.showToast('Error al buscar en el documento', 'error');
    } finally {
      this.isSearching = false;
    }
  }

  private async highlightSearchResults(pageNum: number, matches: any[]) {
    const textLayer = this.textLayers.get(pageNum);
    if (!textLayer) return;

    // Limpiar resaltados anteriores
    const existingHighlights = textLayer.querySelectorAll('.search-highlight, .current-search-highlight');
    existingHighlights.forEach(el => el.remove());

    try {
      // Obtener la página específica para calcular el viewport correcto
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale });

      // Crear resaltados para cada coincidencia
      matches.forEach(match => {
        const span = document.createElement('span');
        span.className = 'search-highlight';

        // ESTILOS AMARILLOS - Modifica aquí
        span.style.position = 'absolute';
        span.style.backgroundColor = '#FFEB3B'; // Amarillo sólido
        span.style.opacity = '0.7'; // Un poco transparente
        span.style.borderRadius = '2px';
        span.style.pointerEvents = 'none';
        span.style.zIndex = '5';
        span.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

        // Posicionar el resaltado
        if (match.transform && match.transform.length >= 6) {
          const tx = match.transform[4];
          const ty = match.transform[5];

          // Convertir coordenadas
          const canvasY = viewport.height - ty - (match.height || 0);
          const canvasX = tx;

          span.style.left = `${canvasX}px`;
          span.style.top = `${canvasY}px`;
          span.style.transform = 'translateY(-50%)';

          // Aplicar escala al tamaño
          if (match.width && match.height) {
            span.style.width = `${match.width}px`;
            span.style.height = `${match.height}px`;
          }

          textLayer.appendChild(span);
        }
      });

    } catch (error) {
      console.error(`Error al resaltar búsqueda en página ${pageNum}:`, error);
    }
  }
  
  clearSearchHighlights(): void {
    this.textLayers.forEach((textLayer) => {
      const highlights = textLayer.querySelectorAll('.search-highlight, .current-search-highlight');
      highlights.forEach(el => el.remove());
    });

    this.searchResults = [];
    this.totalSearchMatches = 0;
    this.currentSearchResultIndex = 0;
    this.searchText = '';
    this.showSearchPanel = false;

    this.showToast('Búsqueda limpiada', 'info');
  }

  cancelSearch(): void {
    this.clearSearchHighlights();
    this.isSearching = false;
  }

  onSearchTextChange(): void {
    // Si el texto está vacío, limpiar los resaltados
    if (!this.searchText.trim()) {
      this.clearSearchHighlights();
    }
  }

  toggleSearchPanel() {
    this.showSearchPanel = !this.showSearchPanel;
    if (this.showSearchPanel && this.searchInput) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      }, 100);
    }
  }

  goToNextSearchResult() {
    if (this.searchResults.length === 0) return;

    this.currentSearchResultIndex =
      (this.currentSearchResultIndex + 1) % this.searchResults.length;

    this.navigateToSearchResult(this.currentSearchResultIndex);
  }

  goToPreviousSearchResult() {
    if (this.searchResults.length === 0) return;

    this.currentSearchResultIndex =
      (this.currentSearchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;

    this.navigateToSearchResult(this.currentSearchResultIndex);
  }

  private navigateToSearchResult(index: number) {
    if (index < 0 || index >= this.searchResults.length) return;

    const result = this.searchResults[index];

    // Ir a la página
    this.scrollToPage(result.page);

    // Resaltar el resultado actual
    setTimeout(() => {
      this.highlightCurrentSearchResult(result);
    }, 500);
  }

  private highlightCurrentSearchResult(result: SearchResult) {
    // Limpiar resaltado actual
    this.textLayers.forEach((textLayer) => {
      const current = textLayer.querySelectorAll('.current-search-highlight');
      current.forEach(el => el.classList.remove('current-search-highlight'));
      current.forEach(el => el.classList.add('search-highlight'));
    });

    // Resaltar el resultado actual
    const textLayer = this.textLayers.get(result.page);
    if (textLayer) {
      const highlights = textLayer.querySelectorAll('.search-highlight');
      if (highlights.length > 0) {
        const firstHighlight = highlights[0] as HTMLElement;
        firstHighlight.classList.remove('search-highlight');
        firstHighlight.classList.add('current-search-highlight');
        firstHighlight.style.backgroundColor = 'rgba(245, 158, 11, 0.8)';
        firstHighlight.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.3)';
        firstHighlight.style.zIndex = '10';
      }
    }
  }

  // ========== NAVEGACIÓN ==========

  onScroll() {
    // Verificar que pdfContainer esté disponible
    if (!this.pdfContainer?.nativeElement) return;

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.updateCurrentVisiblePage();
      this.checkLoadMorePages();
      this.updateScrollTopButton();
    }, 100);
  }

  private updateCurrentVisiblePage() {
    if (!this.pdfDoc || this.visiblePages.length === 0 || !this.pdfContainer?.nativeElement) return;

    const container = this.pdfContainer.nativeElement;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollMiddle = scrollTop + (containerHeight / 2);

    // Encontrar la página más cercana al centro de la vista
    let closestPage = 1;
    let closestDistance = Infinity;

    for (const pageNum of this.visiblePages) {
      const pageElement = document.getElementById(`page-${pageNum}`);
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const pageTop = rect.top - containerRect.top + scrollTop;
        const pageBottom = pageTop + rect.height;
        const pageMiddle = pageTop + (rect.height / 2);

        const distance = Math.abs(scrollMiddle - pageMiddle);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNum;
        }
      }
    }

    if (closestPage !== this.currentVisiblePage) {
      this.currentVisiblePage = closestPage;
    }
  }

  private checkLoadMorePages() {
    if (this.isLoadingPages || this.visiblePages.length >= this.totalPages) return;

    const container = this.pdfContainer?.nativeElement;
    if (!container) return;

    const scrollBottom = container.scrollTop + container.clientHeight;
    const scrollHeight = container.scrollHeight;

    // Cargar más páginas cuando estemos cerca del final
    if (scrollHeight - scrollBottom < 500) {
      this.loadMorePages();
    }
  }

  private updateScrollTopButton() {
    const container = this.pdfContainer?.nativeElement;
    if (!container) {
      this.showScrollTop = false;
      return;
    }

    this.showScrollTop = container.scrollTop > 300;
  }

  scrollToTop() {
    if (!this.pdfContainer?.nativeElement) return;

    this.pdfContainer.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  scrollToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > this.totalPages || !this.pdfContainer?.nativeElement) return;

    const pageElement = document.getElementById(`page-${pageNum}`);
    if (pageElement) {
      // Asegurarse de que la página esté cargada
      if (!this.visiblePages.includes(pageNum)) {
        this.visiblePages.push(pageNum);
        this.renderPage(pageNum);
      }

      // Hacer scroll a la página
      pageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      this.currentVisiblePage = pageNum;
    }
  }

  goToPageNumber(pageNumber: any) {
    if (!pageNumber || pageNumber < 1 || pageNumber > this.totalPages) {
      this.showToast('Número de página inválido', 'warning');
      return;
    }

    this.scrollToPage(pageNumber);
    this.jumpToPage = null;
  }

  // ========== UTILIDADES ==========

  getReadingProgress(): number {
    if (!this.totalPages) return 0;
    return Math.round((this.currentVisiblePage / this.totalPages) * 100);
  }

  getVisiblePagesRange(): string {
    if (this.visiblePages.length === 0) return 'Sin páginas visibles';

    const first = this.visiblePages[0];
    const last = this.visiblePages[this.visiblePages.length - 1];

    if (first === last) {
      return `Página ${first}`;
    } else {
      return `Páginas ${first} - ${last}`;
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} d`;

    return this.formatDate(date);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ========== PERSISTENCIA ==========

  private saveDocumentInfo() {
    const docInfo: DocumentInfo = {
      fileName: this.currentFileName,
      fileSize: this.currentFileSize,
      totalPages: this.totalPages,
      lastOpened: new Date().toISOString()
    };

    localStorage.setItem('pdfViewer_lastDocument', JSON.stringify(docInfo));
  }

  private loadComments() {
    try {
      const key = `pdfComments_${this.currentFileName}`;
      const saved = localStorage.getItem(key);

      if (saved) {
        this.comments = JSON.parse(saved);
        this.comments.forEach(comment => {
          comment.date = new Date(comment.date);
        });

        const maxId = this.comments.reduce((max, comment) =>
          Math.max(max, comment.id), 0);
        this.nextCommentId = maxId + 1;
      }
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
    }
  }

  private saveComments() {
    try {
      const key = `pdfComments_${this.currentFileName}`;
      localStorage.setItem(key, JSON.stringify(this.comments));
    } catch (error) {
      console.error('Error al guardar comentarios:', error);
    }
  }

  private setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.pdfDoc && this.comments.length > 0) {
        this.saveComments();
        this.saveDocumentInfo();
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  private loadSavedState() {
    try {
      const saved = localStorage.getItem('pdfViewer_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.scale = state.scale || 1.0;
        this.selectedColor = state.selectedColor || this.commentColors[0];
      }
    } catch (error) {
      console.error('Error al cargar estado:', error);
    }
  }

  // ========== RESIZE OBSERVER ==========

  private setupResizeObserver() {
    // Verificar que pdfContainer esté disponible
    if (!this.pdfContainer?.nativeElement) {
      console.warn('pdfContainer no disponible al inicializar ResizeObserver');
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.pdfDoc) {
        this.cdr.detectChanges();
      }
    });

    this.resizeObserver.observe(this.pdfContainer.nativeElement);
  }

  // ========== FUNCIONALIDADES ADICIONALES ==========

  toggleFullscreen() {
    const elem = document.documentElement;

    if (!this.isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    this.isFullscreen = !this.isFullscreen;
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  printPDF() {
    if (!this.pdfDoc) {
      this.showToast('No hay PDF cargado para imprimir', 'warning');
      return;
    }

    window.print();
  }

  // ========== NOTIFICACIONES ==========

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
      type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
        type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
      }`;

    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' :
        type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />' :
          type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376C2.922 19.502 4.591 21 6.485 21h11.03c1.894 0 3.563-1.498 2.788-3.624l-5.615-11.25C14.301 3.498 12.632 2 10.738 2H6.485c-1.894 0-3.563 1.498-2.788 3.624L9.303 17.376z" />' :
            '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />'
      }
        </svg>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // ========== SHORTCUTS DE TECLADO ==========

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Evitar shortcuts cuando se está escribiendo
      if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (this.pdfContainer?.nativeElement) {
            this.pdfContainer.nativeElement.scrollBy({
              top: -100,
              behavior: 'smooth'
            });
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (this.pdfContainer?.nativeElement) {
            this.pdfContainer.nativeElement.scrollBy({
              top: 100,
              behavior: 'smooth'
            });
          }
          break;
        case '+':
          if (event.ctrlKey) {
            event.preventDefault();
            this.zoomIn();
          }
          break;
        case '-':
          if (event.ctrlKey) {
            event.preventDefault();
            this.zoomOut();
          }
          break;
        case '0':
          if (event.ctrlKey) {
            event.preventDefault();
            this.resetZoom();
          }
          break;
        case 'Escape':
          this.commentModeActive = false;
          this.selectedComment = null;
          this.selectedCommentPosition = null;
          this.updateCanvasEvents();
          break;
        case 'c':
          if (event.ctrlKey) {
            event.preventDefault();
            this.showCommentsPanel = !this.showCommentsPanel;
          }
          break;
        case 'f':
          if (event.ctrlKey) {
            event.preventDefault();
            this.toggleSearchPanel();
          }
          break;
      }
    });
  }

  // ========== LIMPIEZA ==========

  ngOnDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    if (this.resizeObserver && this.pdfContainer?.nativeElement) {
      this.resizeObserver.unobserve(this.pdfContainer.nativeElement);
      this.resizeObserver.disconnect();
    }

    // Guardar estado
    const state = {
      scale: this.scale,
      selectedColor: this.selectedColor
    };
    localStorage.setItem('pdfViewer_state', JSON.stringify(state));
  }
}