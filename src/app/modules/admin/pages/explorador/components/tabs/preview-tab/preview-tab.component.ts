import {
  Component,
  Input,
  SimpleChanges,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  signal,
  OnChanges,
  ViewChild,
  ElementRef,
  effect,
  SecurityContext
} from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-preview-tab',
  standalone: false,
  templateUrl: './preview-tab.component.html',
  styleUrls: ['./preview-tab.component.css'],
})
export class PreviewTabComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedNode: AutorizacionTreeNode | null = null;
  @Input() pdfUrl!: SafeResourceUrl | null;

  @ViewChild('pdfIframe') pdfIframe!: ElementRef;

  // Estados del componente
  isLoading = false;
  isFullscreen = false;
  showCommentsPanel = false;
  hasError = signal(false);

  // Signals para páginas - REACTIVIDAD AUTOMÁTICA
  pdfUrlString: string = '';
  currentPage = signal(1);
  totalPages = signal(0);

  // Para detectar cambios de página
  // private pageCheckInterval: any;
  // private lastDetectedPage = 1;
  // private pageDetectionActive = false;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    // Bindear el método para poder removerlo luego
    this.handlePdfMessageBound = this.handlePdfMessage.bind(this);

    effect(() => {
      //console.log(`📄 [PreviewTab] Página actual: ${this.currentPage()}`);
    });

  }

  ngOnInit() {
    this.setupFullscreenListener();
    // this.setupPdfJsListeners();
    // this.setupPageDetection();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si la pestaña se activa
    if (changes['isActive']) {
      //console.log('🔄 Pestaña activada');
      if (this.pdfUrl) {
        this.loadPdf();
      }
    }

    // Si cambia el nodo seleccionado
    if (changes['selectedNode'] && this.selectedNode) {
      //console.log('🔄 Nodo seleccionado cambiado:', this.selectedNode.nombre);
      this.currentPage.set(1);
      this.totalPages.set(0);
      this.handleNodeChange();
    }

    // Si cambia la URL del PDF
    if (changes['pdfUrl'] && this.pdfUrl) {

      this.pdfUrlString = this.extractFileNameFromUrl(this.pdfUrl);
      console.log('📄 pdfUrlString:', this.pdfUrlString);

      // this.loadPdf();
    }
  }
  loadingProgress = 0;

  onPdfProgress(progress: number) {
    this.loadingProgress = progress;
    this.isLoading = progress < 100;
  }
  // ========== MANEJO DE CAMBIOS ==========

  private handleNodeChange(): void {
    if (this.selectedNode?.type === 'autorizacion') {
      //console.log('📄 Es una autorización, reseteando documento...');

      // Resetear el visor cuando cambia el nodo
      this.resetDocument();
      this.hasError.set(false);

      // Si la pestaña está activa, cargar inmediatamente
      if (this.pdfUrl) {
        setTimeout(() => {
          this.loadPdf();
        }, 50);
      }
    } else {
      //console.log('📄 No es una autorización, mostrando icono...');
    }
  }
  onPageChanged(page: number) {
    this.currentPage.set(page);
  }

  onDocumentLoaded(total: number) {
    this.totalPages.set(total);
  }
  private loadPdf(): void {
    if (!this.pdfUrl || !this.selectedNode) {
      //console.log('⚠️ Condiciones no cumplidas para cargar PDF');
      return;
    }

    // Si ya estamos cargando, salir
    if (this.isLoading) {
      //console.log('⚠️ Ya se está cargando un PDF');
      return;
    }

    this.isLoading = true;
    this.hasError.set(false);

    // Resetear contadores de página
    this.currentPage.set(1);
    this.totalPages.set(0);
    // this.lastDetectedPage = 1;

    //console.log('🔄 Iniciando carga del PDF...');
    this.cdr.detectChanges();
  }

  // Método para extraer el nombre del archivo de la URL
  private extractFileNameFromUrl(pdfUrl: SafeResourceUrl | null): string {
    if (!pdfUrl) {
      return this.selectedNode?.nombre || 'documento.pdf';
    }

    try {
      const urlString = this.sanitizer.sanitize(5, pdfUrl) || '';
      if (!urlString) {
        return this.selectedNode?.nombre || 'documento.pdf';
      }

      const url = new URL(urlString, window.location.origin);

      //console.log('📄 Nombre extraído para mostrar:', cleanFileName);
      return url.toString();
    } catch (error) {
      console.error('❌ Error al extraer nombre de archivo:', error);
      return this.selectedNode?.nombre || 'documento.pdf';
    }
  }

  private detectCurrentPage(): void {
    try {
      // Método 2: Intentar leer de la URL
      const pageFromUrl = this.getPageFromUrl();
      if (pageFromUrl !== null && pageFromUrl !== this.currentPage()) {
        //console.log(`🌐 Página detectada desde URL: ${pageFromUrl}`);
        this.currentPage.set(pageFromUrl);
        this.cdr.detectChanges();
      }

      // Método 3: Intentar detectar total de páginas
      this.detectTotalPages();

    } catch (error) {
      // Error de cross-origin, es normal
      // //console.log('🔒 Error cross-origin al detectar página');
    }
  }


  // NUEVO: Método para inyectar script en el iframe (si es del mismo origen)
  private injectPageDetectionScript(): void {
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (!iframe) return;

      // Intentar acceder solo si es del mismo origen
      const iframeOrigin = new URL(iframe.src).origin;
      const currentOrigin = window.location.origin;

      if (iframeOrigin === currentOrigin) {
        // Mismo origen: podemos acceder directamente
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        // Inyectar script para detectar cambios de página
        const script = iframeDoc.createElement('script');
        script.textContent = `
        (function() {
          //console.log('📄 Script de detección de página inyectado');
          
          // Buscar el input de página
          function findPageInput() {
            const toolbar = document.querySelector('#toolbar');
            if (!toolbar) return null;
            
            const pageSelector = toolbar.querySelector('viewer-page-selector');
            if (!pageSelector || !pageSelector.shadowRoot) return null;
            
            return pageSelector.shadowRoot.querySelector('#pageSelector');
          }
          
          // Obtener página actual
          function getCurrentPage() {
            const pageInput = findPageInput();
            if (!pageInput || !pageInput.value) return 1;
            
            const pageNum = parseInt(pageInput.value);
            return isNaN(pageNum) ? 1 : pageNum;
          }
          
          // Escuchar cambios en el input
          function setupPageChangeListener() {
            const pageInput = findPageInput();
            if (!pageInput) {
              setTimeout(setupPageChangeListener, 1000);
              return;
            }
            
            pageInput.addEventListener('input', function() {
              const page = getCurrentPage();
              window.parent.postMessage({
                type: 'PDF_PAGE_CHANGED',
                page: page,
                source: 'pdf-viewer'
              }, '*');
            });
            
            //console.log('🎯 Listener de página configurado');
          }
          
          // Iniciar
          setupPageChangeListener();
          
          // También exponer función para obtener página
          window.getPDFCurrentPage = getCurrentPage;
          
        })();
      `;

        iframeDoc.head.appendChild(script);
        //console.log('✅ Script de detección inyectado en iframe');
      }

    } catch (error) {
      // Cross-origin error, usar método alternativo
      this.setupPostMessageCommunication();
    }
  }

  // ALTERNATIVA: Usar postMessage bidireccional
  private setupPostMessageCommunication(): void {
    //console.log('🔄 Configurando comunicación por postMessage...');

    // Ya tenemos el listener en setupPdfJsListeners()
    // Ahora enviaremos mensajes periódicos
  }

  // MODIFICA onIframeLoad:
  onIframeLoad(): void {
    //console.log('✅ Iframe del PDF cargado');
    this.isLoading = false;
    this.hasError.set(false);

    // Intentar inyectar script de detección
    setTimeout(() => {
      try {
        this.injectPageDetectionScript();
      } catch (error) {
        //console.log('⚠️ No se pudo inyectar script, usando postMessage');
        this.setupPollingDetection();
      }

      // Forzar detección inicial
      this.forcePageDetection();

    }, 1500);

    this.cdr.detectChanges();
  }

  // NUEVO: Detección por polling (más confiable para cross-origin)
  private setupPollingDetection(): void {
    //console.log('⏱️ Configurando detección por polling...');

    // Enviar mensaje periódico al iframe
    const pollInterval = setInterval(() => {
      if (!this.showCommentsPanel) return;

      this.sendPageRequestToIframe();

    }, 1500); // Cada 1.5 segundos

    // Guardar referencia para limpiar
    this.pollingInterval = pollInterval;
  }

  private sendPageRequestToIframe(): void {
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (!iframe || !iframe.contentWindow) return;

      // Método 1: Pedir la página actual
      iframe.contentWindow.postMessage({
        type: 'GET_PDF_CURRENT_PAGE',
        requestId: Date.now(),
        source: 'parent-window'
      }, '*');

      // Método 2: También intentar extraer de la URL
      this.extractPageFromIframeUrl();

    } catch (error) {
      // Silenciar error
    }
  }

  // NUEVO: Extraer página de la URL del iframe
  private extractPageFromIframeUrl(): void {
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (!iframe || !iframe.src) return;

      // Verificar si la URL tiene parámetro de página
      const url = iframe.src;

      // Buscar #page= o ?page=
      const pageMatch = url.match(/(?:#|\?)page=(\d+)/i);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        if (pageNum && pageNum !== this.currentPage()) {
          //console.log(`🌐 Página detectada desde URL: ${pageNum}`);
          this.currentPage.set(pageNum);
          this.cdr.detectChanges();
        }
        return;
      }

      // Buscar #p= o ?p=
      const pMatch = url.match(/(?:#|\?)p=(\d+)/i);
      if (pMatch) {
        const pageNum = parseInt(pMatch[1]);
        if (pageNum && pageNum !== this.currentPage()) {
          //console.log(`🌐 Página detectada desde parámetro p: ${pageNum}`);
          this.currentPage.set(pageNum);
          this.cdr.detectChanges();
        }
        return;
      }

      // Buscar hash simple #3
      const hashMatch = url.match(/#(\d+)$/);
      if (hashMatch) {
        const pageNum = parseInt(hashMatch[1]);
        if (pageNum && pageNum !== this.currentPage()) {
          //console.log(`🌐 Página detectada desde hash: ${pageNum}`);
          this.currentPage.set(pageNum);
          this.cdr.detectChanges();
        }
      }

    } catch (error) {
      // Error parsing URL
    }
  }

  // MODIFICA handlePdfMessage para manejar más tipos de mensajes:
  private handlePdfMessage(event: MessageEvent): void {
    // Solo procesar mensajes relevantes
    if (!event.data || typeof event.data !== 'object') return;

    //console.log('📩 Mensaje recibido:', event.data.type);

    switch (event.data.type) {
      case 'PDF_PAGE_CHANGED':
      case 'PAGE_CHANGED':
        const newPage = event.data.page;
        if (newPage && newPage !== this.currentPage()) {
          //console.log(`📄 Página recibida: ${newPage}`);
          this.currentPage.set(newPage);
          this.cdr.detectChanges();
        }
        break;

      case 'PDF_CURRENT_PAGE_RESPONSE':
        const currentPage = event.data.currentPage;
        if (currentPage && currentPage !== this.currentPage()) {
          //console.log(`📄 Respuesta de página actual: ${currentPage}`);
          this.currentPage.set(currentPage);
          this.cdr.detectChanges();
        }
        break;

      case 'PDF_TOTAL_PAGES':
        const totalPages = event.data.totalPages;
        if (totalPages && totalPages !== this.totalPages()) {
          //console.log(`📚 Total de páginas recibido: ${totalPages}`);
          this.totalPages.set(totalPages);
          this.cdr.detectChanges();
        }
        break;

      case 'PDF_LOADED':
        this.isLoading = false;
        this.totalPages.set(event.data.totalPages || 0);
        //console.log('✅ PDF cargado completamente');
        this.cdr.detectChanges();
        break;

      case 'PDF_READY':
        // El iframe está listo para recibir mensajes
        //console.log('✅ PDF listo para comunicación');
        break;
    }
  }

  // NUEVO: Método para navegar usando URL (funciona con cross-origin)
  private navigateByUrl(pageNumber: number): void {
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (!iframe || !iframe.src) return;

      // Construir nueva URL con el parámetro de página
      const currentUrl = iframe.src;
      const urlWithoutHash = currentUrl.split('#')[0];
      const newUrl = `${urlWithoutHash}#page=${pageNumber}`;

      // Solo cambiar si es diferente
      if (newUrl !== currentUrl) {
        iframe.src = newUrl;
        //console.log(`🌐 Navegando por URL a página ${pageNumber}`);
      }

    } catch (error) {
      console.error('❌ Error navegando por URL:', error);
    }
  }

  // MODIFICA scrollToPage para usar navegación por URL:
  scrollToPage(pageNumber: number): void {
    //console.log(`🎯 Navegando a página ${pageNumber} desde comentarios`);

    // Validar rango
    if (this.totalPages() > 0 && (pageNumber < 1 || pageNumber > this.totalPages())) {
      this.showToast(`Página ${pageNumber} fuera de rango (1-${this.totalPages()})`, 'error');
      return;
    }

    // Actualizar estado
    this.currentPage.set(pageNumber);
    // this.lastDetectedPage = pageNumber;

    // Método 1: Navegación por URL (funciona con cross-origin)
    this.navigateByUrl(pageNumber);

    // Método 2: Enviar mensaje postMessage
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'GO_TO_PAGE',
          page: pageNumber,
          timestamp: Date.now()
        }, '*');
      }
    } catch (error) {
      // Error de cross-origin
    }

    this.showToast(`Navegando a página ${pageNumber}`, 'info');
    this.cdr.detectChanges();
  }

  // AGREGA esta propiedad a la clase:
  private pollingInterval: any;

  // AGREGAR al inicio de la clase:
  private handlePdfMessageBound: any;

  private getPageFromUrl(): number | null {
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (!iframe || !iframe.src) {
        return null;
      }

      // Extraer página de la URL (#page=3 o ?page=3)
      const url = new URL(iframe.src);

      // 1. Buscar en el hash (#page=3)
      const hash = url.hash;
      if (hash) {
        const pageMatch = hash.match(/page=(\d+)/);
        if (pageMatch) {
          return parseInt(pageMatch[1]);
        }

        // También buscar solo número (#3)
        const hashNumber = hash.match(/#(\d+)/);
        if (hashNumber) {
          return parseInt(hashNumber[1]);
        }
      }

      // 2. Buscar en parámetros de consulta (?page=3)
      const pageParam = url.searchParams.get('page');
      if (pageParam) {
        const pageNumber = parseInt(pageParam);
        if (!isNaN(pageNumber)) {
          return pageNumber;
        }
      }

      // 3. Buscar en parámetros p (#p=3)
      const pParam = url.searchParams.get('p');
      if (pParam) {
        const pageNumber = parseInt(pParam);
        if (!isNaN(pageNumber)) {
          return pageNumber;
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Error al parsear URL:', error);
      return null;
    }
  }

  private detectTotalPages(): void {
    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (!iframe) return;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Buscar el elemento que muestra el total de páginas
      const pageSelector = iframeDoc.querySelector('viewer-page-selector');
      if (!pageSelector) return;

      const shadowRoot = pageSelector.shadowRoot;
      if (!shadowRoot) return;

      // Buscar el span que muestra el total (ej: "/ 426")
      const pageLengthSpan = shadowRoot.querySelector('#pagelength') as HTMLSpanElement;
      if (pageLengthSpan && pageLengthSpan.textContent) {
        const totalPages = parseInt(pageLengthSpan.textContent.trim());
        if (!isNaN(totalPages) && totalPages !== this.totalPages()) {
          //console.log(`📚 Total de páginas detectado: ${totalPages}`);
          this.totalPages.set(totalPages);
          this.cdr.detectChanges();
        }
      }
    } catch (error) {
      // Error de cross-origin
    }
  }

  // Método para forzar la detección (puedes llamarlo manualmente)
  forcePageDetection(): void {
    //console.log('🔍 Forzando detección de página...');
    this.detectCurrentPage();
  }

  // ========== GESTIÓN DE DOCUMENTO ==========

  resetDocument(): void {
    //console.log('🔄 Reseteando documento...');
    this.currentPage.set(1);
    this.totalPages.set(0);
    // this.lastDetectedPage = 1;
    this.hasError.set(false);
    this.isLoading = false;
    this.showCommentsPanel = false;

    this.cdr.detectChanges();
  }

  // ========== PANTALLA COMPLETA ==========

  private setupFullscreenListener(): void {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.cdr.detectChanges();
    });

    document.addEventListener('fullscreenerror', () => {
      console.error('❌ Error al cambiar el modo pantalla completa');
      this.showToast('Error al cambiar a pantalla completa', 'error');
    });
  }

  toggleFullscreen(): void {
    const element = document.documentElement;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`❌ Error al entrar en pantalla completa: ${err.message}`);
        this.showToast('No se pudo activar el modo pantalla completa', 'error');
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error(`❌ Error al salir del modo pantalla completa: ${err.message}`);
        this.showToast('No se pudo salir del modo pantalla completa', 'error');
      });
    }
  }

  // ========== COMENTARIOS ==========

  toggleCommentsPanel(): void {
    this.showCommentsPanel = !this.showCommentsPanel;
    //console.log(`💬 Panel de comentarios: ${this.showCommentsPanel ? 'Mostrando' : 'Ocultando'}`);

    // Cuando se abren comentarios, forzar detección de página
    if (this.showCommentsPanel) {
      setTimeout(() => {
        this.forcePageDetection();
        // Intentar detectar varias veces
        let attempts = 0;
        const detectionInterval = setInterval(() => {
          this.forcePageDetection();
          attempts++;
          if (attempts >= 3) clearInterval(detectionInterval);
        }, 500);
      }, 300);
    }

    this.cdr.detectChanges();
  }

  // ========== UTILIDADES ==========

  get isAutorizacion(): boolean {
    return this.selectedNode?.type === 'autorizacion';
  }

  get hasPreview(): boolean {
    return this.isAutorizacion && !!this.pdfUrl;
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

  // ========== NOTIFICACIONES ==========

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
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

  onIframeError(): void {
    console.error('❌ Error al cargar el PDF en el iframe');
    this.hasError.set(true);
    this.isLoading = false;
    this.showToast('Error al cargar el documento PDF', 'error');
    this.cdr.detectChanges();
  }

  // ========== MÉTODOS PÚBLICOS PARA DEBUG ==========

  /**
   * Método para debug: mostrar información del visor
   */
  debugViewerInfo(): void {

    try {
      const iframe = this.pdfIframe?.nativeElement;
      if (iframe) {
        //console.log('Iframe SRC:', iframe.src);
        //console.log('Iframe exists:', !!iframe);

        // Intentar acceder al contenido
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            //console.log('Iframe document accessible:', !!iframeDoc);

            const pageSelector = iframeDoc.querySelector('viewer-page-selector');
            //console.log('viewer-page-selector found:', !!pageSelector);

            if (pageSelector) {
              //console.log('Has shadowRoot:', !!pageSelector.shadowRoot);

              if (pageSelector.shadowRoot) {
                const pageInput = pageSelector.shadowRoot.querySelector('#pageSelector');
                //console.log('#pageSelector found:', !!pageInput);
                if (pageInput) {
                  //console.log('Current input value:', (pageInput as HTMLInputElement).value);
                }
              }
            }
          }
        } catch (e) {
          //console.log('Cross-origin error accessing iframe content');
        }
      }
    } catch (error) {
      console.error('Error in debug:', error);
    }

    //console.log('=== END DEBUG ===');
  }

  // ========== LIMPIEZA ==========

  ngOnDestroy(): void {
    // Remover event listeners
    document.removeEventListener('fullscreenchange', () => { });
    document.removeEventListener('fullscreenerror', () => { });
    document.removeEventListener('click', () => { });
    document.removeEventListener('keyup', () => { });
    window.removeEventListener('message', (event) => this.handlePdfMessage(event));

    //console.log('✅ PreviewTabComponent destruido');
  }
}