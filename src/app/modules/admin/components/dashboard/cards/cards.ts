// src/app/dashboard/cards/cards.component.ts
import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DashboardService } from '../../../../../core/services/cards.service';

@Component({
  selector: 'app-cards',
  standalone: false,
  templateUrl: './cards.html',
  styleUrls: ['./cards.css']
})
export class CardsComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private refreshInterval = 30000;
  private subscription: Subscription = new Subscription();

  // Exponer signals del servicio para la vista
  isLoading = this.dashboardService.isLoading;
  hasError = this.dashboardService.hasError;
  errorMessage = this.dashboardService.errorMessage;
  lastUpdateTimeFormatted = this.dashboardService.lastUpdateTimeFormatted;
  updateAgoText = this.dashboardService.updateAgoText;
  cards = this.dashboardService.cards;

  // Signal computado para determinar si todas las cards están en error
  allCardsError = computed(() => {
    const cardsArray = this.cards();
    return cardsArray.length > 0 && cardsArray.every(card => card.error);
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
    this.dashboardService.loadDashboardData();
  }

  /** ===============================
   *  AUTO REFRESH
   *  =============================== */
  private setupAutoRefresh(): void {
    const refresh$ = timer(this.refreshInterval, this.refreshInterval);
    
    this.subscription.add(
      refresh$.pipe(
        switchMap(() => {
          // Solo recargar si no hay error o si ya pasó el tiempo
          if (!this.dashboardService.hasError()) {
            this.dashboardService.loadDashboardData();
          }
          return [];
        })
      ).subscribe()
    );
  }

  /** ===============================
   *  MÉTODOS PÚBLICOS
   *  =============================== */
  refreshData(): void {
    this.dashboardService.refresh();
  }

  formatValue(value: number | string): string {
    return this.dashboardService.formatValue(value);
  }

  formatTrend(trendValue: number): string {
    return this.dashboardService.formatTrend(trendValue);
  }

  getCardClass(card: any): string {
    const base = 'bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200';
    
    if (card.loading) {
      return `${base} opacity-70 cursor-wait`;
    }
    
    if (card.error) {
      return `${base} border-red-300 hover:border-red-400`;
    }
    
    return `${base} hover:border-[#691831]/20`;
  }
}