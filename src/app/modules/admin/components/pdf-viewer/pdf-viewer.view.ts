import { Component, ElementRef, ViewChild, HostListener, OnInit, OnDestroy } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { FormsModule } from '@angular/forms';
import 'pdfjs-dist/web/pdf_viewer.css';

// Configuración del worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// 
// pdfjsLib.GlobalWorkerOptions.workerSrc = 
  // 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
// 
// Interfaces
interface PdfComment {
  id: number;
  page: number;
  text: string;
  date: Date;
  position?: { x: number; y: number };
  color: string;
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

interface SearchResult {
  page: number;
  matches: number;
  positions: any[];
}

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.view.html',
  styleUrl: './pdf-viewer.view.css',
  standalone: false
})

export class PdfViewerView implements OnInit, OnDestroy {
  @ViewChild('pdfContainer', { static: true })
  pdfContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('commentTextarea', { static: false })
  commentTextarea!: ElementRef<HTMLTextAreaElement>;

  @ViewChild('searchInput', { static: false })
  searchInput!: ElementRef<HTMLInputElement>;

  // Propiedades del documento
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
  
  // Colores
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

  constructor() {}

  ngOnInit() {
    this.setupAutoSave();
    this.loadSavedState();
    this.setupKeyboardShortcuts();
    this.setupIntersectionObserver();
    this.setupResizeObserver();
  }

  // ========== MANEJO DE ARCHIVOS ==========
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      this.showToast('Por favor, selecciona un archivo PDF válido', 'error');
      return;
    }

    // Validar tamaño (500MB máximo)
    if (file.size > this.MAX_FILE_SIZE) {
      this.showToast(`El archivo es demasiado grande. Máximo permitido: ${this.formatBytes(this.MAX_FILE_SIZE)}`, 'error');
      return;
    }

    this.isLoading = true;
    this.loadingProgress = 0;
    this.currentFileName = file.name;
    this.currentFileSize = file.size;
    this.searchText = '';
    this.searchResults = [];

    try {
      this.loadingProgress = 10;
      
      const buffer = await file.arrayBuffer();
      this.loadingProgress = 50;
      
      // Cargar documento PDF
      const loadingTask = pdfjsLib.getDocument({ 
        data: buffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
        cMapPacked: true,
        enableXfa: true,
        disableRange: file.size > 50 * 1024 * 1024
      });
      
      loadingTask.onProgress = (progressData: any) => {
        if (progressData.total) {
          this.loadingProgress = Math.round((progressData.loaded / progressData.total) * 100);
        }
      };
      
      this.pdfDoc = await loadingTask.promise;
      this.loadingProgress = 100;
      
      this.totalPages = this.pdfDoc.numPages;
      
      // Limpiar páginas anteriores
      this.visiblePages = [];
      this.pagesRendered.clear();
      this.pageThumbnails = [];
      this.currentVisiblePage = 1;
      this.textLayers.clear();
      
      // Guardar información del documento
      this.saveDocumentInfo();
      
      // Cargar comentarios del documento específico
      this.loadComments();
      
      // Cargar primeras páginas
      await this.loadInitialPages();
      
      this.showToast('PDF cargado correctamente', 'success');

    } catch (error: any) {
      console.error('Error al cargar el PDF:', error);
      
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
      input.value = '';
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
    
    const container = document.getElementById('pdfPagesContainer');
    if (container) {
      container.innerHTML = '';
    }
  }

  // ========== GESTIÓN DE PÁGINAS VISIBLES ==========
  async loadInitialPages() {
    if (!this.pdfDoc || this.totalPages === 0) return;
    
    this.isLoadingPages = true;
    
    try {
      // Cargar primeras páginas
      const pagesToLoad = Math.min(this.PAGES_PER_LOAD, this.totalPages);
      for (let i = 1; i <= pagesToLoad; i++) {
        this.visiblePages.push(i);
      }
      
      // Renderizar páginas visibles
      await this.renderVisiblePages();
      
    } catch (error) {
      console.error('Error al cargar páginas iniciales:', error);
      this.showToast('Error al cargar páginas', 'error');
    } finally {
      this.isLoadingPages = false;
    }
  }

  async loadMorePages() {
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

  async renderVisiblePages() {
    if (!this.pdfDoc || this.visiblePages.length === 0) return;
    
    try {
      // Renderizar páginas en lotes para no bloquear la UI
      const batchSize = 3;
      for (let i = 0; i < this.visiblePages.length; i += batchSize) {
        const batch = this.visiblePages.slice(i, i + batchSize);
        await this.renderPagesBatch(batch);
      }
      
    } catch (error) {
      console.error('Error al renderizar páginas visibles:', error);
    }
  }

  async renderPagesBatch(pages: number[]) {
    const promises = pages.map(pageNum => this.renderPage(pageNum));
    await Promise.all(promises);
  }

  async renderPages(startPage: number, endPage: number) {
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      await this.renderPage(pageNum);
    }
  }

  async renderPage(pageNum: number) {
    if (!this.pdfDoc || this.pagesRendered.has(pageNum)) return;

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale });

      // Buscar contenedor de la página
      const pageContainer = document.getElementById(`page-${pageNum}`);
      if (!pageContainer) return;

      // Limpiar contenedor
      pageContainer.innerHTML = '';

      // Crear contenedor principal de la página
      const pdfPageContainer = document.createElement('div');
      pdfPageContainer.className = 'pdf-page-wrapper';
      pdfPageContainer.style.position = 'relative';
      pdfPageContainer.style.width = `${viewport.width}px`;
      pdfPageContainer.style.height = `${viewport.height}px`;
      pdfPageContainer.style.backgroundColor = 'white';
      pdfPageContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      pdfPageContainer.style.borderRadius = '4px';
      pdfPageContainer.style.margin = '0 auto';
      pdfPageContainer.style.overflow = 'hidden';
      
      // IMPORTANTE: Permitir selección de texto
      pdfPageContainer.style.userSelect = 'text';
      pdfPageContainer.style.webkitUserSelect = 'text';
      pdfPageContainer.style.userSelect = 'text';
      pdfPageContainer.style.userSelect = 'text';

      // Canvas para renderizar el PDF - DEBE ESTAR ABAJO
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('No se pudo obtener el contexto 2D');

      // Configurar canvas
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = 'block';
      canvas.dataset['pageNumber'] = pageNum.toString();
      
      // IMPORTANTE: El canvas NO debe bloquear eventos cuando no esté en modo comentario
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '1';

      // Solo agregar eventos si estamos en modo comentario
      if (this.commentModeActive) {
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'crosshair';
        canvas.onclick = (event: MouseEvent) => {
          this.handleCanvasClick(event, canvas, pageNum);
        };
      }

      // Capa para texto (búsqueda) - DEBE ESTAR ENCIMA para permitir selección
      const textLayer = document.createElement('div');
      textLayer.className = 'text-layer';
      textLayer.style.position = 'absolute';
      textLayer.style.left = '0';
      textLayer.style.top = '0';
      textLayer.style.width = '100%';
      textLayer.style.height = '100%';
      textLayer.style.overflow = 'hidden';
      
      // IMPORTANTE: La capa de texto DEBE capturar eventos para selección
      textLayer.style.pointerEvents = 'auto';
      textLayer.style.zIndex = '2'; // Encima del canvas
      textLayer.style.userSelect = 'text';
      textLayer.style.webkitUserSelect = 'text';
      textLayer.style.userSelect = 'text';
      textLayer.style.userSelect = 'text';
      
      this.textLayers.set(pageNum, textLayer);

      // Capa para comentarios - encima del texto pero no debe interferir con selección
      const commentLayer = document.createElement('div');
      commentLayer.className = 'comment-layer';
      commentLayer.style.position = 'absolute';
      commentLayer.style.left = '0';
      commentLayer.style.top = '0';
      commentLayer.style.width = '100%';
      commentLayer.style.height = '100%';
      commentLayer.style.pointerEvents = 'none'; // No interferir con selección
      commentLayer.style.zIndex = '3'; // Encima de todo

      // Encabezado de página
      const pageHeader = document.createElement('div');
      pageHeader.className = 'page-header';
      pageHeader.style.position = 'absolute';
      pageHeader.style.top = '-40px';
      pageHeader.style.left = '0';
      pageHeader.style.right = '0';
      pageHeader.style.height = '30px';
      pageHeader.style.display = 'flex';
      pageHeader.style.alignItems = 'center';
      pageHeader.style.justifyContent = 'center';

      const pageNumberBadge = document.createElement('div');
      pageNumberBadge.className = 'page-number-badge';
      pageNumberBadge.textContent = `Página ${pageNum}`;
      pageNumberBadge.style.backgroundColor = '#3B82F6';
      pageNumberBadge.style.color = 'white';
      pageNumberBadge.style.padding = '4px 12px';
      pageNumberBadge.style.borderRadius = '15px';
      pageNumberBadge.style.fontSize = '12px';
      pageNumberBadge.style.fontWeight = '500';
      pageNumberBadge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

      pageHeader.appendChild(pageNumberBadge);

      // Ensamblar componentes en el ORDEN CORRECTO:
      // 1. Canvas (abajo, z-index: 1)
      // 2. Capa de texto (en medio, z-index: 2, permite selección)
      // 3. Capa de comentarios (arriba, z-index: 3, solo visual)
      pdfPageContainer.appendChild(canvas);
      pdfPageContainer.appendChild(textLayer);
      pdfPageContainer.appendChild(commentLayer);
      
      pageContainer.appendChild(pageHeader);
      pageContainer.appendChild(pdfPageContainer);

      // Renderizar página
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Renderizar capa de texto para búsqueda
      await this.renderTextLayer(page, pageNum, viewport);

      // Dibujar marcadores de comentarios
      this.drawCommentMarkers(commentLayer, viewport, pageNum);

      // Marcar página como renderizada
      this.pagesRendered.add(pageNum);

      // Agregar a miniaturas
      this.addPageThumbnail(pageNum, pageContainer);

    } catch (error) {
      console.error(`Error al renderizar página ${pageNum}:`, error);
    }
  }

  async renderTextLayer(page: any, pageNum: number, viewport: any) {
    try {
      const textContent = await page.getTextContent();
      const textLayer = this.textLayers.get(pageNum);
      
      if (!textLayer) return;

      // Limpiar capa de texto anterior
      textLayer.innerHTML = '';

      // Crear la capa de texto manualmente para mejor control
      textContent.items.forEach((item: any) => {
        const span = document.createElement('span');
        span.textContent = item.str;
        span.style.color = 'transparent'; // Texto invisible
        span.style.cursor = 'text'; // Cursor de texto
        
        // IMPORTANTE: Permitir selección
        span.style.userSelect = 'text';
        span.style.webkitUserSelect = 'text';
        span.style.userSelect = 'text';
        span.style.userSelect = 'text';
        
        // Posicionar basado en las coordenadas del PDF
        if (item.transform) {
          span.style.position = 'absolute';
          
          // Ajustar coordenadas del PDF a la vista
          const x = item.transform[4];
          const y = viewport.height - item.transform[5]; // Invertir Y
          
          span.style.left = `${x}px`;
          span.style.top = `${y}px`;
          span.style.transform = 'translateY(-100%)'; // Ajustar para texto
          
          // Usar el tamaño del texto si está disponible
          if (item.width && item.height) {
            span.style.width = `${item.width}px`;
            span.style.height = `${item.height}px`;
          }
        }
        
        textLayer.appendChild(span);
      });

    } catch (error) {
      console.error(`Error al renderizar capa de texto página ${pageNum}:`, error);
    }
  }

  handleCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement, pageNum: number) {
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
            this.commentTextarea.nativeElement.placeholder = `Comentario en página ${pageNum} (${Math.round(x*100)}%, ${Math.round(y*100)}%)`;
          }
        }, 100);
        
        // Guardar posición para cuando se escriba el comentario
        this.selectedCommentPosition = { x, y, page: pageNum };
      }
    }
  }

  drawCommentMarkers(container: HTMLDivElement, viewport: any, pageNum: number) {
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
        
        // IMPORTANTE: Los marcadores deben capturar eventos cuando se hace clic en ellos
        marker.style.pointerEvents = 'auto';
        
        // Ícono en lugar de número
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

  addPageThumbnail(pageNum: number, element: HTMLElement) {
    this.pageThumbnails.push({
      page: pageNum,
      element: element
    });
  }

  // ========== SISTEMA DE BÚSQUEDA ==========
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

  highlightSearchResults(pageNum: number, matches: any[]) {
    const textLayer = this.textLayers.get(pageNum);
    if (!textLayer) return;

    // Limpiar resaltados anteriores
    const existingHighlights = textLayer.querySelectorAll('.search-highlight');
    existingHighlights.forEach(el => el.remove());

    // Crear resaltados para cada coincidencia
    matches.forEach(match => {
      const span = document.createElement('span');
      span.className = 'search-highlight';
      span.style.position = 'absolute';
      span.style.backgroundColor = 'rgba(255, 235, 59, 0.6)';
      span.style.borderRadius = '2px';
      span.style.pointerEvents = 'none'; // No interferir con selección
      span.style.zIndex = '5'; // Encima del texto normal
      
      // Posicionar el resaltado
      if (match.transform) {
        const viewport = this.pdfDoc.getPageViewport ? 
          this.pdfDoc.getPageViewport({ scale: this.scale }) : 
          { width: 800, height: 1000 };

        const x = match.transform[4];
        const y = viewport.height - match.transform[5]; // Invertir Y
        
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        span.style.transform = 'translateY(-100%)';
        
        if (match.width && match.height) {
          span.style.width = `${match.width}px`;
          span.style.height = `${match.height}px`;
        }
        
        textLayer.appendChild(span);
      }
    });
  }

  clearSearchHighlights() {
    this.textLayers.forEach((textLayer) => {
      const highlights = textLayer.querySelectorAll('.search-highlight');
      highlights.forEach(el => el.remove());
    });
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

  navigateToSearchResult(index: number) {
    if (index < 0 || index >= this.searchResults.length) return;

    const result = this.searchResults[index];
    
    // Ir a la página
    this.scrollToPage(result.page);
    
    // Resaltar el resultado actual
    setTimeout(() => {
      this.highlightCurrentSearchResult(result);
    }, 500);
  }

  highlightCurrentSearchResult(result: SearchResult) {
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
        firstHighlight.style.zIndex = '10'; // Encima de otros resaltados
      }
    }
  }

  // ========== SCROLL Y VISIBILIDAD ==========
  onScroll() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.updateCurrentVisiblePage();
      this.checkLoadMorePages();
      this.updateScrollTopButton();
    }, 100);
  }

  updateCurrentVisiblePage() {
    if (!this.pdfDoc || this.visiblePages.length === 0) return;

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

  setupIntersectionObserver() {
    const options = {
      root: this.pdfContainer.nativeElement,
      rootMargin: '50px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.id.split('-')[1]);
          if (!this.pagesRendered.has(pageNum)) {
            this.renderPage(pageNum);
          }
        }
      });
    }, options);

    // Observar contenedores de página existentes
    setTimeout(() => {
      this.visiblePages.forEach(pageNum => {
        const pageElement = document.getElementById(`page-${pageNum}`);
        if (pageElement) {
          observer.observe(pageElement);
        }
      });
    }, 100);
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.pdfDoc) {
        this.rerenderAllPages();
      }
    });

    if (this.pdfContainer?.nativeElement) {
      this.resizeObserver.observe(this.pdfContainer.nativeElement);
    }
  }

  checkLoadMorePages() {
    if (this.isLoadingPages || this.visiblePages.length >= this.totalPages) return;

    const container = this.pdfContainer.nativeElement;
    const scrollBottom = container.scrollTop + container.clientHeight;
    const scrollHeight = container.scrollHeight;

    // Cargar más páginas cuando estemos cerca del final
    if (scrollHeight - scrollBottom < 500) {
      this.loadMorePages();
    }
  }

  updateScrollTopButton() {
    const container = this.pdfContainer.nativeElement;
    this.showScrollTop = container.scrollTop > 300;
  }

  scrollToTop() {
    this.pdfContainer.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  scrollToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > this.totalPages) return;

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

  // ========== SISTEMA DE COMENTARIOS ==========
  addComment(event?: Event) {
    if (event) event.preventDefault();
    
    if (!this.newCommentText.trim() || this.newCommentText.length > 1000) {
      this.showToast('El comentario debe tener entre 1 y 1000 caracteres', 'warning');
      return;
    }

    // Usar undefined en lugar de null para la posición
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
    
    // Actualizar eventos del canvas después de agregar comentario
    this.updateCanvasEvents();
    
    // Volver a renderizar la página
    this.renderPage(newComment.page);
    
    this.selectComment(newComment);
    this.showToast('Comentario agregado', 'success');
    
    // Restaurar placeholder del textarea
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
        
        // Volver a renderizar la página
        this.renderPage(comment.page);
        this.showToast('Comentario eliminado', 'warning');
      }
    }
  }

  selectComment(comment: PdfComment) {
    this.selectedComment = comment;
    
    // Ir a la página del comentario
    this.scrollToPage(comment.page);
    
    // Mostrar panel de comentarios
    this.showCommentsPanel = true;
    
    // Enfocar el textarea para editar
    setTimeout(() => {
      if (this.commentTextarea) {
        this.commentTextarea.nativeElement.focus();
      }
    }, 100);
  }

  toggleCommentMode() {
    this.commentModeActive = !this.commentModeActive;
    
    // Actualizar eventos de todos los canvases
    this.updateCanvasEvents();
    
    if (this.commentModeActive) {
      this.showToast('Modo comentario activado. Haz clic en el PDF para posicionar.', 'info');
    } else {
      this.selectedCommentPosition = null;
      this.showToast('Modo comentario desactivado', 'info');
    }
  }

  // Método para actualizar eventos de todos los canvases
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

  toggleSearchPanel() {
    this.showSearchPanel = !this.showSearchPanel;
    if (this.showSearchPanel && this.searchInput) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      }, 100);
    }
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
    
    // Ordenar por fecha (más reciente primero)
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ========== NAVEGACIÓN Y ZOOM ==========
  goToPageNumber(pageNumber: any) {
    if (!pageNumber || pageNumber < 1 || pageNumber > this.totalPages) {
      this.showToast('Número de página inválido', 'warning');
      return;
    }
    
    this.scrollToPage(pageNumber);
    this.jumpToPage = null;
  }

  async zoomIn() {
    this.scale = Math.min(3, this.scale + 0.1);
    await this.rerenderAllPages();
  }

  async zoomOut() {
    this.scale = Math.max(0.25, this.scale - 0.1);
    await this.rerenderAllPages();
  }

  async resetZoom() {
    this.scale = 1.0;
    await this.rerenderAllPages();
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

  async rerenderAllPages() {
    this.pagesRendered.clear();
    this.textLayers.clear();
    await this.renderVisiblePages();
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ========== PERSISTENCIA ==========
  saveDocumentInfo() {
    const docInfo: DocumentInfo = {
      fileName: this.currentFileName,
      fileSize: this.currentFileSize,
      totalPages: this.totalPages,
      lastOpened: new Date().toISOString()
    };
    
    localStorage.setItem('pdfViewer_lastDocument', JSON.stringify(docInfo));
  }

  loadComments() {
    try {
      const key = `pdfComments_${this.currentFileName}`;
      const saved = localStorage.getItem(key);
      
      if (saved) {
        this.comments = JSON.parse(saved);
        
        // Convertir fechas
        this.comments.forEach(comment => {
          comment.date = new Date(comment.date);
        });
        
        // Encontrar ID máximo
        const maxId = this.comments.reduce((max, comment) => 
          Math.max(max, comment.id), 0);
        this.nextCommentId = maxId + 1;
      }
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
    }
  }

  saveComments() {
    try {
      const key = `pdfComments_${this.currentFileName}`;
      localStorage.setItem(key, JSON.stringify(this.comments));
    } catch (error) {
      console.error('Error al guardar comentarios:', error);
    }
  }

  setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.pdfDoc && this.comments.length > 0) {
        this.saveComments();
        this.saveDocumentInfo();
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  loadSavedState() {
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

  downloadPDF() {
    if (!this.pdfDoc) {
      this.showToast('No hay PDF cargado para descargar', 'warning');
      return;
    }

    // En producción, aquí se descargaría el PDF original
    this.showToast('En una aplicación real, aquí se descargaría el PDF', 'info');
  }

  async loadSamplePDF() {
    this.isLoading = true;
    
    try {
      // En producción, cargarías un PDF de ejemplo desde assets
      // Esta es una implementación de demostración
      this.currentFileName = 'documento-ejemplo.pdf';
      this.currentFileSize = 1024 * 1024;
      this.totalPages = 10; // PDF de ejemplo con 10 páginas
      
      // Simular documento
      this.pdfDoc = { numPages: 10 };
      
      // Limpiar páginas anteriores
      this.visiblePages = [];
      this.pagesRendered.clear();
      this.pageThumbnails = [];
      this.currentVisiblePage = 1;
      this.textLayers.clear();
      
      // Cargar primeras páginas
      await this.loadInitialPages();
      
      // Agregar comentarios de ejemplo
      this.addSampleComments();
      
      this.showToast('Documento de ejemplo cargado', 'success');
      
    } catch (error) {
      console.error('Error al cargar ejemplo:', error);
      this.showToast('Error al cargar documento de ejemplo', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  addSampleComments() {
    const sampleComments: Partial<PdfComment>[] = [
      {
        page: 1,
        text: 'Bienvenido al PDF Viewer. Este es un comentario de ejemplo en la primera página.',
        color: this.commentColors[0],
        position: { x: 0.2, y: 0.2 }
      },
      {
        page: 3,
        text: 'Puedes agregar comentarios en cualquier parte del documento activando el modo comentario.',
        color: this.commentColors[1],
        position: { x: 0.5, y: 0.5 }
      },
      {
        page: 5,
        text: 'Usa el sistema de búsqueda para encontrar texto específico dentro del PDF.',
        color: this.commentColors[2],
        position: { x: 0.7, y: 0.3 }
      }
    ];

    sampleComments.forEach((comment, index) => {
      const newComment: PdfComment = {
        id: this.nextCommentId++,
        page: comment.page!,
        text: comment.text!,
        date: new Date(Date.now() - (index * 3600000)),
        position: comment.position,
        color: comment.color!
      };
      this.comments.push(newComment);
    });

    this.saveComments();
    
    // Renderizar páginas con comentarios
    sampleComments.forEach(comment => {
      this.renderPage(comment.page!);
    });
  }

  // ========== EXPORTACIÓN ==========
  exportComments() {
    if (this.comments.length === 0) {
      this.showToast('No hay comentarios para exportar', 'warning');
      return;
    }

    const exportData = {
      fileName: this.currentFileName,
      exportDate: new Date().toISOString(),
      totalPages: this.totalPages,
      comments: this.comments,
      exportInfo: {
        totalComments: this.comments.length,
        pagesWithComments: [...new Set(this.comments.map(c => c.page))],
        exportTool: 'PDF Viewer'
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportName = `comentarios_${this.currentFileName.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.json`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showToast('Comentarios exportados', 'success');
  }

  // ========== NOTIFICACIONES ==========
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${
      type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
      type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
      type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
      'bg-blue-100 text-blue-800 border border-blue-200'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          ${
            type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' :
            type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />' :
            type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376C2.922 19.502 4.591 21 6.485 21h11.03c1.894 0 3.563-1.498 2.788-3.624l-5.615-11.25C14.301 3.498 12.632 2 10.738 2H6.485c-1.894 0-3.563 1.498-2.788 3.624L9.303 17.376z" />' :
            '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />'
          }
        </svg>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-eliminar después de 3 segundos
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
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Evitar shortcuts cuando se está escribiendo
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Flechas para navegación
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          this.pdfContainer.nativeElement.scrollBy({
            top: -100,
            behavior: 'smooth'
          });
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.pdfContainer.nativeElement.scrollBy({
            top: 100,
            behavior: 'smooth'
          });
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
        case 'Home':
          event.preventDefault();
          this.scrollToTop();
          break;
        case 'End':
          event.preventDefault();
          this.scrollToPage(this.totalPages);
          break;
        case 'F5':
          if (event.ctrlKey) {
            event.preventDefault();
            this.fitToPage();
          }
          break;
        case 'F6':
          if (event.ctrlKey) {
            event.preventDefault();
            this.fitToWidth();
          }
          break;
      }
    });
  }

  // ========== LIMPIEZA ==========
  ngOnDestroy() {
    // Limpiar intervalos
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Limpiar observadores
    if (this.resizeObserver) {
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