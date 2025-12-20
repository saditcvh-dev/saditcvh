import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // ¡Importante!

import { AuthRoutingModule } from './auth-routing-module';
import { Login } from './pages/login/login';
import { Auth } from './auth';

// Importar y declarar los nuevos componentes
import { UserInputComponent } from './components/user-input/user-input';
import { PasswordInputComponent } from './components/password-input/password-input';


@NgModule({
  declarations: [
    Auth,
    Login,
    UserInputComponent,       // <--- Declarado
    PasswordInputComponent    // <--- Declarado
    // RegisterComponent,
    // ForgotPasswordComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,      // <--- Añadido para formularios reactivos
    AuthRoutingModule
  ]
})
export class AuthModule { }