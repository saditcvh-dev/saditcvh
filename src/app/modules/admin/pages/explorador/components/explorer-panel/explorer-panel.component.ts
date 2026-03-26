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
    // que seleccione el nodo correspondiente. Si el nodo no está en el árbol
    // cargado (paginación), activamos una búsqueda en backend para cargarlo.
    this.route.queryParams.subscribe(params => {
      const carpeta = params['q'];
      if (carpeta) {
        this.state.selectNodeByQuery(carpeta, () => {
          // Nodo no encontrado en el árbol actual → buscarlo en el backend
          console.log(`[redirect] Nodo '${carpeta}' no en árbol. Buscando en backend...`);
          this.autorizacionService.setFiltros({ search: carpeta });
        });
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

  /* =======================
  * Municipio filter (lazy load)
  * ======================= */
  activeMunicipio = signal<AutorizacionTreeNode | null>(null);

  onNodeSelected(node: AutorizacionTreeNode): void {
    if (node.type === 'municipio') {
      // Lazy load: filter autorizaciones for this specific municipio
      this.activeMunicipio.set(node);
      this.autorizacionService.setFiltros({ municipioId: node.data.id } as any);
    }
    this.nodeSelected.emit(node);
  }

  clearMunicipioFilter(): void {
    this.activeMunicipio.set(null);
    this.autorizacionService.setFiltros(null);
    this.filterText.set('');
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
  pagination = this.autorizacionService.pagination;
  loading = this.autorizacionService.loading;
  hasNextPage = computed(() => this.pagination().page < this.pagination().totalPages);

  loadMore(): void {
    this.autorizacionService.cargarMas();
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
