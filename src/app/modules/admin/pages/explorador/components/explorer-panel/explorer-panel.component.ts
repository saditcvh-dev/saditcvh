import { Component, computed, HostListener, inject, input, output, signal } from "@angular/core";
import { AutorizacionTreeNode } from "../../../../../../core/models/autorizacion-tree.model";
import { AutorizacionService } from "../../../../../../core/services/explorador-autorizacion.service";

@Component({
  selector: 'app-explorer-panel',  standalone: false,
  templateUrl: './explorer-panel.component.html',
  styleUrls: ['./explorer-panel.component.css']
})
export class ExplorerPanelComponent {

  /* =======================
   * Inputs / Outputs
   * ======================= */
  tree = input<AutorizacionTreeNode[]>([]);
  selectedNode = input<AutorizacionTreeNode | null>(null);
  collapsed = input(false);

  toggle = output<void>();
  nodeSelected = output<AutorizacionTreeNode>();
  nodeRightClick = output<{ mouseEvent: MouseEvent; node: AutorizacionTreeNode }>();

  /* =======================
   * State (Signals)
   * ======================= */
  private autorizacionService = inject(AutorizacionService);
  filterText = signal('');     

  floatingState = signal<{
    node: AutorizacionTreeNode | null;
    x: number;
    y: number;
  } | null>(null);

  /* =======================
   * Computed
   * ======================= */
  filteredTree = computed(() => {
    return this.tree();
  });


  /* =======================
   * Events
   * ======================= */
  @HostListener('document:click', ['$event'])
  closeFloating(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.floating-node') || target.closest('[data-tree-node]')) {
      return;
    }
    this.floatingState.set(null);
  }

  onNodeSelected(node: AutorizacionTreeNode): void {
    this.nodeSelected.emit(node);
  }

  onNodeRightClick(event: { mouseEvent: MouseEvent; node: AutorizacionTreeNode }): void {
    this.nodeRightClick.emit(event);
  }

  /* =======================
   * Input handling
   * ======================= */
onInputChange(event: Event): void {
  console.log("clic")
  const value = (event.target as HTMLInputElement).value;
  this.filterText.set(value);

  if (!value.trim()) {
    this.autorizacionService.setFiltros(null);
  }
}

onEnterSearch(): void {
  const value = this.filterText().trim().toLowerCase();

  if (!value) {
    this.autorizacionService.setFiltros(null);
    return;
  }

  this.autorizacionService.setFiltros({
    search: value
  });
}


  /* =======================
   * Helpers
   * ======================= */
  // private filterNodes(
  //   nodes: AutorizacionTreeNode[],
  //   text: string
  // ): AutorizacionTreeNode[] {
  //   return nodes
  //     .map(node => {
  //       const children = node.children
  //         ? this.filterNodes(node.children, text)
  //         : [];

  //       const matches = node.nombre.toLowerCase().includes(text);

  //       if (matches || children.length > 0) {
  //         return { ...node, children };
  //       }

  //       return null;
  //     })
  //     .filter(Boolean) as AutorizacionTreeNode[];
  // }
}
