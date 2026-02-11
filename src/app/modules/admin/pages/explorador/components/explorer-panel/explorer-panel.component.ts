import { Component, computed, effect, HostListener, inject, input, output, signal } from "@angular/core";
import { AutorizacionTreeNode } from "../../../../../../core/models/autorizacion-tree.model";
import { AutorizacionService } from "../../../../../../core/services/explorador-autorizacion.service";
import { ActivatedRoute } from "@angular/router";
import { ExploradorStateService } from "../../services/explorador-state.service";
import { AutorizacionTreeService } from "../../../../../../core/services/explorador-autorizacion-tree.service";
import { delay, filter } from "rxjs";

@Component({
  selector: 'app-explorer-panel', standalone: false,
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

  private route = inject(ActivatedRoute);
  private state = inject(ExploradorStateService);
  private treeService = inject(AutorizacionTreeService);
  toggle = output<void>();
  nodeSelected = output<AutorizacionTreeNode>();
  nodeRightClick = output<{ mouseEvent: MouseEvent; node: AutorizacionTreeNode }>();
  private searchTriggered = signal(false);
  isLoading = signal(false);
  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      const carpeta = params['q'];
      if (carpeta) {
        this.buscarYSeleccionarNodo(carpeta);
      }
    });

    // Escuchar resultados de búsqueda
    this.autorizacionService.autorizaciones$
      .pipe(
        filter(list => Array.isArray(list) && list.length > 0),
        filter(() => this.searchTriggered())
      )
      .subscribe(list => {
        if (list.length < 2) {
          const primera = list[0];
          const nombreCarpeta = primera.nombreCarpeta;

          if (nombreCarpeta) {
            this.buscarYSeleccionarNodo(nombreCarpeta);
          }
        }
        this.searchTriggered.set(false);
      });

  }



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
      this.searchTriggered.set(false);
      return;
    }

    this.searchTriggered.set(true);
    this.autorizacionService.setFiltros({ search: value });
  }



  /* =======================
  * Helpers
  * ======================= */
  private buscarYSeleccionarNodo(query: string) {

    const trySearch = () => {
      const tree = this.state.tree();

      if (!tree || tree.length === 0) return false;

      const path = this.findNodePath(tree, query);

      if (!path) return false;

      // Expandir toda la ruta
      for (const node of path) {
        node._open = true;
      }

      const targetNode = path[path.length - 1];

      this.state.selectNode(targetNode, true, true);
      this.autorizacionService.setFiltros({
        search: query,
      });

      return true;
    };

    if (trySearch()) return;
    const interval = setInterval(() => {
      if (trySearch()) {
        clearInterval(interval);
      }
    }, 100);
  }

  private findNodePath(
    nodes: AutorizacionTreeNode[],
    query: string,
    path: AutorizacionTreeNode[] = []
  ): AutorizacionTreeNode[] | null {

    const normalizedQuery = query.trim().toLowerCase();

    for (const node of nodes) {

      const newPath = [...path, node];
      const matchByNombre = node.nombre?.toLowerCase() === normalizedQuery;
      const matchById = node.id?.toLowerCase() === normalizedQuery;

      const matchByCarpeta =
        node.type === 'autorizacion' &&
        node.data?.nombreCarpeta?.toLowerCase() === normalizedQuery;

      if (matchByNombre || matchById || matchByCarpeta) {
        return newPath;
      }

      if (node.children && node.children.length > 0) {
        const result = this.findNodePath(node.children, query, newPath);
        if (result) return result;
      }
    }

    return null;
  }

  resetExplorer(): void {
    this.isLoading.set(true);

    setTimeout(() => {
      // limpiar input
      this.filterText.set('');

      this.autorizacionService.setFiltros(null);
      this.searchTriggered.set(false);
      this.floatingState.set(null);

      const closeTree = (nodes: AutorizacionTreeNode[]) => {
        for (const node of nodes) {
          node._open = false;
          if (node.children?.length) {
            closeTree(node.children);
          }
        }
      };
      closeTree(this.state.tree());

      this.isLoading.set(false);
    }, 200); 
  }
  clearInput(): void {
    this.filterText.set('');
    this.autorizacionService.setFiltros(null);
    this.searchTriggered.set(false);
  }

}
