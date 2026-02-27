import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { AutocompleteItem, BusquedaService } from '../../../../core/services/busqueda';
import { BusquedaResponse, DashboardData, ResultadoBusqueda } from '../../../../core/models/busqueda.model';
import { signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-busqueda',
  standalone: false,
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.css',
})
export class Busqueda implements OnInit, OnChanges, OnDestroy {
  
// export class Busqueda implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private http = inject(HttpClient);
  @Output() searchSubmit = new EventEmitter<string>();

  // Signals para las propiedades
  searchTerm = signal('');
  isVisible = signal(false);

  @Input() 
  set searchTermInput(value: string) {
    this.searchTerm.set(value);
  }

  @Input()
  set isVisibleInput(value: boolean) {
    this.isVisible.set(value);
  }

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('modalInput') modalInput!: ElementRef;
  @Output() resultSelected = new EventEmitter<ResultadoBusqueda>();
  
  // Signals para el estado
  dashboardData = signal<DashboardData | null>(null);
  busquedaData = signal<BusquedaResponse | null>(null);
  recentSearches = signal<Array<{ term: string, count: number }>>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  autocompleteResults = signal<AutocompleteItem[]>([]);
  showAutocomplete = signal(false);
  
  private busquedaService = inject(BusquedaService);
  private router = inject(Router);

  // Computed properties
  autorizaciones = computed(() => {
    return this.busquedaData()?.data?.resultados
      ?.filter(r => r.tipo === 'autorizacion') || [];
  });

  documentos = computed(() => {
    return this.busquedaData()?.data?.resultados
      ?.filter(r => r.tipo === 'documento') || [];
  });

  archivos = computed(() => {
    return this.busquedaData()?.data?.resultados
      ?.filter(r => r.tipo === 'archivo') || [];
  });

  // Effect para manejar el foco cuando se abre el modal
  private modalEffect = effect(() => {
    if (this.isVisible()) {
      this.loadDashboardData();
      setTimeout(() => {
        this.modalInput?.nativeElement.focus();
      }, 150);
    }
  });

  ngOnInit() {
    // Cargar datos recientes locales
    this.loadRecentSearches();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible']?.currentValue === true) {
      this.loadDashboardData();
      setTimeout(() => {
        this.modalInput?.nativeElement.focus();
      }, 150);
    }
  }
  onInputChange(value: string) {
    this.searchTerm.set(value);
    this.searchTermChange.emit(value);

    if (value.length < 2) {
      this.autocompleteResults.set([]);
      this.showAutocomplete.set(false);
      return;
    }

    this.busquedaService.autocomplete(value)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.autocompleteResults.set(res.data);
        this.showAutocomplete.set(true);
      });
  }

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
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.http.get<DashboardData>('/api/pdf/dashboard').pipe(
        takeUntil(this.destroy$)
      ).toPromise();

      this.dashboardData.set(response || {
        total_pdfs: 0,
        estados: { completados: 0, procesando: 0, en_cola: 0, con_error: 0 },
        pdfs: []
      });

    } catch (error: any) {
      console.error('Error cargando dashboard:', error);
      this.error.set('Error al cargar documentos');
      this.dashboardData.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  loadRecentSearches() {
    // Simular búsquedas recientes
    // this.recentSearches.set([
    //   { term: 'Contrato 2026-001', count: 23 },
    //   { term: 'Juan Pérez', count: 8 },
    //   { term: 'Factura enero', count: 15 },
    //   { term: 'Serie A-2026', count: 42 },
    //   { term: 'OC-56789', count: 3 },
    //   { term: 'Revisión técnica', count: 19 }
    // ]);
  }

  onRecentSearch(term: string) {
    this.searchTerm.set(term);
    this.searchTermChange.emit(term);
  }

  verEnExplorador(idOrFileName: string) {
    if (!idOrFileName) return;
    // Quita extensión si existe: "archivo.pdf" → "archivo"
    const sinExtension = idOrFileName.replace(/\.[^.]+$/, '');
    // Quita el hash hexadecimal al final: "556_01_11_22_222_C_c7226321" → "556_01_11_22_222_C"
    const carpeta = sinExtension.replace(/_[a-f0-9]{8,}$/i, '');
    this.closeModal();
    this.router.navigate(['/admin/explorador'], { queryParams: { q: carpeta } });
  }

  cleanFileName(name: string | undefined): string {
    if (!name) return '';
    // Elimina el hash hexadecimal al final: _c7226321863db184 (antes de la extensión)
    let clean = name.replace(/_[a-f0-9]{8,}(?=\.[^.]+$|$)/i, '');
    // Reemplaza guiones bajos restantes por espacios
    clean = clean.replace(/_/g, ' ');
    return clean;
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
    this.searchTerm.set(item.value || item.label);
    this.searchTermChange.emit(this.searchTerm());

    this.showAutocomplete.set(false);
    this.autocompleteResults.set([]);

    // Dispara búsqueda real
    this.onSearchEnter();
  }

  onSearchEnter() {
    const term = this.searchTerm()?.trim();
    if (!term) return;

    this.searchTermChange.emit(term);
    this.searchSubmit.emit(term);

    this.loading.set(true);

    this.busquedaService.buscar(term)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: BusquedaResponse) => {
          this.busquedaData.set(data);
        },
        error: () => {
          this.error.set('No se encontraron resultados');
        },
        complete: () => {
          this.loading.set(false);
        }
      });
  }
}