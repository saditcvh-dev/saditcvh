// src/app/explorador/exp-recent/exp-recent.component.ts
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
  private refreshInterval = 30000;
  private subscription: Subscription = new Subscription();

  // Exponer signals del servicio
  isLoading = this.expRecentService.isLoading;
  hasError = this.expRecentService.hasError;
  errorMessage = this.expRecentService.errorMessage;
  documentos = this.expRecentService.documentos;
  lastUpdateTimeFormatted = this.expRecentService.lastUpdateTimeFormatted;
  lastUpdateTime = this.expRecentService.lastUpdateTime; // Para mantener compatibilidad
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
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          // Solo recargar si no hay error
          if (!this.expRecentService.hasError()) {
            this.expRecentService.loadDocumentosRecientes();
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