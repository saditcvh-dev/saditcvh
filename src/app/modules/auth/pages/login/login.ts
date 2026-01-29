import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      usuario: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    });
  }

  get usuarioControl() {
    return this.loginForm.get('usuario') as FormControl;
  }

  get passwordControl() {
    return this.loginForm.get('password') as FormControl;
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.loginForm.markAllAsTouched();

    if (this.loginForm.valid) {
      this.loading = true;

      const credentials = {
        username: this.usuarioControl.value!,
        password: this.passwordControl.value!,
      };

      this.authService.login(credentials).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/admin/dashboard']);
          console.log('Login successful');
          // mostrar respuesta del servidor si es necesario aquí del usuario todo 
          console.log('User logged in:', this.authService.currentUser);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'Credenciales incorrectas';
          console.error('Login error:', err);
        }
      });
    }
  }
}
