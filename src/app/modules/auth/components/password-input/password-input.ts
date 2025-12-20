import { Component, Input, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: false,
  templateUrl: './password-input.html',
})
export class PasswordInputComponent implements OnInit {
  @Input() control!: FormControl;
  @Input() label: string = 'Contraseña';
  @Input() placeholder: string = '••••••••';
  @Input() inputId: string = 'password';

  showPassword = false;

  ngOnInit(): void {
    if (this.control) {
      this.control.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50),
        //Patrón para EVITAR caracteres peligrosos de inyección/XSS.
        // Permite cualquier carácter de contraseña común, excepto <, >, ;, ", `, |
        Validators.pattern(/^[^<>;"`|]*$/), 
      ]);
      this.control.updateValueAndValidity();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  get validationErrors() {
    return this.control.errors;
  }
}