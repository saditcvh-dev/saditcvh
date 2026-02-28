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

    // cuando el valor `q` cambia en la URL, pedimos al servicio de estado
    // que seleccione el nodo correspondiente. el servicio ya sabe esperar
    // a que el árbol esté cargado.
    this.route.queryParams.subscribe(params => {
      const carpeta = params['q'];
      if (carpeta) {
        this.state.selectNodeByQuery(carpeta);
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
            this.state.selectNodeByQuery(nombreCarpeta);
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
  // ya no necesitamos la lógica local para encontrar nodos; el servicio de
  // estado cuenta con un método dedicado.


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
