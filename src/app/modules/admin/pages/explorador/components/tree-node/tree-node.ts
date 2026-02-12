import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';

export interface FloatingTreeState {
  visible: boolean;
  x: number;
  y: number;
  node: AutorizacionTreeNode | null;
}


@Component({
  selector: 'app-tree-node',
  standalone: false,
  templateUrl: './tree-node.html'
})
export class TreeNodeComponent {
  @Input() node!: AutorizacionTreeNode;
  @Input() selectedNode!: AutorizacionTreeNode | null;

  @Output() nodeSelected = new EventEmitter<AutorizacionTreeNode>();
  @Output() nodeRightClick = new EventEmitter<{ mouseEvent: MouseEvent, node: AutorizacionTreeNode }>();
  @Input() collapsed = false;
  @Input() floatingNodeId: string | null = null;
  @Output() floatingChange = new EventEmitter<string | null>();
  floatingPosition: { x: number; y: number } | null = null;
  // isFloatingOpen = false;
  @Output() floatingOpen = new EventEmitter<{
    node: AutorizacionTreeNode;
    x: number;
    y: number;
  }>();

  @Output() openFloating = new EventEmitter<{
    node: AutorizacionTreeNode;
    event: MouseEvent;
  }>();

  toggle(event: MouseEvent, n: AutorizacionTreeNode) {
    event.stopPropagation();
    if (n.children?.length) {
      n._open = !n._open;
    }
    this.nodeSelected.emit(n);
  }

  onRightClick(event: MouseEvent, n: AutorizacionTreeNode) {
    event.preventDefault();
    this.nodeRightClick.emit({ mouseEvent: event, node: n });
  }

  onChildSelected(childNode: AutorizacionTreeNode) {
    this.nodeSelected.emit(childNode);
  }

  onChildRightClick(event: { mouseEvent: MouseEvent, node: AutorizacionTreeNode }) {
    this.nodeRightClick.emit(event);
  }

  getIcon(n: AutorizacionTreeNode): string {
    if (n.icon) {
      return n.icon;
    }

    switch (n.type) {
      case 'municipio':
      case 'tipo': // o cualquier tipo que sea carpeta
        return n._open
          ? '/assets/icons/folder-open.svg'
          : '/assets/icons/folder.svg';
      case 'autorizacion':
        return '/assets/icons/file-document.svg';

      default:
        return '/assets/icons/folder.svg';
    }
  }

  onIconClick(event: MouseEvent, node: AutorizacionTreeNode) {
    event.stopPropagation();

    if (this.collapsed) {
      this.onNodeClick(event, node);
    } else {
      this.toggle(event, node);
    }
  }

  getChildCount(node: AutorizacionTreeNode): number {
    return node.children?.length || 0;
  }
onNodeClick(event: MouseEvent, n: AutorizacionTreeNode) {
  event.stopPropagation();
  event.preventDefault();

  if (this.collapsed && n.children?.length) {
    this.floatingOpen.emit({
      node: n,
      x: event.clientX,
      y: event.clientY
    });
    return;
  }

  if (!this.collapsed && n.children?.length) {
    n._open = !n._open;
  }

  this.nodeSelected.emit(n);
}

@HostListener('document:click', ['$event'])
onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (this.collapsed && this.floatingNodeId) {
    // si el click fue dentro del flotante o del nodo, no cerrar
    if (target.closest('.floating-node') || target.closest('[data-tree-node]')) {
      return;
    }

    this.floatingChange.emit(null);
    this.floatingPosition = null;
  }
}


openInNewWindow(node: AutorizacionTreeNode) {
  console.log(node);

  const sanitized = node.nombre.replace(/[\s-]/g, '_');

  const url = `/admin/explorador?q=${sanitized}`;
  window.open(url, '_blank');
}



}