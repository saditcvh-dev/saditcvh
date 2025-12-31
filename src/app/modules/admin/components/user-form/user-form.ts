import { Component, EventEmitter, inject, Input, OnInit, Output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { User, Role, Cargo, UserPayload } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

// MODIFICACIÓN 1: Agregamos 'data' opcional para pasar el usuario creado
interface UserSaveEvent {
  success: boolean;
  message: string;
  data?: User;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

@Component({
  selector: 'app-user-form',
  standalone: false,
  templateUrl: './user-form.html',
})
export class UserFormComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  @Input({ required: true }) isOpen!: boolean;
  @Input() user: User | null = null;
  @Input({ required: true }) allRoles: Role[] = [];
  @Input({ required: true }) allCargos: Cargo[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() userSaved = new EventEmitter<UserSaveEvent>();

  public formTitle = signal('');
  public isSaving = signal(false);
  public saveError = signal<string | null>(null);
  public isConfirmSaveModalOpen = signal<boolean>(false);

  public userForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    second_last_name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    cargo_id: [null as number | null, Validators.required],
    role_id: [null as number | null, Validators.required],
    password: ['', [Validators.pattern(PASSWORD_REGEX)]],
    passwordConfirm: ['', [Validators.pattern(PASSWORD_REGEX)]]
  });

  public isPasswordSecure(): boolean {
    const passwordControl = this.userForm.get('password');
    if (!passwordControl || !passwordControl.value) {
      return true;
    }
    return passwordControl.valid || passwordControl.pristine;
  }

  public passwordsMatch(): boolean {
    const pass = this.userForm.get('password')?.value;
    const confirmPass = this.userForm.get('passwordConfirm')?.value;
    if (!this.user && (!pass || !confirmPass)) {
        return true;
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
    this.userForm.reset({
      username: '',
      first_name: '',
      last_name: '',
      second_last_name: '',
      email: '',
      phone: '',
      cargo_id: null,
      role_id: null,
      password: '',
      passwordConfirm: ''
    });

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
        role_id: this.user.roles[0]?.id || null,
      });

      passwordControl?.clearValidators();
      passwordConfirmControl?.clearValidators();
      passwordControl?.setValidators([Validators.pattern(PASSWORD_REGEX)]);
      passwordConfirmControl?.setValidators([Validators.pattern(PASSWORD_REGEX)]);

    } else {
      this.formTitle.set('Crear Nuevo Usuario');
      passwordControl?.setValidators([Validators.required, Validators.pattern(PASSWORD_REGEX)]);
      passwordConfirmControl?.setValidators([Validators.required, Validators.pattern(PASSWORD_REGEX)]);
    }

    passwordControl?.updateValueAndValidity();
    passwordConfirmControl?.updateValueAndValidity();
  }

  public onSubmit(): void {
    this.saveError.set(null);

    if (!this.passwordsMatch()) {
      this.saveError.set('Las contraseñas no coinciden.');
      return;
    }

    if ((this.user || !this.user) && this.userForm.get('password')?.value && !this.isPasswordSecure()) {
        this.saveError.set('La contraseña no cumple con los requisitos de seguridad.');
        return;
    }

    if (this.userForm.invalid) {
      this.saveError.set('Por favor, complete todos los campos requeridos correctamente.');
      this.userForm.markAllAsTouched();
      return;
    }

    this.isConfirmSaveModalOpen.set(true);
  }

  public onConfirmSave(): void {
    this.isConfirmSaveModalOpen.set(false);

    const formData = this.userForm.value;
    const { passwordConfirm, role_id, ...payloadRest } = formData;

    const finalPayload: UserPayload = {
      ...payloadRest as UserPayload,
      roles: role_id ? [Number(role_id)] : []
    };

    if (this.user && !finalPayload.password) {
      delete finalPayload.password;
    }

    if (finalPayload.phone === null) delete finalPayload.phone;
    else if (finalPayload.phone) finalPayload.phone = String(finalPayload.phone);

    if (finalPayload.second_last_name === null) delete finalPayload.second_last_name;
    else if (finalPayload.second_last_name) finalPayload.second_last_name = String(finalPayload.second_last_name);

    this.isSaving.set(true);

    const saveObservable = this.user
      ? this.userService.updateUser(this.user.id, finalPayload)
      : this.userService.createUser(finalPayload);

    saveObservable.pipe(take(1)).subscribe({
      next: (response) => {
        // Emitimos 'response.data' (el usuario creado/editado)
        this.userSaved.emit({
            success: true,
            message: response.message,
            data: response.data
        });
        this.isSaving.set(false);
      },
      error: (err) => {
        this.saveError.set(err.error?.message || 'Error desconocido al guardar el usuario.');
        this.isSaving.set(false);
      }
    });
  }

  public onCancel(): void {
    this.close.emit();
  }
}
