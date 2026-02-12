
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { AnotacionesService } from '../../../../../../core/services/anotaciones.service';
import { AuthService } from '../../../../../../core/services/auth';
import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SecurityContext, signal, SimpleChanges, ViewChild } from '@angular/core';

export interface PdfComment {
  id: number;
  page: number;
  text: string;
  date: Date;
  color: string;
  autor: string;
  resolved?: boolean;
  documentId?: string;
  esMio?: boolean;
  usuario_id?: number;
  editable?: boolean;
}

@Component({
  selector: 'app-comentarios',
  standalone: false,
  templateUrl: './comentarios.html',
  styleUrls: ['./comentarios.css']
})
export class Comentarios implements OnInit, OnDestroy, OnChanges {
  // Inputs y Outputs básicos
  @Input() pdfUrl!: SafeResourceUrl;
  @Input() autor: string = 'Usuario';

  @Output() commentAdded = new EventEmitter<PdfComment>();
  @Output() commentDeleted = new EventEmitter<PdfComment>();
  @Output() commentsLoaded = new EventEmitter<PdfComment[]>();
  @Input() selectedNode: AutorizacionTreeNode | null = null;

  @ViewChild('commentTextarea') commentTextarea!: ElementRef<HTMLTextAreaElement>;

  // Estado principal
  showCommentsPanel = true;
  pdfIdentifier = '';

  // PÁGINA MANUAL - El usuario siempre escribe aquí
  manualCommentPage = 1;

  // comments: PdfComment[] = [];
  comments = signal<PdfComment[]>([]);
  newCommentText = '';
  selectedComment: PdfComment | null = null;
  nextCommentId = 1;

  // Configuración
  commentColors = ['#FFEB3B', '#2196F3', '#4CAF50', '#F44336', '#9C27B0', '#607D8B'];
  selectedColor = this.commentColors[0];
  commentModeActive = false;
  filterByPage: number | null = null;
  searchQuery = '';

  // Estados
  isSaving = false;
  isLoading = false;

  // Usuario actual
  currentUser: any = null;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private anotacionesService: AnotacionesService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.currentUser();
    this.setupAutoSave();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pdfUrl'] && this.pdfUrl) {
      this.extractFileNameFromUrl();
    }
    // if (changes['selectedNode'] && this.selectedNode) {
    //   console.log('Nodo recibido en comentarios:', this.selectedNode);

    //   // Ejemplo: usar ID como identificador del documento
    //   this.pdfIdentifier = this.selectedNode.id;

    //   // this.cargarComentarios();
    // }
    if (changes['autor'] && this.autor) {
      this.updateCommentsAuthor();
    }
  }

  ngOnDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  // ========== VALIDACIÓN PÁGINA MANUAL ==========

  validateManualPage(): void {
    if (this.manualCommentPage < 1) {
      this.manualCommentPage = 1;
      this.showToast('La página debe ser 1 o mayor', 'warning');
    }
  }

  // ========== COMENTARIOS ==========

  addComment(event?: Event): void {
    if (event) event.preventDefault();

    // Si hay un comentario seleccionado, es edición
    if (this.selectedComment) {
      this.guardarEdicion();
      return;
    }

    // Validar y agregar nuevo comentario
    if (!this.pdfIdentifier) {
      this.showToast('No hay documento identificado', 'warning');
      return;
    }

    if (!this.validateComment()) return;

    const comment = this.createComment();
    // this.comments.push(comment);

    this.comments.update(list => [...list, comment]);
    this.resetCommentForm();

    this.saveCommentsToServer();
    this.commentAdded.emit(comment);
    this.showToast(`Comentario agregado en página ${comment.page}`, 'success');
  }

  private validateComment(): boolean {
    if (!this.newCommentText.trim() || this.newCommentText.length > 1000) {
      this.showToast('Comentario: 1-1000 caracteres', 'warning');
      return false;
    }
    if (this.manualCommentPage < 1) {
      this.showToast('Página debe ser 1 o mayor', 'warning');
      return false;
    }
    return true;
  }

  private createComment(): PdfComment {
    const user = this.authService.currentUser();
    const currentUserId = user?.id;
    const currentUsername = user?.username || this.autor;

    return {
      id: this.nextCommentId++,
      page: this.manualCommentPage,
      text: this.newCommentText,
      date: new Date(),
      color: this.selectedColor,
      autor: currentUsername,
      documentId: this.pdfIdentifier,
      esMio: true,
      usuario_id: currentUserId,
      editable: true
    };
  }

  deleteComment(comment: PdfComment): void {
    if (!this.esComentarioEditable(comment)) {
      this.showToast('Solo puedes eliminar tus propios comentarios', 'warning');
      return;
    }

    if (confirm('¿Eliminar este comentario?')) {
      // Intentar eliminar del servidor
      this.eliminarComentarioDelServidor(comment);

      // Eliminar localmente
      // this.comments = this.comments.filter(c => c.id !== comment.id);
      this.comments.update(list =>
        list.filter(c => c.id !== comment.id)
      );

      this.saveToLocalStorage();
      this.commentDeleted.emit(comment);
      this.showToast('Comentario eliminado', 'warning');
    }
  }

  private eliminarComentarioDelServidor(comment: PdfComment): void {
    // Actualizar comentarios en el servidor (el servidor manejará qué comentarios son del usuario)
    this.saveCommentsToServer();
  }

  selectComment(comment: PdfComment): void {
    this.selectedComment = comment;
    this.showCommentsPanel = true;
    setTimeout(() => this.commentTextarea?.nativeElement?.focus(), 100);
  }

  toggleCommentMode(): void {
    this.commentModeActive = !this.commentModeActive;

    this.showToast(
      this.commentModeActive ?
        `Modo comentario activado (página ${this.manualCommentPage})` :
        'Modo comentario desactivado',
      'info'
    );
  }

  toggleCommentsPanel(): void {
    this.showCommentsPanel = !this.showCommentsPanel;
    this.cdr.detectChanges();
  }

  private resetCommentForm(): void {
    this.newCommentText = '';
    this.selectedColor = this.commentColors[0];
    this.manualCommentPage = 1;
    this.commentModeActive = false;
    this.selectedComment = null;
  }

  // ========== EDICIÓN DE COMENTARIOS ==========

  editarComentario(comment: PdfComment): void {
    if (!this.esComentarioEditable(comment)) {
      this.showToast('Solo puedes editar tus propios comentarios', 'warning');
      return;
    }

    this.selectedComment = comment;
    this.newCommentText = comment.text;
    this.selectedColor = comment.color;
    this.manualCommentPage = comment.page;
    this.commentModeActive = true;

    setTimeout(() => this.commentTextarea?.nativeElement?.focus(), 100);
    this.showToast('Modo edición activado', 'info');
  }

  guardarEdicion(): void {
    if (!this.selectedComment || !this.newCommentText.trim()) {
      this.showToast('No hay comentario para editar', 'warning');
      return;
    }

    // Verificar que sea editable
    if (!this.esComentarioEditable(this.selectedComment)) {
      this.showToast('No puedes editar este comentario', 'error');
      return;
    }
    // const index = this.comments().findIndex(...)

    // Actualizar el comentario
    const index = this.comments().findIndex(c => c.id === this.selectedComment!.id);
    if (index !== -1) {
      this.comments.update(list =>
        list.map(c =>
          c.id === this.selectedComment!.id
            ? {
              ...c,
              text: this.newCommentText,
              color: this.selectedColor,
              page: this.manualCommentPage,
              date: new Date()
            }
            : c
        )
      );


      // Guardar cambios
      this.saveComments();

      // Resetear formulario
      this.cancelarEdicion();

      this.showToast('Comentario actualizado', 'success');
    }
  }

  cancelarEdicion(): void {
    this.selectedComment = null;
    this.newCommentText = '';
    this.selectedColor = this.commentColors[0];
    this.manualCommentPage = 1;
    this.commentModeActive = false;
  }

  // Verificar si un comentario es editable
  esComentarioEditable(comment: PdfComment): boolean {
    const user = this.authService.currentUser();
    const currentUserId = user?.id;

    // Si el comentario tiene usuario_id y coincide con el usuario actual
    if (comment.usuario_id && currentUserId) {
      return comment.usuario_id === currentUserId;
    }

    // Si no tiene usuario_id, verificar por esMio
    return comment.esMio === true;
  }

  // ========== FILTRADO ==========

  get filteredComments() {
    let filtered = this.comments().filter(c => c.documentId === this.pdfIdentifier);

    if (this.filterByPage) {
      filtered = filtered.filter(c => c.page === this.filterByPage);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.text.toLowerCase().includes(query) ||
        (c.autor && c.autor.toLowerCase().includes(query)) ||
        c.page.toString().includes(query)
      );
    }

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  noResults = false;
  get Results() {
    this.noResults = this.filteredComments.length === 0;
    return this.noResults;
  }

  filterByPageNumber(page: number | null): void {
    this.filterByPage = page;
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.filterByPage = null;
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  // ========== PERSISTENCIA ==========

  private autoSaveInterval: any;
  private readonly AUTO_SAVE_INTERVAL = 30000;

  private setupAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.comments.length > 0 && !this.isSaving && this.pdfIdentifier) {
        this.isSaving = true;
        this.saveCommentsToServer();
        this.isSaving = false;
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  private saveCommentsToServer(): void {
    if (!this.pdfIdentifier) {
      this.saveToLocalStorage();
      return;
    }

    const pdfUrlString = this.sanitizer.sanitize(SecurityContext.URL, this.pdfUrl) || '';
    const user = this.authService.currentUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
      this.saveToLocalStorage();
      this.showToast('No hay usuario autenticado', 'warning');
      return;
    }

    // Filtrar solo los comentarios del usuario actual
    const misComentarios = this.comments().filter(c =>
      c.usuario_id === currentUserId || c.esMio === true
    );

    if (misComentarios.length === 0) {
      return;
    }

    this.anotacionesService.guardarAnotacionesPorArchivo(
      this.pdfIdentifier,
      pdfUrlString,
      misComentarios
    ).subscribe({
      next: () => {
        console.log(' Comentarios del usuario guardados en servidor');
      },
      error: (error) => {
        console.error('Error guardando comentarios:', error);
        this.saveToLocalStorage();
        this.showToast('Guardado local por error en servidor', 'warning');
      }
    });
  }

  private loadCommentsFromServer(): void {
    if (!this.pdfIdentifier) {
      this.loadFromLocalStorage();
      return;
    }

    this.isLoading = true;

    // Obtener TODAS las anotaciones de todos los usuarios
    this.anotacionesService.obtenerTodasAnotacionesPorArchivo(this.pdfIdentifier)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Extraer TODOS los comentarios de la respuesta
            const allComments = this.extractAllCommentsFromResponse(response);

            if (allComments.length > 0) {
              this.comments.set( allComments);
              this.nextCommentId = Math.max(...this.comments().map(c => c.id), 0) + 1;
              this.commentsLoaded.emit(this.comments());

              console.log(`Cargados ${allComments.length} comentarios de todos los usuarios`);
            } else {
              this.loadFromLocalStorage();
            }
          } else {
            this.loadFromLocalStorage();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando comentarios del servidor:', error);
          this.loadFromLocalStorage();
          this.isLoading = false;
        }
      });
  }

  private extractAllCommentsFromResponse(response: any): PdfComment[] {
    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    const allComments: PdfComment[] = [];
    const user = this.authService.currentUser();
    const currentUserId = user?.id;
    const currentUsername = user?.username || this.autor;

    // Recorrer todas las anotaciones de la respuesta
    response.data.forEach((anotacion: any) => {
      if (anotacion.comentarios && Array.isArray(anotacion.comentarios)) {
        anotacion.comentarios.forEach((comment: any) => {
          const esMio = anotacion.usuario_id === currentUserId;

          allComments.push({
            id: comment.id || Date.now() + Math.random(),
            page: comment.page || 1,
            text: comment.text,
            date: new Date(comment.date || comment.created_at),
            color: comment.color || '#FFEB3B',
            autor: comment.autor || (esMio ? currentUsername : `Usuario-${anotacion.usuario_id}`),
            resolved: comment.resolved || false,
            documentId: this.pdfIdentifier,
            esMio: esMio,
            usuario_id: anotacion.usuario_id,
            editable: esMio
          });
        });
      }
    });

    return allComments;
  }

  private saveComments(): void {
    this.saveCommentsToServer();
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    if (!this.pdfIdentifier) return;

    try {
      const key = `pdfComments_${this.pdfIdentifier}`;
      localStorage.setItem(key, JSON.stringify(this.comments));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    if (!this.pdfIdentifier) {
      this.comments.set([]);
      this.nextCommentId = 1;
      return;
    }

    try {
      const key = `pdfComments_${this.pdfIdentifier}`;
      const saved = localStorage.getItem(key);

      if (saved) {
        this.comments = JSON.parse(saved).map((comment: PdfComment) => ({
          ...comment,
          date: new Date(comment.date),
          documentId: comment.documentId || this.pdfIdentifier
        }));

        this.nextCommentId = Math.max(...this.comments().map(c => c.id), 0) + 1;
        this.commentsLoaded.emit(this.comments());
      }
    } catch (error) {
      console.error('Error cargando de localStorage:', error);
      this.comments.set([]) ;
      this.nextCommentId = 1;
    }
  }

  // ========== EXTRACCIÓN NOMBRE ARCHIVO ==========
  private extractFileNameFromUrl(): void {
    if (!this.pdfUrl) {
      this.pdfIdentifier = '';
      return;
    }

    try {
      const sanitizedUrl =
        this.sanitizer.sanitize(SecurityContext.URL, this.pdfUrl) || '';

      if (!sanitizedUrl) {
        this.pdfIdentifier = 'documento.pdf';
        return;
      }

      let fileName = 'documento.pdf';

      // Intentar usar URL constructor (para URLs absolutas)
      try {
        const url = new URL(sanitizedUrl, window.location.origin);
        fileName = url.pathname.split('/').pop() || fileName;
      } catch {
        // Fallback manual si falla URL()
        fileName = sanitizedUrl.split('/').pop() || fileName;
      }

      // Eliminar parámetros si existen
      fileName = fileName.split('?')[0];

      // Decodificar por si viene con %20 etc
      fileName = decodeURIComponent(fileName);

      console.log('fileName:', fileName);

      this.pdfIdentifier = this.cleanFileName(fileName);

      this.loadCommentsFromServer();

    } catch (error) {
      console.error('Error extrayendo nombre:', error);
      this.pdfIdentifier = 'documento.pdf';
    }
  }


  // private extractFileNameFromUrl(): void {
  //   if (!this.pdfUrl) {
  //     this.pdfIdentifier = '';
  //     return;
  //   }

  //   try {
  //     const urlString = this.sanitizer.sanitize(SecurityContext.URL, this.pdfUrl) || '';
  //     if (!urlString) {
  //       this.pdfIdentifier = 'documento.pdf';
  //       return;
  //     }

  //     const url = new URL(urlString);
  //     let fileName = url.pathname.split('/').pop() || 'documento.pdf';
  //     fileName = fileName.split('?')[0];
  //     console.log("fileName")
  //     console.log(fileName)
  //     this.pdfIdentifier = this.cleanFileName(fileName);
  //     this.loadCommentsFromServer();

  //   } catch (error) {
  //     console.error('Error extrayendo nombre***:', error);
  //     this.pdfIdentifier = 'documento.pdf';
  //   }
  // }

  private cleanFileName(fileName: string): string {
    let cleanName = fileName.replace(/\.pdf\.pdf$/i, '.pdf');
    if (!cleanName.toLowerCase().endsWith('.pdf')) {
      cleanName += '.pdf';
    }
    return cleanName;
  }

  // ========== UTILIDADES ==========

  private updateCommentsAuthor(): void {
    const user = this.authService.currentUser();
    const currentUserId = user?.id;

    this.comments().forEach(comment => {
      if (comment.usuario_id === currentUserId) {
        comment.autor = this.autor;
        comment.esMio = true;
      }
    });
  }

  private resolveAutor(): string {
    const user = this.authService.currentUser();
    if (user) {
      return user.username || `Usuario-${user.id}`;
    }
    return 'Usuario';
  }

  formatTimeAgo(date: Date): string {
    const diff = new Date().getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return new Date(date).toLocaleDateString('es-ES');
  }

  // ========== NOTIFICACIONES ==========

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${colors[type]}`;
    toast.innerHTML = `<div class="flex items-center"><span>${message}</span></div>`;

    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  }

  // ========== EXPORTACIÓN ==========

  exportarAnotaciones(): void {
    if (!this.pdfIdentifier || this.comments.length === 0) {
      this.showToast('No hay comentarios para exportar', 'warning');
      return;
    }
    this.anotacionesService.descargarExportacionPorArchivo(this.pdfIdentifier, this.pdfIdentifier);
  }

  vaciarComentarios(): void {
    if (confirm('¿Vaciar todos los comentarios?')) {
      // Vaciar solo los comentarios del usuario actual
      const user = this.authService.currentUser();
      const currentUserId = user?.id;

      if (currentUserId) {
        this.comments.set( this.comments().filter(c => c.usuario_id !== currentUserId));
      } else {
        this.comments .set([])
      }

      this.saveToLocalStorage();
      this.saveCommentsToServer();
      this.showToast('Comentarios vaciados', 'success');
    }
  }
}