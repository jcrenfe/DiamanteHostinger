import { Component, signal, inject, AfterViewInit, OnDestroy, PLATFORM_ID, NgZone, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../../components/header/header.component';

import { functions } from '../../app.firebase';
import { httpsCallable } from 'firebase/functions';

declare var turnstile: any;

@Component({
   selector: 'app-contacto',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
   template: `
    <app-header></app-header>
    <main class="container section-padding fade-in">
       <div class="contact-grid">
          <section class="contact-form-section">
             <h1 class="title-font">Escríbenos con Cariño</h1>
             <p class="text-muted">¿Tienes una duda especial? Estamos aquí para ayudarte a crear el momento perfecto.</p>
             
             <form [formGroup]="contactForm" (ngSubmit)="onSubmit()" class="contact-form">
                <div class="form-row">
                   <div class="form-group flex-1">
                      <label>Nombre</label>
                      <input type="text" formControlName="nombre" class="form-control" [class.error]="isSubmitted() && contactForm.get('nombre')?.invalid">
                      <small class="error-text" *ngIf="isSubmitted() && contactForm.get('nombre')?.invalid">El nombre es obligatorio.</small>
                   </div>
                   <div class="form-group flex-1">
                      <label>Email</label>
                      <input type="email" formControlName="email" class="form-control" [class.error]="isSubmitted() && contactForm.get('email')?.invalid">
                      <small class="error-text" *ngIf="isSubmitted() && contactForm.get('email')?.invalid">Email no válido.</small>
                   </div>
                </div>
                
                <div class="form-group">
                   <label>Asunto / Tipo de Cita</label>
                   <select formControlName="asunto" class="form-control">
                      <option value="Duda General">Duda General</option>
                      <option value="Pedido Especial">Pedido Especial</option>
                      <option value="Solicitar Cita Previa">Solicitar Cita Previa</option>
                   </select>
                </div>
                
                <div class="form-group">
                   <label>Mensaje</label>
                   <textarea formControlName="mensaje" class="form-control" rows="5" placeholder="Cuéntanos..."></textarea>
                   <small class="error-text" *ngIf="isSubmitted() && contactForm.get('mensaje')?.invalid">El mensaje es obligatorio.</small>
                </div>

                <div class="form-group checkbox-group">
                   <label class="checkbox-container">
                      <input type="checkbox" formControlName="privacidad">
                      <span class="checkmark"></span>
                      Acepo la <a href="/politica-privacidad" target="_blank">política de privacidad</a>.
                   </label>
                   <small class="error-text" *ngIf="isSubmitted() && contactForm.get('privacidad')?.invalid">Debes aceptar la política de privacidad.</small>
                </div>

                <!-- Cloudflare Turnstile Container -->
                <div class="captcha-box" [class.error-box]="isSubmitted() && !turnstileToken()">
                   <div id="turnstile-container"></div>
                   <small class="error-text" *ngIf="isSubmitted() && !turnstileToken()">Por favor, verifica que no eres un robot.</small>
                </div>

                <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="isSending()">
                   {{ isSending() ? 'Enviando...' : 'Enviar Mensaje' }}
                </button>

                <!-- Feedback Messages -->
                <div class="feedback-msg success fade-in" *ngIf="submitSuccess()">
                   <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span> ¡Mensaje enviado con éxito! Te responderemos pronto.
                </div>
                <div class="feedback-msg error fade-in" *ngIf="submitError()">
                   <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span> Hubo un error al enviar el mensaje. Inténtalo de nuevo.
                </div>
             </form>
          </section>

          <aside class="appointment-card shadow-lg">
             <h3 class="title-font">Reserva tu Cita</h3>
             <p>¿Quieres venir a elegir tu cesta o planear un evento? Selecciona un día.</p>
             
             <div class="calendar-mock">
                <div class="cal-header">
                   <span>Marzo 2026</span>
                </div>
                <div class="cal-grid">
                   <div class="cal-day disabled">2</div>
                   <div class="cal-day selected">3</div>
                   <div class="cal-day">4</div>
                   <div class="cal-day">5</div>
                   <div class="cal-day active">6</div>
                   <div class="cal-day">7</div>
                   <div class="cal-day disabled">8</div>
                </div>
             </div>

             <div class="time-slots">
                <span class="small-title">Horarios Disponibles</span>
                <div class="slots-grid">
                   <button class="slot highlight">09:30</button>
                   <button class="slot">10:00</button>
                   <button class="slot disabled">10:30</button>
                   <button class="slot">11:00</button>
                </div>
             </div>
             
             <button class="btn btn-secondary btn-block" style="margin-top: 2rem;">Confirmar Cita</button>
          </aside>
       </div>
    </main>
  `,
   styles: [`
    .contact-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 5rem; align-items: start; }
    .contact-form { margin-top: 2.5rem; }
    .form-row { display: flex; gap: 1.5rem; }
    .flex-1 { flex: 1; }
    .form-group { margin-bottom: 2rem; position: relative; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--primary); }
    .form-control { width: 100%; padding: 1rem; border: 2px solid #eee; border-radius: 12px; font-family: inherit; font-size: 1rem; transition: 0.3s; }
    .form-control:focus { border-color: var(--secondary); outline: none; box-shadow: 0 0 10px rgba(230, 126, 34, 0.1); }
    .form-control.error { border-color: var(--accent); }
    .error-text { color: var(--accent); font-size: 0.8rem; font-weight: 600; margin-top: 0.4rem; display: block; }
    
    .checkbox-group { margin-top: -1rem; }
    .checkbox-container { display: flex; align-items: center; gap: 1rem; cursor: pointer; user-select: none; font-size: 0.9rem; }
    .checkbox-container a { color: var(--secondary); font-weight: 600; text-decoration: underline; }

    .captcha-box { margin-bottom: 2rem; padding: 1rem; border: 1px solid #eee; border-radius: 12px; background: #fafafa; }
    .captcha-box.error-box { border-color: var(--accent); background: rgba(192, 57, 43, 0.05); }

    .appointment-card { background: white; padding: 3rem; border-radius: var(--radius-lg); border: 1px solid var(--primary); }
    .calendar-mock { margin: 2rem 0; border: 1px solid #eee; border-radius: 12px; overflow: hidden; }
    .cal-header { background: var(--primary); color: white; padding: 1rem; text-align: center; font-weight: 700; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 1rem; gap: 0.5rem; text-align: center; }
    .cal-day { padding: 0.8rem 0; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
    .cal-day.active { background: var(--secondary); color: white; }
    .cal-day.selected { border: 2px solid var(--primary); }
    .cal-day.disabled { opacity: 0.3; cursor: not-allowed; }
    
    .time-slots { margin-top: 2rem; }
    .small-title { display: block; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 1rem; }
    .slots-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .slot { padding: 0.8rem; background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .slot.highlight { border-color: var(--primary); color: var(--primary); background: rgba(139, 69, 19, 0.05); }
    .slot.disabled { opacity: 0.3; text-decoration: line-through; cursor: not-allowed; }

    .feedback-msg { margin-top: 2rem; padding: 1.2rem; border-radius: 12px; font-weight: 600; display: flex; align-items: center; gap: 1rem; }
    .feedback-msg.success { background: #E8F5E9; color: #2E7D32; border: 1px solid #A5D6A7; }
    .feedback-msg.error { background: #FFEBEE; color: #C62828; border: 1px solid #EF9A9A; }
    .feedback-msg .icon { font-size: 1.5rem; }

    .btn-block { width: 100%; }
    @media (max-width: 992px) { .contact-grid { grid-template-columns: 1fr; gap: 4rem; } }
  `]
})
export class ContactoComponent implements AfterViewInit, OnDestroy {
   private fb = inject(FormBuilder);
   private http = inject(HttpClient);
   private ngZone = inject(NgZone);
   private platformId = inject(PLATFORM_ID);

   contactForm: FormGroup;
   isSubmitted = signal(false);
   isSending = signal(false);
   submitSuccess = signal(false);
   submitError = signal(false);
   turnstileToken = signal<string | null>(null);

   private widgetId: string | null = null;
   private readonly SITE_KEY = '1x00000000000000000000AA'; // Test Key

   constructor() {
      this.contactForm = this.fb.group({
         nombre: ['', Validators.required],
         email: ['', [Validators.required, Validators.email]],
         asunto: ['Duda General'],
         mensaje: ['', [Validators.required, Validators.minLength(10)]],
         privacidad: [false, Validators.requiredTrue]
      });
   }

   ngAfterViewInit() {
      if (isPlatformBrowser(this.platformId)) {
         this.loadTurnstileScript();
      }
   }

   ngOnDestroy() {
      if (isPlatformBrowser(this.platformId) && typeof turnstile !== 'undefined' && this.widgetId) {
         turnstile.remove(this.widgetId);
      }
   }

   private loadTurnstileScript() {
      if (typeof turnstile !== 'undefined') {
         this.renderTurnstile();
         return;
      }
      const scriptId = 'cloudflare-turnstile-script';
      if (!document.getElementById(scriptId)) {
         const script = document.createElement('script');
         script.id = scriptId;
         script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
         script.async = true;
         script.defer = true;
         script.onload = () => this.renderTurnstile();
         document.head.appendChild(script);
      }
   }

   renderTurnstile() {
      setTimeout(() => {
         const container = document.getElementById('turnstile-container');
         if (container && typeof turnstile !== 'undefined' && !this.widgetId) {
            try {
               this.widgetId = turnstile.render('#turnstile-container', {
                  sitekey: this.SITE_KEY,
                  callback: (token: string) => {
                     this.ngZone.run(() => {
                        this.turnstileToken.set(token);
                     });
                  }
               });
            } catch (e) {
            }
         }
      }, 100);
   }

   async onSubmit() {
      this.isSubmitted.set(true);

      if (this.contactForm.valid && this.turnstileToken()) {
         this.isSending.set(true);
         this.submitSuccess.set(false);
         this.submitError.set(false);

         // Uso de Firebase HTTPS Callable en lugar de HttpClient puro
         const sendContactEmail = httpsCallable(functions, 'sendContact');
         
         const payload = {
            ...this.contactForm.value,
            captchaToken: this.turnstileToken()
         };

         try {
             await sendContactEmail(payload);
             this.submitSuccess.set(true);
             this.resetForm();
         } catch (err) {
             this.submitError.set(true);
             this.isSending.set(false);
         }
      }
   }

   private resetForm() {
      this.contactForm.reset({ asunto: 'Duda General', privacidad: false });
      this.isSubmitted.set(false);
      this.isSending.set(false);
      this.turnstileToken.set(null);
      if (typeof turnstile !== 'undefined' && this.widgetId) {
         turnstile.reset(this.widgetId);
      }
      setTimeout(() => this.submitSuccess.set(false), 8000);
   }
}
