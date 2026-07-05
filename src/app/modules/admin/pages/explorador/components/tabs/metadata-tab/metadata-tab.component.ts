import { Component, Input, OnChanges, SimpleChanges, OnDestroy, inject, signal } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { CargaMasivaService } from '../../../../../../../core/services/digitalizacion-carga-masiva.service';
import { AuthService } from '../../../../../../../core/services/auth';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-metadata-tab',
  standalone: false,
  templateUrl: './metadata-tab.component.html',
  styleUrls: ['./metadata-tab.component.css']
})
export class MetadataTabComponent implements OnChanges, OnDestroy {
  @Input() fullScreenMode: boolean = false;
  @Input() selectedNode!: AutorizacionTreeNode | null;

  cargaMasivaService = inject(CargaMasivaService);
  authService = inject(AuthService);

  // States
  pendingCount = signal<number>(0);
  failedFiles = signal<any[]>([]);
  activeLock = signal<any>(null);
  isProcessingThisMuni = signal<boolean>(false);
  processingText = signal<string>('Procesando OCR...');
  
  // Polling subscription for active locks and counts
  private pollingSub?: Subscription;

  get esUsuarioAutorizado(): boolean {
    const user = this.authService.currentUser();
    return user?.id === 1;
  }

  get isLockedByOtherMuni(): boolean {
    const lock = this.activeLock();
    if (!lock) return false;
    return Number(lock.municipioNum) !== Number(this.selectedNode?.data?.num);
  }

  get lockMessage(): string {
    const lock = this.activeLock();
    if (!lock) return '';
    return `El municipio ${lock.municipioNombre || lock.municipioNum} se está procesando actualmente.`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedNode']) {
      this.stopPolling();
      this.pendingCount.set(0);
      this.failedFiles.set([]);
      this.activeLock.set(null);
      this.isProcessingThisMuni.set(false);

      if (this.selectedNode && this.selectedNode.type === 'municipio') {
        this.fetchMunicipalityData();
        this.startPolling();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollingSub = interval(5000).subscribe(() => {
      this.fetchMunicipalityData(false); // Solo polling ligero del lock
    });
  }

  private stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  private fetchMunicipalityData(fullRefresh = true): void {
    if (!this.selectedNode || this.selectedNode.type !== 'municipio') return;
    const muniNum = this.selectedNode.data?.num;
    if (muniNum === undefined || muniNum === null) return;

    // Siempre checamos el bloqueo (es rápido y ligero)
    this.cargaMasivaService.obtenerMunicipioProcesando().subscribe({
      next: (res) => {
        if (res.success) {
          const prevLock = this.activeLock();
          this.activeLock.set(res.lock);
          
          if (res.lock && Number(res.lock.municipioNum) === Number(muniNum)) {
            this.isProcessingThisMuni.set(true);
            const total = res.lock.total || 0;
            const completed = res.lock.completados || 0;
            const failed = res.lock.fallados || 0;
            const processed = completed + failed;
            this.processingText.set(`Procesando OCR: ${processed}/${total} completados (${failed} fallidos)`);
            
            // Si está procesando, actualizamos contadores para ver progreso en vivo
            this.refreshCounters(muniNum);
          } else {
            this.isProcessingThisMuni.set(false);
            // Si carga inicial o si el procesamiento acaba de terminar (el lock pasó de existir a null)
            if (fullRefresh || (prevLock && !res.lock)) {
              this.refreshCounters(muniNum);
            }
          }
        }
      }
    });
  }

  private refreshCounters(muniNum: number): void {
    // Conteo de pendientes
    this.cargaMasivaService.obtenerPendientesMunicipio(muniNum).subscribe({
      next: (res) => {
        if (res.success) this.pendingCount.set(res.count);
      }
    });

    // Archivos fallidos
    this.cargaMasivaService.obtenerFallidosMunicipio(muniNum).subscribe({
      next: (res) => {
        if (res.success) this.failedFiles.set(res.fallidos);
      }
    });
  }

  procesarMunicipio(limiteStr?: string): void {
    if (!this.selectedNode || this.selectedNode.type !== 'municipio') return;
    const muniNum = this.selectedNode.data?.num;
    if (muniNum === undefined || muniNum === null) return;

    this.isProcessingThisMuni.set(true);
    this.processingText.set('Iniciando procesamiento de OCR...');

    const limite = limiteStr ? parseInt(limiteStr, 10) : undefined;

    this.cargaMasivaService.procesarOcrMunicipio(muniNum, limite).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchMunicipalityData();
        }
      },
      error: (err) => {
        this.isProcessingThisMuni.set(false);
        console.error('Error al procesar municipio:', err);
      }
    });
  }

  reintentarArchivo(archivoId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.cargaMasivaService.reintentarArchivo(archivoId).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchMunicipalityData();
        }
      },
      error: (err) => {
        console.error('Error al reintentar archivo:', err);
      }
    });
  }

  get metadata(): any[] {
    // console.log("this.selectedNode")
    // console.log(this.selectedNode)
    if (!this.selectedNode) return [];
    
    const nombre = this.selectedNode.nombre || '';
    const indexEspacio = nombre.indexOf(' ');
    const numeroExpediente = indexEspacio !== -1 ? nombre.substring(indexEspacio + 1) : 'No disponible';

    const baseMetadata = [
      { label: 'Nombre', value: this.selectedNode.nombre || 'Sin nombre', icon: 'tag' },
      { label: 'ID', value: this.selectedNode.id || 'Sin ID', icon: 'hash' },
      { label: 'Número de expediente', value: numeroExpediente, icon: 'folder' },
      { label: 'Número de autorización', value: this.selectedNode.data?.numeroAutorizacion, icon: 'type', highlight: true },
      // {
      //   label: 'Fecha de creación',
      //   value: this.formatDate(this.selectedNode.data?.fechaCreacion),
      //   icon: 'calendar'
      // }
    ];

    if (this.selectedNode.type === 'autorizacion') {
      return [
        ...baseMetadata,
        // { label: 'Solicitante', value: this.selectedNode.data?.solicitante, icon: 'user' },
        { label: 'Modalidad', value: this.selectedNode.data?.modalidad?.nombre, icon: 'folder' },
        { label: 'Municipio', value: this.selectedNode.data?.municipio?.nombre, icon: 'map' },
        {
          label: 'Estado',
          value: this.selectedNode.data?.activo ? 'ACTIVO' : 'INACTIVO',
          icon: 'circle'
        }
      ];
    }

    return baseMetadata;
  }


  private getTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'municipio': 'Municipio',
      'tipo': 'Tipo de Autorización',
      'autorizacion': 'Autorización'
    };
    return typeMap[type] || type;
  }

   formatDate(dateString?: string): string {
    if (!dateString) return 'No disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  getIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
      'tag': 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      'hash': 'M7 20l4-16h2l4 16h2l2-8h-4l2-8h-2L9 12H5l2 8h2z',
      'type': 'M4 7V4h16v3M9 20h6M12 4v16',
      'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      'user': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      'circle': 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z',
      'map': 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
    };

    return icons[iconName] || '';
  }
}