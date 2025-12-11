import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-tree-node',
  standalone: false,
  templateUrl: './tree-node.html'
})
export class TreeNodeComponent {
  @Input() node: any;
  @Input() selectedNode: any;

  // Eventos hacia el padre
  @Output() nodeSelected = new EventEmitter<any>();
  @Output() nodeRightClick = new EventEmitter<{ mouseEvent: MouseEvent, node: any }>(); // << NUEVO

  toggle(event: MouseEvent, n: any) {
    event.stopPropagation();
    if (n.children?.length) {
      n._open = !n._open;
    }
    this.nodeSelected.emit(n);
  }

  // DETECTAR CLIC DERECHO
  onRightClick(event: MouseEvent, n: any) {
    // Evita que salga el menú normal del navegador
    event.preventDefault();

    // Avisa al padre (expedientes.view) que muestre TU menú
    this.nodeRightClick.emit({ mouseEvent: event, node: n });
  }

  // PASAR EVENTOS DE HIJOS HACIA ARRIBA
  onChildSelected(childNode: any) {
    this.nodeSelected.emit(childNode);
  }

  onChildRightClick(event: { mouseEvent: MouseEvent, node: any }) {
    this.nodeRightClick.emit(event);
  }

  getIcon(n: any): string {
    // 1. Si es un documento explícito, poner icono de PDF/File
    if (n.type === 'documento' || n.filename?.endsWith('.pdf')) {
      return '/assets/icons/pdf.svg';
    }

    // 2. Si NO es documento (es fondo, sección, serie, expediente...), poner icono de Carpeta
    // Independientemente de si tiene hijos o no.
    return n._open
      ? '/assets/icons/folder-open.svg'
      : '/assets/icons/folder.svg';
  }
}
