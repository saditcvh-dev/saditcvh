import { Component, Input, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-input',
  standalone: false,
  templateUrl: './user-input.html',
})
export class UserInputComponent implements OnInit {
  @Input() control!: FormControl;
  @Input() label: string = 'Usuario';
  @Input() placeholder: string = 'usuario@stch.hidalgo.gob.mx';
  @Input() inputId: string = 'user';
  @Input() iconPath: string = 'M16 12H8m8-4H8m8 8H8M4 6h16v12H4z'; 

  ngOnInit(): void {
    if (this.control) {
      // Solo prohibimos caracteres peligrosos como <, >, /, ;, ", ', ` (bueno para nombres de usuario/genéricos).
      // Permite letras, números, @, ., -, _ y espacios.
      const safePattern = /^[^<>;/`"']+$/; 

      const validators = [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(100),
        Validators.pattern(safePattern),
      ];

      // Lógica para Email: Solo si el inputId es *estrictamente* 'email'
      // El componente 'user-input' se usa con inputId="usuario" en login.html, por lo que no entrará aquí.
      if (this.inputId === 'email') {
        // Quitamos el patrón de seguridad general y ponemos el de Email.
        validators.pop(); 
        validators.push(Validators.email);
      }

      this.control.setValidators(validators);
      this.control.updateValueAndValidity();
    }
  }

  get validationErrors() {
    return this.control.errors;
  }
}