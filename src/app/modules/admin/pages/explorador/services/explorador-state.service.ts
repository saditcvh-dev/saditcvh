import { Injectable, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ToastState, ContextMenuState, Breadcrumb } from '../models/explorador-state.model';
import { AutorizacionTreeNode } from '../../../../../core/models/autorizacion-tree.model';
import { ViewerTab } from '../../../../../core/helpers/tabs-permissions.helper';

@Injectable()
export class ExploradorStateService {
  private _tree = signal<AutorizacionTreeNode[]>([]);
  private _selectedNode = signal<AutorizacionTreeNode | null>(null);
  private _breadcrumbs = signal<Breadcrumb[]>([]);
  private _activeTab = signal<ViewerTab>('metadata');
  private _pdfUrl = signal<SafeResourceUrl | null>(null);
  private _contextMenu = signal<ContextMenuState>({ visible: false, x: 0, y: 0, node: null });
  private _toast = signal<ToastState>({ visible: false, message: '', type: 'success' });
  private _selectedNodeId = signal<string | null>(null);

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

  selectNode(node: AutorizacionTreeNode, closeMenu: boolean = true, expand: boolean = false
  ): void {
    // console.log("node")
    // console.log(node)
    this._selectedNode.set(node);
    this.updateBreadcrumbs(node);

    if (expand && node.children) {
      node._open = true;
    }

    if (closeMenu) {
      this.closeContextMenu();
    }
  }


  setActiveTab(tab: ViewerTab): void {
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
    }, 5000);
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

  /**
   * Busca en el árbol un nodo cuyo nombre/id/carpeta coincida con la cadena
   * y, cuando lo encuentra, lo selecciona y expande la ruta completa. Si
   * el árbol aún no se ha cargado se vuelve a intentar cada 100 ms hasta que
   * esté disponible.
   */
  selectNodeByQuery(query: string, onNotFound?: () => void): void {
    if (!query) return;

    let retries = 0;
    const maxRetries = 50; // 5 segundos maximo (50 * 100ms)
    let refreshTriggered = false;

    const trySelect = (): boolean => {
      const tree = this._tree();
      if (!tree || tree.length === 0) {
        return false; // keep waiting for first tree load
      }

      const path = this.findNodePathByQuery(tree, query);

      if (!path) {
        // el nodo no existe en el árbol actual
        if (!refreshTriggered && onNotFound) {
          console.log(`[selectNodeByQuery] Nodo '${query}' no encontrado. Recargando datos...`);
          refreshTriggered = true;
          onNotFound();
          return false; // Seguir intentando mientras carga
        } else if (retries >= maxRetries) {
          console.warn(`[selectNodeByQuery] Nodo '${query}' no existe en el árbol tras 5s de espera.`);
          this.clearSelection();
          this.showToast(`No se encontró el nodo '${query}' en el explorador`, 'error');
          return true; // Stop retrying
        }
        return false; // Sigue buscando en el siguiente intervalo
      }

      // nodo encontrado
      for (const node of path) {
        node._open = true;
      }

      const target = path[path.length - 1];
      this.selectNode(target, true, true);
      return true; // stop retrying
    };

    if (trySelect()) {
      return;
    }

    const interval = setInterval(() => {
      retries++;
      if (trySelect()) {
        clearInterval(interval);
      }
    }, 100);
  }

  private findNodePathByQuery(
    nodes: AutorizacionTreeNode[],
    query: string,
    path: AutorizacionTreeNode[] = []
  ): AutorizacionTreeNode[] | null {
    const normalized = query.trim().toLowerCase();

    for (const node of nodes) {
      const newPath = [...path, node];
      const matchByNombre = node.nombre?.toLowerCase() === normalized;
      const matchById = node.id?.toLowerCase() === normalized;
      const matchByCarpeta =
        node.type === 'autorizacion' &&
        node.data?.nombreCarpeta?.toLowerCase() === normalized;

      if (matchByNombre || matchById || matchByCarpeta) {
        return newPath;
      }

      if (node.children && node.children.length > 0) {
        const result = this.findNodePathByQuery(node.children, query, newPath);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }
}
