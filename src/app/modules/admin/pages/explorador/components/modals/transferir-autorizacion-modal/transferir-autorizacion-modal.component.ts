import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ModalState } from '../../../models/explorador-state.model';

@Component({
  selector: 'app-transferir-autorizacion-modal',
  standalone: false,
  templateUrl: './transferir-autorizacion-modal.component.html',
  styleUrls: ['./transferir-autorizacion-modal.component.css']
})
export class TransferirAutorizacionModalComponent implements OnInit {
  @Input() modalState!: ModalState;
  @Input() modalidades: any[] = [];
  @Input() tiposAutorizacion: any[] = [];
  @Input() municipios: any[] = [];

  @Output() dataChange = new EventEmitter<any>();

  ngOnInit() {
    // Inicializar data si no existe
    if (!this.modalState.data) {
      this.modalState.data = {};
    }
  }

  get isM85(): boolean {
    // Si la autorización original viene del municipio 85
    return this.modalState.data?.originalMunicipioNum === 85;
  }

  get filteredMunicipios(): any[] {
    // Excluir municipio 85 de la lista destino
    return this.municipios?.filter(m => m.num !== 85) || [];
  }

  get modalData(): any {
    return this.modalState.data || {};
  }

  get currentFileName(): string {
    return this.modalState.data?.originalNombreCarpeta || 'N/A';
  }

  get newFileName(): string {
    const data = this.modalData;
    const num = this.isM85 && data.repararNomenclatura ? data.numeroAutorizacion : data.originalNumeroAutorizacion;
    if (!num) return 'N/A';

    const currentMuni = this.municipios?.find(m => m.id == data.municipioId);
    const muniNum = currentMuni ? String(currentMuni.num).padStart(2, '0') : 'XX';

    const currentModa = this.modalidades?.find(m => m.id == data.modalidadId);
    const modaNum = currentModa ? String(currentModa.num).padStart(2, '0') : 'XX';

    const c1 = (this.isM85 && data.repararNomenclatura ? data.consecutivo1 : data.originalConsecutivo1) || 'XX';
    const c2 = (this.isM85 && data.repararNomenclatura ? data.consecutivo2 : data.originalConsecutivo2) || 'XXX';

    const tipoAbrev = this.isM85 && data.repararNomenclatura 
      ? this.tiposAutorizacion?.find(t => t.id == data.tipoId)?.abreviatura 
      : data.originalTipoAbreviatura;
    
    const abrev = tipoAbrev || 'X';

    return `${num}_${muniNum}_${modaNum}_${c1}_${c2}_${abrev}`;
  }

  onFieldChange(field: string, event: any): void {
    const value = event?.target ? (event.target.type === 'checkbox' ? event.target.checked : event.target.value) : event;
    const newData = { ...this.modalState.data, [field]: value };
    this.dataChange.emit(newData);
  }

  get currentMunicipioName(): string {
    const m = this.municipios?.find(m => m.id === this.modalData.originalMunicipioId);
    return m ? m.nombre : 'Desconocido';
  }

  get currentModalidadName(): string {
    const m = this.modalidades?.find(m => m.id === this.modalData.originalModalidadId);
    return m ? m.nombre : 'Desconocido';
  }

  get selectedMunicipioName(): string {
    if (!this.modalData.municipioId) return 'Seleccione...';
    const m = this.municipios?.find(m => m.id == this.modalData.municipioId);
    return m ? `${m.num} - ${m.nombre}` : 'Seleccione...';
  }

  get selectedModalidadName(): string {
    if (!this.modalData.modalidadId) return 'Seleccione...';
    const m = this.modalidades?.find(m => m.id == this.modalData.modalidadId);
    return m ? `${m.num} - ${m.nombre}` : 'Seleccione...';
  }
}
