// import { Component, Input, Output, EventEmitter, HostListener, inject } from '@angular/core';
// import { AutorizacionTreeNode } from '../../../../../../core/models/autorizacion-tree.model';
// import { AutorizacionService } from '../../../../../../core/services/explorador-autorizacion.service';
// // import { FloatingMenuState } from '../tree-node/tree-node';
// // import { AutorizacionTreeNode } from '../../../../core/models/autorizacion-tree.model';

// @Component({
//   selector: 'app-explorer-panel', standalone: false,
//   templateUrl: './explorer-panel.component.html',
//   styleUrls: ['./explorer-panel.component.css']
// })
// export class ExplorerPanelComponent {
//   @Input() tree: AutorizacionTreeNode[] = [];
//   @Input() selectedNode: AutorizacionTreeNode | null = null;
//   @Input() collapsed = false;
//   @Output() toggle = new EventEmitter<void>();
//   floatingNodeId: string | null = null;
//   floatingState: {
//     node: AutorizacionTreeNode | null;
//     x: number;
//     y: number;
//   } | null = null;
//   filterText = '';
//   private autorizacionService = inject(AutorizacionService);

//   @Output() nodeSelected = new EventEmitter<AutorizacionTreeNode>();
//   @Output() nodeRightClick = new EventEmitter<{ mouseEvent: MouseEvent, node: AutorizacionTreeNode }>();
//   // floatingNodeId: string | null = null;
//   floatingPosition = { x: 0, y: 0 };
//   @HostListener('document:click', ['$event'])
//   closeFloating(event: MouseEvent) {
//     const target = event.target as HTMLElement;
//     if (target.closest('.floating-node') || target.closest('[data-tree-node]')) {
//       return;
//     }
//     this.floatingState = null;
//   }

//   onNodeSelected(node: AutorizacionTreeNode): void {
//     // console.log("node")
//     // console.log(node)
//     this.nodeSelected.emit(node);
//   }

//   onNodeRightClick(event: { mouseEvent: MouseEvent; node: AutorizacionTreeNode }): void {
//     // console.log("onNodeRightClick")
//     this.nodeRightClick.emit(event);
//   }
//   onFilterChange(event: Event) {
//     console.log("SSS  ")
//     const value = (event.target as HTMLInputElement).value;
//     this.filterText = value.toLowerCase();
//   }
//   get filteredTree(): AutorizacionTreeNode[] {
//     if (!this.filterText) {
//       return this.tree;
//     }

//     return this.filterNodes(this.tree, this.filterText);
//   }
//   private filterNodes(
//     nodes: AutorizacionTreeNode[],
//     text: string
//   ): AutorizacionTreeNode[] {
//     return nodes
//       .map(node => {
//         const children = node.children
//           ? this.filterNodes(node.children, text)
//           : [];

//         const matches =
//           node.nombre.toLowerCase().includes(text);

//         if (matches || children.length > 0) {
//           return {
//             ...node,
//             children
//           };
//         }

//         return null;
//       })
//       .filter(Boolean) as AutorizacionTreeNode[];
//   }

//   appliedFilter = ''; // ← este sí filtra el árbol
//   onEnterSearch(): void {
//     const value = this.filterText.trim().toLowerCase();

//     if (!value) {
//       // Limpia todo
//       this.appliedFilter = '';
//       this.autorizacionService.setFiltros(null);
//       return;
//     }

//     // Aplica el filtro SOLO aquí
//     this.appliedFilter = value;

//     this.autorizacionService.setFiltros({
//       search: value
//     });
//   }
//   onInputChange(event: Event): void {
//     this.filterText = (event.target as HTMLInputElement).value;
//   }
// }