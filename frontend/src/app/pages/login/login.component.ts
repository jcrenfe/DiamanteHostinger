import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthStore } from '../../store/auth.store';
import { ToastService } from '../../services/toast.service';

@Component({
   selector: 'app-login',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule, RouterLink],
   template: `
    <div class="login-wrapper">
      <button class="btn-back" (click)="goBack()" aria-label="Volver">
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
         Volver
      </button>

      <div class="login-card shadow-lg fade-in">
        <div class="login-header">
           <div class="logo-container">
             <div class="logo-inner">
               <img src="assets/images/logo.png" alt="Logo" class="login-logo">
               <div class="logo-mask"></div>
             </div>
           </div>
           <h2 class="title-font">Entrar en Diamante</h2>
           <p class="text-muted">Inicia sesión con tu cuenta familiar</p>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form">
           <div class="form-group">
              <label>Email</label>
              <input type="email" formControlName="email" class="form-control" placeholder="tu&#64;familia.com"
                     [class.error]="loginForm.get('email')?.invalid && (loginForm.get('email')?.touched || isSubmitted)">
              <div *ngIf="loginForm.get('email')?.invalid && (loginForm.get('email')?.touched || isSubmitted)">
                <small class="error-text" *ngIf="loginForm.get('email')?.hasError('required')">Dinos tu correo para que podamos reconocerte. 😊</small>
                <small class="error-text" *ngIf="!loginForm.get('email')?.hasError('required') && (loginForm.get('email')?.hasError('email') || loginForm.get('email')?.hasError('pattern'))">Ese correo no parece estar bien escrito (ej: nombre&#64;correo.com).</small>
              </div>
           </div>
           
           <div class="form-group">
              <label>Contraseña</label>
              <div class="password-wrap">
                 <input [type]="showPassword() ? 'text' : 'password'" formControlName="password" class="form-control"
                        [class.error]="loginForm.get('password')?.invalid && (loginForm.get('password')?.touched || isSubmitted)">
                 <button type="button" class="btn-toggle-pw" (click)="togglePassword()">
                    <svg *ngIf="!showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg *ngIf="showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                 </button>
              </div>
              <div *ngIf="loginForm.get('password')?.invalid && (loginForm.get('password')?.touched || isSubmitted)">
                <small class="error-text" *ngIf="loginForm.get('password')?.hasError('required')">Necesitamos tu contraseña para entrar de forma segura.</small>
                <small class="error-text" *ngIf="!loginForm.get('password')?.hasError('required') && loginForm.get('password')?.hasError('minlength')">La contraseña debe tener al menos 6 caracteres.</small>
              </div>
           </div>

           <!-- Error State -->
           <div class="auth-error-msg fade-in" *ngIf="store.error()">
              <span>⚠️</span> {{ store.error() }}
           </div>
           
           <button type="submit" class="btn btn-primary btn-block" [disabled]="store.loading()">
              {{ store.loading() ? 'Iniciando...' : 'Ingresar' }}
           </button>
           
           <div class="divider"><span>O</span></div>
           
           <button type="button" (click)="onGoogleLogin()" class="btn btn-google btn-block" [disabled]="store.loading()">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
              Continuar con Google
           </button>
        </form>
        
        <div class="login-footer">
           <a (click)="onResetPassword()" class="link-ptr">¿Olvidaste tu contraseña?</a>
           <span>¿No tienes cuenta? <a routerLink="/signup" class="link-ptr">Regístrate</a></span>
        </div>
      </div>
    </div>
  `,
   styles: [`
    .login-wrapper {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(rgba(139, 69, 19, 0.05), rgba(230, 126, 34, 0.05));
      padding: 2rem; position: relative;
    }
    .btn-back {
      position: absolute; top: 2rem; left: 2rem; display: flex; align-items: center; gap: 0.5rem;
      background: white; border: 2px solid var(--primary); color: var(--primary);
      padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;
      transition: var(--transition-smooth);
    }
    .btn-back:hover {
      background: var(--primary); color: white; transform: translateX(-5px);
    }
    .login-card {
      background: white; width: 100%; max-width: 450px; padding: 3rem;
      border-radius: var(--radius-lg); border: 1px solid #eee; text-align: center;
    }
    .login-logo { width: 100%; height: 100%; object-fit: contain; }
    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .logo-inner {
      width: 120px;
      height: 120px;
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
    .login-header h2 { font-size: 2rem; color: var(--primary); }
    .login-form { text-align: left; margin-top: 2rem; }
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
    .login-footer { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem; }
    .login-footer .link-ptr { color: var(--primary); font-weight: 600; cursor: pointer; text-decoration: underline; }
  `]
})
export class LoginComponent {
   private fb = inject(FormBuilder);
   private authService = inject(AuthService);
   public store = inject(AuthStore);
   private toastService = inject(ToastService);
   private location = inject(Location);

   loginForm: FormGroup;
   showPassword = signal(false);
   isSubmitted = false;

   constructor() {
      this.loginForm = this.fb.group({
         email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
         password: ['', [Validators.required, Validators.minLength(6)]]
      });
   }

   togglePassword() { this.showPassword.set(!this.showPassword()); }

   async onLogin() {
      this.isSubmitted = true;
      this.loginForm.markAllAsTouched();

      if (this.loginForm.valid) {
         const { email, password } = this.loginForm.value;
         await this.authService.login(email, password);
      }
   }

   async onGoogleLogin() {
      await this.authService.loginWithGoogle();
   }

   async onResetPassword() {
      const email = this.loginForm.get('email')?.value;
      if (!email) {
         this.toastService.info("Introduce tu email para resetear la contraseña.");
         return;
      }
      try {
         await this.authService.resetPassword(email);
         this.toastService.success("Email de recuperación enviado. Revisa tu bandeja de entrada.");
      } catch (err: any) {
         const friendlyMsg = err.message || 'Error al restablecer la contraseña';
         this.toastService.error(friendlyMsg);
      }
   }

   goBack() {
      this.location.back();
   }
}
