import { Injectable, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ToastState, ContextMenuState, Breadcrumb } from '../models/explorador-state.model';
import { AutorizacionTreeNode } from '../../../../../core/models/autorizacion-tree.model';

@Injectable()
export class ExploradorStateService {
  private _tree = signal<AutorizacionTreeNode[]>([]);
  private _selectedNode = signal<AutorizacionTreeNode | null>(null);
  private _breadcrumbs = signal<Breadcrumb[]>([]);
  private _activeTab = signal<'preview' | 'metadata' | 'security' | 'notes' | 'history'>('metadata');
  private _pdfUrl = signal<SafeResourceUrl | null>(null);
  private _contextMenu = signal<ContextMenuState>({ visible: false, x: 0, y: 0, node: null });
  private _toast = signal<ToastState>({ visible: false, message: '', type: 'success' });

  tree = this._tree.asReadonly();
  selectedNode = this._selectedNode.asReadonly();
  breadcrumbs = this._breadcrumbs.asReadonly();
  activeTab = this._activeTab.asReadonly();
  pdfUrl = this._pdfUrl.asReadonly();
  contextMenu = this._contextMenu.asReadonly();
  toast = this._toast.asReadonly();

  constructor(private sanitizer: DomSanitizer) { }

  updateTree(tree: AutorizacionTreeNode[]): void {
    this._tree.set(tree);
  }

  selectNode(node: AutorizacionTreeNode, closeMenu: boolean = true): void {
    this._selectedNode.set(node);
    this.updateBreadcrumbs(node);

    if (closeMenu) {
      this.closeContextMenu();
    }
  }


  setActiveTab(tab: 'preview' | 'metadata' | 'security' | 'notes' | 'history'): void {
    this._activeTab.set(tab);
  }

  showContextMenu(mouseEvent: MouseEvent, node: AutorizacionTreeNode): void {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    this._contextMenu.set({
      visible: true,
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      node
    });

  
    this._selectedNode.set(node);
    this.updateBreadcrumbs(node);
  }



  closeContextMenu(): void {
    this._contextMenu.update(menu => ({ ...menu, visible: false }));
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this._toast.set({ visible: true, message, type });

    setTimeout(() => {
      this.closeToast();
    }, 3000);
  }

  closeToast(): void {
    this._toast.update(toast => ({ ...toast, visible: false }));
  }

  clearSelection(): void {
    this._selectedNode.set(null);
    this._breadcrumbs.set([]);
    this._pdfUrl.set(null);
  }

  private updateBreadcrumbs(node: AutorizacionTreeNode | null): void {
    if (!node) {
      this._breadcrumbs.set([]);
      return;
    }

    const path = this.findPathToNode(this._tree(), node);

    if (path) {
      const crumbs = path.map(item => ({
        name: item.nombre || 'Sin nombre',
        node: item
      }));
      this._breadcrumbs.set(crumbs);
    } else {
      this._breadcrumbs.set([]);
    }
  }

  private findPathToNode(nodes: AutorizacionTreeNode[], targetNode: AutorizacionTreeNode): AutorizacionTreeNode[] | null {
    for (const node of nodes) {
      if (node.id === targetNode.id) {
        return [node];
      }

      if (node.children && node.children.length > 0) {
        const childPath = this.findPathToNode(node.children, targetNode);
        if (childPath) {
          return [node, ...childPath];
        }
      }
    }
    return null;
  }

  getSelectedNodeIcon(node: AutorizacionTreeNode): string {
    const iconMap = {
      'municipio': '/assets/icons/folder.svg',
      'tipo': '/assets/icons/file.svg',
      'autorizacion': '/assets/icons/pdf.svg'
    };

    return iconMap[node.type] || '/assets/icons/folder.svg';
  }
}