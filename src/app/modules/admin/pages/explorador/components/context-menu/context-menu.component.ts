import { Component, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef, inject } from '@angular/core';
import { ContextMenuState } from '../../models/explorador-state.model';
import { AuthService } from '../../../../../../core/services/auth';
import { MunicipioService } from '../../../../../../core/services/explorador-municipio.service';

@Component({
  selector: 'app-context-menu',
  standalone: false,
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {
  @Input() contextMenu!: ContextMenuState;
  @Output() action = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('menuContainer') menuContainer!: ElementRef;
  private authService = inject(AuthService);
  private municipioService = inject(MunicipioService);
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.contextMenu || !this.contextMenu.visible) return;

    if (
      this.menuContainer &&
      !this.menuContainer.nativeElement.contains(event.target as Node)
    ) {
      this.close.emit();
    }
  }
  get isAdmin(): boolean {
    return this.authService.currentUser()?.roles?.includes('administrador') ?? false;
  }



  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.contextMenu.visible) {
      this.close.emit();
    }
  }



  onAction(actionType: string): void {
    this.action.emit(actionType);
  }

  canUpload(node: any): boolean {
    if (this.isAdmin) return true;
    if (!node) return false;
    
    let municipioId = null;
    if (node.type === 'autorizacion') {
      municipioId = node.data?.municipioId || node.data?.municipio?.id;
    } else if (node.type === 'municipio') {
      municipioId = node.data?.id;
    }

    if (!municipioId) return false;
    const territorio = this.municipioService.municipios().find(m => m.id === municipioId);
    const permisos = territorio?.permisos;
    
    if (!permisos || !Array.isArray(permisos)) return false;
    return permisos.includes('subir');
  }

  shouldShowAction(actionType: string): boolean {
    if (!this.contextMenu.node) return false;

    const node = this.contextMenu.node;

    switch (actionType) {
      case 'add_documento':
        return node.type === 'autorizacion' && this.canUpload(node);

      case 'add_autorizacion':
        return (node.type === 'municipio' || node.type === 'tipo') && this.canUpload(node);

      case 'delete':
        return node.type === 'autorizacion' && this.isAdmin;

      case 'security':
      case 'open':
        return true;

      default:
        return false;
    }
  }
}
