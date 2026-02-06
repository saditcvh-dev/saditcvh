import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { AutocompleteItem, BusquedaService } from '../../../../core/services/busqueda';
interface ResultadoBusqueda {
  tipo: 'autorizacion' | 'documento' | 'archivo';
  id: number;
  ubicacion?: string;
  data: any;
}

interface BusquedaResponse {
  success: boolean;
  mensaje: string;
  data: {
    total: number;
    paginaActual: number;
    totalPaginas: number;
    resultados: ResultadoBusqueda[];
  };
}
interface DashboardData {
  total_pdfs: number;
  estados: {
    completados: number;
    procesando: number;
    en_cola: number;
    con_error: number;
  };
  pdfs: Array<{
    numero: number;
    nombre_archivo: string;
    tamaño_mb: number;
    estado: string;
    progreso: string;
    paginas: number;
    fecha_subida: string;
    id_interno: string;
  }>;
}

@Component({
  selector: 'app-busqueda',
  standalone: false,
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.css',
})
export class Busqueda implements OnInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();
  private http = inject(HttpClient);
  @Output() searchSubmit = new EventEmitter<string>();

  @Input() searchTerm: string = '';
  @Input() isVisible: boolean = false;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('modalInput') modalInput!: ElementRef;

  dashboardData: DashboardData | null = null;
  busquedaData: BusquedaResponse | null = null;
  recentSearches: Array<{ term: string, count: number }> = [];
  loading = false;
  error: string | null = null;
  autocompleteResults: AutocompleteItem[] = [];
showAutocomplete = false;
private busquedaService = inject(BusquedaService);

  ngOnInit() {
    // Cargar datos recientes locales
    this.loadRecentSearches();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible']?.currentValue === true) {
      this.loadDashboardData();
      setTimeout(() => {
        this.modalInput?.nativeElement.focus();
      }, 150);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
onInputChange(value: string) {
  this.searchTerm = value;
  this.searchTermChange.emit(value);

  if (value.length < 2) {
    this.autocompleteResults = [];
    this.showAutocomplete = false;
    return;
  }

  this.busquedaService.autocomplete(value)
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.autocompleteResults = res.data;
      this.showAutocomplete = true;
    });
}
  // onInputChange(value: string) {
  //   this.searchTerm = value;
  //   this.searchTermChange.emit(value);
  // }

  closeModal() {
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('search-modal-overlay')) {
      this.closeModal();
    }
  }

  async loadDashboardData() {
    this.loading = true;
    this.error = null;

    try {
      // CONECTA CON TU ENDPOINT REAL /api/pdf/dashboard
      const response = await this.http.get<DashboardData>('/api/pdf/dashboard').pipe(
        takeUntil(this.destroy$)
      ).toPromise();

      this.dashboardData = response || {
        total_pdfs: 0,
        estados: { completados: 0, procesando: 0, en_cola: 0, con_error: 0 },
        pdfs: []
      };

    } catch (error: any) {
      console.error('Error cargando dashboard:', error);
      this.error = 'Error al cargar documentos';
      this.dashboardData = null;
    } finally {
      this.loading = false;
    }
  }

  loadRecentSearches() {
    // Simular búsquedas recientes (puedes guardar en localStorage)
    // this.recentSearches = [
    //   { term: 'Contrato 2026-001', count: 23 },
    //   { term: 'Juan Pérez', count: 8 },
    //   { term: 'Factura enero', count: 15 },
    //   { term: 'Serie A-2026', count: 42 },
    //   { term: 'OC-56789', count: 3 },
    //   { term: 'Revisión técnica', count: 19 }
    // ];
  }

  onRecentSearch(term: string) {
    this.searchTerm = term;
    this.searchTermChange.emit(term);
    // Opcional: guardar en localStorage para persistencia
  }

  openPdf(pdf: any) {
    // Navegar al PDF o abrir modal específico
    window.open(`/api/pdf/${pdf.id_interno}/searchable-pdf`, '_blank');
  }

  getStatusText(status: string): string {
    return status.replace(/[⏳✅❌⏸️]/g, '').trim();
  }

  getProgressValue(progreso: string): number {
    return parseInt(progreso?.replace('%', '') || '0', 10);
  }

  trackByPdf(index: number, pdf: any): any {
    return pdf.id_interno || index;
  }
  selectAutocomplete(item: AutocompleteItem) {
  this.searchTerm = item.value || item.label;
  this.searchTermChange.emit(this.searchTerm);

  this.showAutocomplete = false;
  this.autocompleteResults = [];

  // Dispara búsqueda real
  this.onSearchEnter();
}
  onSearchEnter() {
    const term = this.searchTerm?.trim();
    if (!term) return;

    this.searchTermChange.emit(term);
    this.searchSubmit.emit(term); // ⬅ comunica al padre

    this.loading = true;

this.busquedaService.buscar(term)
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (data: BusquedaResponse) => {
      this.busquedaData = data;
    },
    error: () => {
      this.error = 'No se encontraron resultados';
    },
    complete: () => {
      this.loading = false;
    }
  });
  }
get autorizaciones() {
  return this.busquedaData?.data?.resultados
    ?.filter(r => r.tipo === 'autorizacion');
}

get documentos() {
  return this.busquedaData?.data?.resultados
    ?.filter(r => r.tipo === 'documento');
}

get archivos() {
  return this.busquedaData?.data?.resultados
    ?.filter(r => r.tipo === 'archivo');
}
  // onSearchEnter() {
  //   const term = this.searchTerm?.trim();

  //   if (!term) return;

  //   // 1️⃣ Mantener sincronizado el texto
  //   this.searchTermChange.emit(term);

  //   // 2️⃣ Disparar búsqueda avanzada
  //   this.searchSubmit.emit(term);

  //   // (opcional) cerrar modal
  //   // this.closeModal();
  // }


}
