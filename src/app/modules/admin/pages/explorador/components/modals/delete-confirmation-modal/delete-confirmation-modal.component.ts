import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalState } from '../../../models/explorador-state.model';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-delete-confirmation-modal',standalone: false,
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrls: ['./delete-confirmation-modal.component.css']
})
export class DeleteConfirmationModalComponent {

  @Input() modalState!: ModalState;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get node(): AutorizacionTreeNode | null {
    return this.modalState?.data?.node ?? null;
  }

  get nombre(): string {
    return this.node?.nombre ?? 'este elemento';
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}