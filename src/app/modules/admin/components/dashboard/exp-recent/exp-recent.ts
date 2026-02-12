// src/app/dashboard/exp-recent/exp-recent.component.ts
import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ExpRecentService } from '../../../../../core/services/exp-recent.service';

@Component({
  selector: 'app-exp-recent',
  standalone: false,
  templateUrl: './exp-recent.html',
})
export class ExpRecentComponent implements OnInit, OnDestroy {
  private expRecentService = inject(ExpRecentService);

  private refreshInterval = 300000; // 5 MINUTOS
  
  private subscription: Subscription = new Subscription();

  // Exponer signals del servicio
  isLoading = this.expRecentService.isLoading;
  hasError = this.expRecentService.hasError;
  errorMessage = this.expRecentService.errorMessage;
  documentos = this.expRecentService.documentos;
  lastUpdateTimeFormatted = this.expRecentService.lastUpdateTimeFormatted;
  lastUpdateTime = this.expRecentService.lastUpdateTime;
  totalDocumentos = this.expRecentService.totalDocumentos;

  // Signal computado para determinar si mostrar sin datos
  showEmptyState = computed(() => {
    return !this.isLoading() && 
           !this.hasError() && 
           this.documentos().length === 0;
  });

  // Signal computado para determinar si mostrar datos de ejemplo (error)
  showErrorState = computed(() => {
    return this.hasError() && !this.isLoading();
  });

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /** ===============================
   *  CARGA INICIAL
   *  =============================== */
  private loadData(): void {
    this.expRecentService.loadDocumentosRecientes();
  }

  /** ===============================
   *  AUTO REFRESH INTELIGENTE
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          // SOLO recargar si:
          // 1. La pestaña está visible (NO document.hidden)
          // 2. No hay error en el servicio
          if (!document.hidden && !this.expRecentService.hasError()) {
            this.expRecentService.loadDocumentosRecientes();
          } else if (document.hidden) {

          }
          return [];
        })
      ).subscribe()
    );
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshDocumentos(): void {
    this.expRecentService.refresh();
  }

  // Delegar métodos al servicio
  getEstadoColorClases(estadoColor: string): string {
    return this.expRecentService.getEstadoColorClases(estadoColor);
  }

  getIconoDocumento(tipoDocumento: string | null): string {
    return this.expRecentService.getIconoDocumento(tipoDocumento);
  }

  getTipoDocumentoColor(numeroDocumento: string | null): string {
    return this.expRecentService.getTipoDocumentoColor(numeroDocumento);
  }

  // Mantener por compatibilidad con el template existente
  getLastUpdateTime(): string {
    return this.lastUpdateTimeFormatted();
  }
}