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
  cpuMax = 100;
  ramMax = 100;

  // Datos para la UI
  storageData: any = null;
  performanceData = {
    cpuHistory: [] as number[],
    ramHistory: [] as number[],
    currentCpu: 0,
    currentRam: 0,
    ramValueGB: '', // Label específico para mostrar GB usados/totales
    freeRamGB: '' // Label para RAM estrictamente libre
  };

  private subscriptions = new Subscription();

  constructor(private respaldosService: RespaldosService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.initMonitoring();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initMonitoring(): void {
    // Rendimiento cada 10 seg (CPU y RAM)
    this.subscriptions.add(
      interval(10000).pipe(switchMap(() => this.respaldosService.getLiveMetrics()))
        .subscribe(res => this.processPerformance(res))
    );

    // Almacenamiento cada 5 min (Disco e Inodos)
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
   * Procesa CPU y RAM
   * CPU: Suma todas las dimensiones excepto 'time' para obtener el % total
   * RAM: Suma used+cached+buffers y convierte de MB a GB
   */
  private processPerformance(res: any): void {
    if (res?.success && res.data) {
      const { cpu, ram } = res.data;

      // --- PROCESAMIENTO CPU ---
      const timeIdxCpu = cpu.labels.indexOf('time');
      // Sumamos todas las columnas de la fila (excepto el tiempo) para obtener el uso total
      this.performanceData.cpuHistory = cpu.data.map((row: any[]) => {
        const totalUsage = row.reduce((acc, val, idx) => idx === timeIdxCpu ? acc : acc + val, 0);
        return Math.min(Math.round(totalUsage), 100); // Tope de 100% por seguridad
      });

      // --- PROCESAMIENTO RAM ---
      const idxFree = ram.labels.indexOf('free');
      const idxUsed = ram.labels.indexOf('used');
      const idxCached = ram.labels.indexOf('cached');
      const idxBuffers = ram.labels.indexOf('buffers');

      this.performanceData.ramHistory = ram.data.map((row: any[]) => {
        const usedReal = row[idxUsed];
        const total = usedReal + row[idxFree] + row[idxCached] + row[idxBuffers];
        return total > 0 ? Math.round((usedReal / total) * 100) : 0;
      });

      // Valores actuales (última posición del historial tras el reverse)
      this.performanceData.currentCpu = this.performanceData.cpuHistory[0];
      this.performanceData.currentRam = this.performanceData.ramHistory[0];

      // Cálculo de GB para el label (usando el dato más reciente de la respuesta original data[0])
      const latestRam = ram.data[0];
      const usedMB = latestRam[idxUsed];
      const freeMB = latestRam[idxFree];
      const cachedMB = latestRam[idxCached];
      const buffersMB = latestRam[idxBuffers];

      const totalMB = usedMB + freeMB + cachedMB + buffersMB;
      this.performanceData.ramValueGB = `${(usedMB / 1024).toFixed(2)} GB de ${(totalMB / 1024).toFixed(2)} GB`;
      this.performanceData.freeRamGB = `${(freeMB / 1024).toFixed(2)} GB Libres`;

      this.cpuMax = Math.max(...this.performanceData.cpuHistory, 10);
      this.ramMax = Math.max(...this.performanceData.ramHistory, 10);

      this.lastUpdated = new Date();
      this.loadingPerformance = false;
      this.updateGlobalStatus();
      this.cdr.detectChanges();
    }
  }

  scale(val: number, max: number): number {
    return Math.max((val / max) * 100, 6); // mínimo visible
  }

  /**
   * Procesa Disco e Inodos (Archivos)
   */
  private processStorage(res: any): void {
    if (res?.success && res.data?.disk && res.data?.inodes) {
      // 1. Procesar Disco
      const dLabels = res.data.disk.labels;
      const dLatest = res.data.disk.data[0];
      const dAvail = dLatest[dLabels.indexOf('avail')];
      const dUsed = dLatest[dLabels.indexOf('used')];
      const dTotal = dAvail + dUsed;
      const dPct = dTotal > 0 ? Math.round((dUsed / dTotal) * 100) : 0;

      // 2. Procesar Inodos (Archivos usados)
      const iLabels = res.data.inodes.labels;
      const iLatest = res.data.inodes.data[0];
      const filesUsed = iLatest[iLabels.indexOf('used')];

      this.storageData = {
        disk: {
          percentage: dPct,
          availGB: this.formatValue(dAvail),
          usedGB: this.formatValue(dUsed),
          totalGB: this.formatValue(dTotal),
          label: `${this.formatValue(dAvail)} disponibles de ${this.formatValue(dTotal)}`
        },
        files: {
          total: filesUsed
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

    // Umbrales basados en la lógica institucional
    if (cpu > 85 || diskPct > 90) this.systemStatus = 'critical';
    else if (cpu > 60 || diskPct > 80) this.systemStatus = 'warning';
    else if (this.performanceData.currentCpu > 0 || this.storageData) this.systemStatus = 'good';
  }

  private formatValue(val: number): string {
    // Netdata envía estos valores de disco en GB generalmente, pero por si acaso:
    if (val >= 1024) return `${(val / 1024).toFixed(1)} TB`;
    return `${Math.round(val)} GB`;
  }

  /** Colores institucionales según porcentaje */
  getDiskClass(pct: number): string {
    if (pct >= 90) return 'bg-red-700 border-red-800'; // Alerta
    return 'bg-[#691831] dark:bg-[#c44569] border-black/10'; // Institucional
  }

  refreshAll(): void {
    this.loadingPerformance = true;
    this.loadingStorage = true;
    this.fetchInitialData();
  }
}
