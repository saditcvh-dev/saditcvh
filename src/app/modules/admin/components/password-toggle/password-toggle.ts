import { Component, forwardRef, inject, Input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-password-toggle',
  standalone: false,
  template: `
    <div class="relative">
      <input
        [id]="id"
        [type]="showPassword() ? 'text' : 'password'"
        [placeholder]="placeholder"
        [value]="value"
        (input)="onChange($event.target.value)"
        (blur)="onTouched()"
        [disabled]="isDisabled"
        class="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#A02142] focus:border-[#A02142] transition pr-10"
        [ngClass]="{'border-red-500': hasError}"
      >
      <button
        type="button"
        (click)="toggleShowPassword()"
        title="Alternar visibilidad"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-600 hover:text-[#A02142] transition"
      >
        <!-- Ojo abierto (mostrar contraseña) -->
        <svg *ngIf="showPassword()" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <!-- Ojo tachado (ocultar contraseña) -->
        <svg *ngIf="!showPassword()" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      </button>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordToggleComponent),
      multi: true
    }
  ]
})
export class PasswordToggleComponent implements ControlValueAccessor {
  @Input() placeholder: string = '••••••••';
  @Input() id: string = '';
  @Input() hasError: boolean | null = false;

  public showPassword = signal(false);
  public value: any = '';
  public isDisabled: boolean = false;

  // Funciones de ControlValueAccessor
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  public toggleShowPassword(): void {
    this.showPassword.set(!this.showPassword());
  }
}