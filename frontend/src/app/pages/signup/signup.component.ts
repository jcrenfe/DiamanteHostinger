import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthStore } from '../../store/auth.store';

@Component({
   selector: 'app-signup',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule, RouterLink],
   template: `
    <div class="auth-wrapper">
      <div class="auth-card shadow-lg fade-in">
        <div class="auth-header">
           <div class="logo-container">
             <div class="logo-inner">
               <img src="assets/images/logo.png" alt="Logo" class="auth-logo">
               <div class="logo-mask"></div>
             </div>
           </div>
           <h2 class="title-font">Únete a la Familia</h2>
           <p class="text-muted">Crea tu cuenta de cliente de forma artesanal</p>
        </div>
        
        <form [formGroup]="signupForm" (ngSubmit)="onSignup()" class="auth-form">
           <!-- Nombre -->
           <div class="form-group">
              <label>Nombre Completo</label>
              <input type="text" formControlName="nombre" class="form-control" placeholder="Ej: Maria García"
                     [class.error]="signupForm.get('nombre')?.invalid && (signupForm.get('nombre')?.touched || isSubmitted)">
              <div *ngIf="signupForm.get('nombre')?.invalid && (signupForm.get('nombre')?.touched || isSubmitted)">
                <small class="error-text" *ngIf="signupForm.get('nombre')?.hasError('required')">Tu nombre nos ayuda a saber a quién enviamos nuestros desayunos. 😊</small>
              </div>
           </div>

           <!-- Email -->
           <div class="form-group">
              <label>Email</label>
              <input type="email" formControlName="email" class="form-control" placeholder="tu&#64;email.com"
                     [class.error]="signupForm.get('email')?.invalid && (signupForm.get('email')?.touched || isSubmitted)">
              <div *ngIf="signupForm.get('email')?.invalid && (signupForm.get('email')?.touched || isSubmitted)">
                <small class="error-text" *ngIf="signupForm.get('email')?.hasError('required')">Necesitamos un correo para enviarte las confirmaciones de tus pedidos.</small>
                <small class="error-text" *ngIf="!signupForm.get('email')?.hasError('required') && (signupForm.get('email')?.hasError('email') || signupForm.get('email')?.hasError('pattern'))">Vaya, ese correo no parece tener el formato correcto (ej: nombre&#64;correo.com).</small>
              </div>
           </div>
           
           <!-- Contraseña -->
           <div class="form-group">
              <label>Contraseña</label>
              <div class="password-wrap">
                 <input [type]="showPassword() ? 'text' : 'password'" formControlName="password" class="form-control"
                        [class.error]="signupForm.get('password')?.invalid && (signupForm.get('password')?.touched || isSubmitted)">
                 <button type="button" class="btn-toggle-pw" (click)="togglePassword()">
                    <svg *ngIf="!showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg *ngIf="showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                 </button>
              </div>
              <small class="complexity-hint">Para tu seguridad, usa al menos 6 caracteres mezclando letras y números.</small>
              <div *ngIf="signupForm.get('password')?.invalid && (signupForm.get('password')?.touched || isSubmitted)">
                <small class="error-text" *ngIf="signupForm.get('password')?.hasError('required')">Por favor, elige una clave para proteger tu cuenta.</small>
                <small class="error-text" *ngIf="signupForm.get('password')?.hasError('minlength')">La clave debe ser un poquito más larga (mínimo 6 caracteres).</small>
                <small class="error-text" *ngIf="!signupForm.get('password')?.hasError('minlength') && signupForm.get('password')?.hasError('pattern')">La contraseña debe incluir una combinación de letras y números para ser más segura.</small>
              </div>
           </div>

           <!-- Confirmar Contraseña -->
           <div class="form-group">
              <label>Confirmar Contraseña</label>
              <input [type]="showPassword() ? 'text' : 'password'" formControlName="confirmPassword" class="form-control"
                     [class.error]="signupForm.errors?.['mismatch'] && (signupForm.get('confirmPassword')?.touched || isSubmitted)">
              <div *ngIf="signupForm.get('confirmPassword')?.touched || isSubmitted">
                <small class="error-text" *ngIf="signupForm.get('confirmPassword')?.hasError('required')">Es necesario confirmar tu contraseña.</small>
                <small class="error-text" *ngIf="!signupForm.get('confirmPassword')?.hasError('required') && signupForm.errors?.['mismatch']">Las contraseñas no coinciden, ¿podrías volver a escribirlas?</small>
              </div>
           </div>

           <div class="auth-error-msg fade-in" *ngIf="store.error()">
              <span>⚠️</span> {{ store.error() }}
           </div>
           
           <button type="submit" class="btn btn-primary btn-block" [disabled]="store.loading()">
              {{ store.loading() ? 'Creando cuenta...' : 'Registrarme' }}
           </button>
           
           <div class="divider"><span>O</span></div>
           
           <button type="button" (click)="onGoogleLogin()" class="btn btn-google btn-block" [disabled]="store.loading()">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
              Registrarme con Google
           </button>
        </form>
        
        <div class="auth-footer">
           <span>¿Ya tienes cuenta? <a routerLink="/login" class="link-ptr">Inicia Sesión</a></span>
        </div>
      </div>
    </div>
  `,
   styles: [`
    .auth-wrapper {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(rgba(139, 69, 19, 0.05), rgba(230, 126, 34, 0.05));
      padding: 2rem;
    }
    .auth-card {
      background: white; width: 100%; max-width: 480px; padding: 3rem;
      border-radius: var(--radius-lg); border: 1px solid #eee; text-align: center;
    }
    .auth-logo { width: 100%; height: 100%; object-fit: contain; }
    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .logo-inner {
      width: 110px;
      height: 110px;
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid var(--primary);
      background: white;
    }
    .logo-mask {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      border-radius: 50%;
      box-shadow: inset 0 0 0 7px white;
      pointer-events: none;
    }
    .auth-header h2 { font-size: 2rem; color: var(--primary); }
    .auth-form { text-align: left; margin-top: 2rem; }
    .form-group { margin-bottom: 1.5rem; position: relative; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem; }
    .form-control {
       width: 100%; padding: 0.8rem 1rem; border: 2px solid #f0f0f0;
       border-radius: 8px; font-size: 1rem; transition: 0.3s;
    }
    .form-control:focus { border-color: var(--primary); outline: none; }
    .form-control.error { border-color: var(--accent); }
    .password-wrap { position: relative; }
    .btn-toggle-pw {
       position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
       background: none; border: none; cursor: pointer; color: #999;
       display: flex; align-items: center; justify-content: center;
    }
    .btn-toggle-pw:hover { color: var(--primary); }
    .btn-block { width: 100%; padding: 1rem; margin-top: 1rem; }
    .btn-google {
       background: white; border: 2px solid #ddd; color: var(--text-dark);
       display: flex; align-items: center; justify-content: center; gap: 1rem;
       font-weight: 600;
    }
    .btn-google:hover { background: #f9f9f9; border-color: #ccc; }
    .divider { height: 1px; background: #eee; margin: 2rem 0; position: relative; }
    .divider span {
       position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
       background: white; padding: 0 1rem; color: #999; font-size: 0.8rem;
    }
    .auth-error-msg { margin-bottom: 1.5rem; color: var(--accent); font-weight: 600; font-size: 0.85rem; padding: 0.8rem; background: rgba(192, 57, 43, 0.05); border-radius: 8px; border: 1px solid rgba(192, 57, 43, 0.1); }
    .error-text { color: var(--accent); font-size: 0.8rem; font-weight: 600; margin-top: 5px; display: block; }
    .complexity-hint { font-size: 0.75rem; color: #888; display: block; margin-top: 4px; font-style: italic; }
    .auth-footer { margin-top: 2rem; font-size: 0.9rem; }
    .auth-footer .link-ptr { color: var(--primary); font-weight: 600; cursor: pointer; text-decoration: underline; }
  `]
})
export class SignupComponent {
   private fb = inject(FormBuilder);
   private authService = inject(AuthService);
   public store = inject(AuthStore);

   signupForm: FormGroup;
   showPassword = signal(false);
   isSubmitted = false;

   constructor() {
      this.signupForm = this.fb.group({
         nombre: ['', Validators.required],
         email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
         password: ['', [
            Validators.required,
            Validators.minLength(6),
            Validators.pattern('^(?=.*[0-9])(?=.*[a-zA-Z]).*$') // Al menos un número y una letra
         ]],
         confirmPassword: ['', Validators.required]
      }, { validators: this.passwordMatchValidator });
   }

   togglePassword() { this.showPassword.set(!this.showPassword()); }

   passwordMatchValidator(g: FormGroup) {
      return g.get('password')?.value === g.get('confirmPassword')?.value
         ? null : { 'mismatch': true };
   }

   async onSignup() {
      this.isSubmitted = true;
      this.signupForm.markAllAsTouched();

      if (this.signupForm.valid) {
         const { email, password, nombre } = this.signupForm.value;
         try {
            await this.authService.signup(email, password, nombre);
         } catch (err: any) {
            // Error managed by store
         }
      }
   }

   async onGoogleLogin() {
      await this.authService.loginWithGoogle();
   }
}
