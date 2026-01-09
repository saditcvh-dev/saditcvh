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
    return !!data.modalidadId && !!data.tipoId && !!data.solicitante?.trim();
  }
  getFormErrors(): string[] {
    const errors: string[] = [];
    const data = this.modalState.data || {};

    // modalidadId = 1 → default → inválido
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

  // getFormErrors(): string[] {
  //   const errors: string[] = [];
  //   const data = this.modalState.data || {};
  //   console.log("data.modalidadId!=1")
  //   console.log(data.modalidadId!=1)


  //   if ( !(data.modalidadId !=1)  ) {
  //     errors.push('Seleccione una modalidad');
  //   }
  //   if (!data.tipoId) {
  //     errors.push('Seleccione un tipo de autorización');
  //   }
  //   if (!data.solicitante?.trim()) {
  //     errors.push('Ingrese el nombre del solicitante');
  //   }

  //   return errors;
  // }
}