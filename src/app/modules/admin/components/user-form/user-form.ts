import { Component, EventEmitter, inject, Input, OnInit, Output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { User, Role, Cargo, UserPayload } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

interface UserSaveEvent {
  success: boolean;
  message: string;
}

// Expresión Regular para una Contraseña Segura:
// Al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

@Component({
  selector: 'app-user-form',
  standalone:false,
  templateUrl: './user-form.html',
})
export class UserFormComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  // ... (Propiedades de Entrada y Salida se mantienen iguales)
  @Input({ required: true }) isOpen!: boolean;
  @Input() user: User | null = null; 
  @Input({ required: true }) allRoles: Role[] = [];
  @Input({ required: true }) allCargos: Cargo[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() userSaved = new EventEmitter<UserSaveEvent>();

  // Estados locales
  public formTitle = signal('');
  public isSaving = signal(false);
  public saveError = signal<string | null>(null);

  // Señal para el modal de confirmación de guardado
  public isConfirmSaveModalOpen = signal<boolean>(false);
  // -------------------------------------------------------------

  // Formulario Reactivo
  public userForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    second_last_name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    cargo_id: [null as number | null, Validators.required],
    // CAMBIADO: Usamos un solo ID de rol en lugar de un array
    role_id: [null as number | null, Validators.required], 
    // AGREGANDO VALIDACIÓN REGEXP para seguridad
    password: ['', [Validators.pattern(PASSWORD_REGEX)]], 
    passwordConfirm: ['', [Validators.pattern(PASSWORD_REGEX)]]
  });

  // Método para verificar si la contraseña es segura
  public isPasswordSecure(): boolean {
    const passwordControl = this.userForm.get('password');
    // La validación solo es estricta si el campo no está vacío (Creación o Edición con cambio de pass)
    if (!passwordControl || !passwordControl.value) {
      return true; // Si está vacío, es válido (se maneja en setupForm)
    }
    return passwordControl.valid || passwordControl.pristine;
  }

  // Método para verificar la coincidencia de contraseñas
  public passwordsMatch(): boolean {
    const pass = this.userForm.get('password')?.value;
    const confirmPass = this.userForm.get('passwordConfirm')?.value;
    // Si ambos están vacíos (edición sin cambio), consideramos que coinciden.
    if (!this.user && (!pass || !confirmPass)) {
        return true; // La validación de 'required' se encarga de esto en creación
    }
    return pass === confirmPass;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] || changes['isOpen']) {
      this.setupForm();
    }
  }

  ngOnInit(): void {
    this.setupForm(); 
  }
  
  public setupForm(): void { 
    // Aseguramos que el formulario esté listo para recibir datos
    this.userForm.reset({
      username: '',
      first_name: '',
      last_name: '',
      second_last_name: '',
      email: '',
      phone: '',
      cargo_id: null,
      role_id: null, // Resetear el nuevo campo
      password: '',
      passwordConfirm: ''
    });
    
    // Obtener los controles
    const passwordControl = this.userForm.get('password');
    const passwordConfirmControl = this.userForm.get('passwordConfirm');

    if (this.user) {
      this.formTitle.set(`Editar Usuario: ${this.user.first_name} ${this.user.last_name}`);
      this.userForm.patchValue({
        username: this.user.username,
        first_name: this.user.first_name,
        last_name: this.user.last_name,
        second_last_name: this.user.second_last_name,
        email: this.user.email,
        phone: this.user.phone,
        cargo_id: this.user.cargo_id,
        // OBTENER SOLO EL PRIMER ROL ID para el campo role_id
        role_id: this.user.roles[0]?.id || null, 
      });

      // En Edición, quitamos la validación 'required' (solo se exige si se introduce algo)
      passwordControl?.clearValidators();
      passwordConfirmControl?.clearValidators();

      // Mantenemos la validación de Pattern si hay valor, pero no es required si se deja vacío.
      passwordControl?.setValidators([Validators.pattern(PASSWORD_REGEX)]);
      passwordConfirmControl?.setValidators([Validators.pattern(PASSWORD_REGEX)]);

    } else {
      this.formTitle.set('Crear Nuevo Usuario');
      // En Creación, requerir contraseña y el Pattern
      passwordControl?.setValidators([Validators.required, Validators.pattern(PASSWORD_REGEX)]);
      passwordConfirmControl?.setValidators([Validators.required, Validators.pattern(PASSWORD_REGEX)]);
    }
    
    passwordControl?.updateValueAndValidity();
    passwordConfirmControl?.updateValueAndValidity();
  }
  
  /**
    * Abre el modal de confirmación antes de guardar.
    */
  public onSubmit(): void {
    this.saveError.set(null);

    // 1. Validar las contraseñas
    if (!this.passwordsMatch()) {
      this.saveError.set('Las contraseñas no coinciden.');
      return;
    }
    
    // Si estamos editando y se llenaron las contraseñas, validar seguridad
    if ((this.user || !this.user) && this.userForm.get('password')?.value && !this.isPasswordSecure()) {
        this.saveError.set('La contraseña no cumple con los requisitos de seguridad. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.');
        return;
    }

    if (this.userForm.invalid) {
      this.saveError.set('Por favor, complete todos los campos requeridos correctamente.');
      this.userForm.markAllAsTouched();
      return;
    }
    
    // Si la validación pasa, abre el modal de confirmación
    this.isConfirmSaveModalOpen.set(true);
  }

  // ... (onConfirmSave y onCancel se mantienen iguales)
  public onConfirmSave(): void {
    this.isConfirmSaveModalOpen.set(false); // Cerrar el modal de confirmación

    // 2. Construcción del payload
    const formData = this.userForm.value;
    
    // Extraemos solo los campos necesarios para el payload
    const { passwordConfirm, role_id, ...payloadRest } = formData;
    
    // Reconstruir el payload, asegurando que 'roles' sea un array de IDs (aunque sea uno solo)
    const finalPayload: UserPayload = {
      ...payloadRest as UserPayload,
      roles: role_id ? [Number(role_id)] : [] // Convertir el role_id individual a array de IDs
    };
    
    // 3. Quitar la contraseña si estamos editando y no se proporcionó
    if (this.user && !finalPayload.password) {
      delete finalPayload.password;
    }
    
    // Sanitización de opcionales (Asegurar que no se envíen 'null' o 'undefined' si el backend espera strings/ausencia)
    if (finalPayload.phone === null) {
        delete finalPayload.phone;
    } else if (finalPayload.phone) {
        finalPayload.phone = String(finalPayload.phone);
    }
    
    if (finalPayload.second_last_name === null) {
        delete finalPayload.second_last_name;
    } else if (finalPayload.second_last_name) {
        finalPayload.second_last_name = String(finalPayload.second_last_name);
    }

    this.isSaving.set(true);
    
    const saveObservable = this.user
      ? this.userService.updateUser(this.user.id, finalPayload)
      : this.userService.createUser(finalPayload);

    saveObservable.pipe(take(1)).subscribe({
      next: (response) => {
        this.userSaved.emit({ success: true, message: response.message });
        this.isSaving.set(false);
      },
      error: (err) => {
        this.saveError.set(err.error?.message || 'Error desconocido al guardar el usuario.');
        this.isSaving.set(false);
      }
    });
  }

  // Emitir evento de cierre
  public onCancel(): void {
    this.close.emit();
  }
}