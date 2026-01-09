import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';

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


  getChildCount(node: AutorizacionTreeNode): number {
    return node.children?.length || 0;
  }
}