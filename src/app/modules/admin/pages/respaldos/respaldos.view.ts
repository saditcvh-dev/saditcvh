import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RespaldosService } from '../../../../core/services/respaldos.service';
import { interval, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-respaldos-view',
  templateUrl: './respaldos.view.html',
  standalone: false
})
export class RespaldosView implements OnInit, OnDestroy {

  loadingStorage = true;
  loadingPerformance = true;
  lastUpdated?: Date;
  systemStatus: 'good' | 'warning' | 'critical' | 'unknown' = 'unknown';

  // Datos para la UI
  storageData: any = null;
  performanceData = {
    cpuHistory: [] as number[],
    ramHistory: [] as number[],
    currentCpu: 0,
    currentRam: 0
  };

  private subscriptions = new Subscription();

  constructor(private respaldosService: RespaldosService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initMonitoring();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initMonitoring(): void {
    // Rendimiento cada 10 seg (Histórico)
    this.subscriptions.add(
      interval(10000).pipe(switchMap(() => this.respaldosService.getLiveMetrics()))
        .subscribe(res => this.processPerformance(res))
    );

    // Almacenamiento cada 5 min (Estático)
    this.subscriptions.add(
      interval(300000).pipe(switchMap(() => this.respaldosService.getStorageMetrics()))
        .subscribe(res => this.processStorage(res))
    );

    this.fetchInitialData();
  }

  private fetchInitialData(): void {
    this.respaldosService.getLiveMetrics().subscribe(res => this.processPerformance(res));
    this.respaldosService.getStorageMetrics().subscribe(res => this.processStorage(res));
  }

  /**
   * Procesa CPU/RAM como histórico
   * Mapea el array de arrays a un array simple de porcentajes
   */
  private processPerformance(res: any): void {
    if (res?.success && res.data) {
      // Suponiendo que res.data.cpu.data es el array de [time, value]
      // Invertimos con .reverse() para que el tiempo corra de izquierda a derecha
      this.performanceData.cpuHistory = res.data.cpu.data.map((item: any[]) => Math.round(item[1])).reverse();
      this.performanceData.ramHistory = res.data.ram.data.map((item: any[]) => Math.round(item[1])).reverse();
      
      // El valor actual es el primero del array original (el más reciente)
      this.performanceData.currentCpu = Math.round(res.data.cpu.data[0][1]);
      this.performanceData.currentRam = Math.round(res.data.ram.data[0][1]);
      
      this.loadingPerformance = false;
      this.updateGlobalStatus();
      this.cdr.detectChanges();
    }
  }

  /**
   * Procesa Disco como ESTÁTICO (estilo Windows)
   * Usa: Total = avail + used
   */
  private processStorage(res: any): void {
    if (res?.success && res.data?.disk) {
      const labels = res.data.disk.labels; // ["time", "avail", "used", ...]
      const latestEntry = res.data.disk.data[0]; // Tomamos solo el último punto en el tiempo
      
      // Encontrar índices dinámicamente según los labels que enviaste
      const idxAvail = labels.indexOf('avail');
      const idxUsed = labels.indexOf('used');

      const avail = latestEntry[idxAvail];
      const used = latestEntry[idxUsed];
      const total = avail + used;
      const pct = total > 0 ? Math.round((used / total) * 100) : 0;

      this.storageData = {
        disk: {
          percentage: pct,
          // Formateamos a GB (asumiendo que los datos vienen en MB o GB)
          label: `${this.formatValue(avail)} disponibles de ${this.formatValue(total)}`,
          status: pct >= 90 ? 'critical' : pct >= 75 ? 'warning' : 'good'
        },
        files: {
          total: res.data.files?.total || 0,
          folders: res.data.files?.folders || 0
        }
      };
      
      this.lastUpdated = new Date();
      this.loadingStorage = false;
      this.updateGlobalStatus();
      this.cdr.detectChanges();
    }
  }

  private updateGlobalStatus(): void {
    const cpu = this.performanceData.currentCpu;
    const diskPct = this.storageData?.disk?.percentage || 0;
    if (cpu > 90 || diskPct > 90) this.systemStatus = 'critical';
    else if (cpu > 70 || diskPct > 80) this.systemStatus = 'warning';
    else this.systemStatus = 'good';
  }

  private formatValue(val: number): string {
    // Si los valores son muy grandes (ej. Netdata suele enviar en MB o unidades base)
    if (val > 1024) return `${(val / 1024).toFixed(1)} TB`;
    return `${Math.round(val)} GB`;
  }

  getDiskClass(pct: number): string {
    return pct >= 90 ? 'bg-red-600 border-red-700' : 'bg-[#2672ec] border-[#005a9e]';
  }

  refreshAll(): void {
    this.loadingPerformance = true;
    this.loadingStorage = true;
    this.fetchInitialData();
  }
}