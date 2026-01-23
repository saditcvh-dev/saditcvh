import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalState } from '../../../models/explorador-state.model';
// import { ModalState } from '../../models/explorador-state.model';

@Component({
  selector: 'app-create-autorizacion-modal', standalone: false,
  templateUrl: './create-autorizacion-modal.component.html',
  styleUrls: ['./create-autorizacion-modal.component.css']
})
export class CreateAutorizacionModalComponent {
  @Input() modalState!: ModalState;
  @Input() modalidades: any[] = [];
  @Input() tiposAutorizacion: any[] = [];

  @Output() dataChange = new EventEmitter<any>();

  get modalidadLabel(): string {
    const modalidad = this.modalidades?.find(m => m.id === this.modalState.data?.modalidadId);
    return modalidad ? `${modalidad.num} - ${modalidad.nombre}` : 'Seleccione una modalidad';
  }

  get tipoLabel(): string {
    const tipo = this.tiposAutorizacion?.find(t => t.id === this.modalState.data?.tipoId);
    return tipo ? `${tipo.nombre} (${tipo.abreviatura})` : 'Seleccione un tipo';
  }

  onModalidadChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newData = { ...this.modalState.data, modalidadId: select.value };
    this.dataChange.emit(newData);
  }

  onTipoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newData = { ...this.modalState.data, tipoId: select.value };
    this.dataChange.emit(newData);
  }

  onSolicitanteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newData = { ...this.modalState.data, solicitante: input.value };
    this.dataChange.emit(newData);
  }

isFormValid(): boolean {
  const data = this.modalState.data || {};
  return (
    !!data.numeroAutorizacion?.trim() &&
    !!data.consecutivo1 &&
    !!data.consecutivo2 &&
    !!data.modalidadId &&
    !!data.tipoId &&
    !!data.solicitante?.trim()
  );
}

getFormErrors(): string[] {
  const errors: string[] = [];
  const data = this.modalState.data || {};

  if (!data.numeroAutorizacion?.trim()) {
    errors.push('Ingrese el número de autorización');
  }

  if (!data.consecutivo1) {
    errors.push('Ingrese el consecutivo 1');
  }

  if (!data.consecutivo2) {
    errors.push('Ingrese el consecutivo 2');
  }

  if (!data.modalidadId || data.modalidadId === 1) {
    errors.push('Seleccione una modalidad');
  }

  if (!data.tipoId) {
    errors.push('Seleccione un tipo de autorización');
  }

  if (!data.solicitante?.trim()) {
    errors.push('Ingrese el nombre del solicitante');
  }

  return errors;
}


onNumeroAutorizacionChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const newData = {
    ...this.modalState.data,
    numeroAutorizacion: input.value
  };
  this.dataChange.emit(newData);
}
onConsecutivo1Change(event: Event): void {
  const input = event.target as HTMLInputElement;
  const newData = {
    ...this.modalState.data,
    consecutivo1: input.value
  };
  this.dataChange.emit(newData);
}

onConsecutivo2Change(event: Event): void {
  const input = event.target as HTMLInputElement;
  const newData = {
    ...this.modalState.data,
    consecutivo2: input.value
  };
  this.dataChange.emit(newData);
}


}