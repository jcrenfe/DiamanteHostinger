import { Component, Inject, PLATFORM_ID, OnInit, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cookie-banner shadow-lg" *ngIf="show()">
      <div class="container cookie-content" *ngIf="!showConfig()">
        <div class="cookie-text">
          <h4 class="title-font">Valoramos tu privacidad</h4>
          <p>Utilizamos cookies propias y de terceros. Las cookies <strong>básicas</strong> son estrictamente necesarias para el correcto funcionamiento del sitio. Las cookies de <strong>seguimiento</strong> nos ayudan a mejorar tu experiencia y ofrecer productos personalizados.
             Puedes decidir y cambiar tus preferencias en cualquier momento.</p>
        </div>
        <div class="cookie-actions">
          <button class="btn btn-secondary" (click)="acceptAll()">Aceptar Todo</button>
          <button class="btn btn-secondary" (click)="acceptBasic()">Solo Básicas</button>
          <button class="btn btn-secondary" (click)="toggleConfig()">Configurar</button>
        </div>
      </div>

      <div class="container cookie-config" *ngIf="showConfig()">
        <div class="config-header">
          <h4 class="title-font">Configuración de Cookies</h4>
          <button class="btn-close-icon" (click)="closeBanner()">✕</button>
        </div>
        
        <div class="cookie-options-list">
          <div class="cookie-option">
            <div class="cookie-option-text">
              <h5>Cookies Básicas (Obligatorias)</h5>
              <p>Son necesarias para permitir el funcionamiento básico del sitio, la seguridad y la gestión de la red.</p>
            </div>
            <div class="switch-container">
              <label class="switch disabled">
                <input type="checkbox" checked disabled>
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <div class="cookie-option">
            <div class="cookie-option-text">
              <h5>Cookies de Seguimiento</h5>
              <p>Se utilizan para realizar análisis estadísticos, evaluar el rendimiento y mostrarte contenido o publicidad relevante y personalizada.</p>
            </div>
            <div class="switch-container">
              <label class="switch">
                <input type="checkbox" [checked]="trackingEnabled()" (change)="onTrackingChange($event)">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="cookie-actions config-actions">
          <button class="btn btn-secondary" (click)="savePreferences()">Guardar Preferencias</button>
          <button class="btn btn-secondary" (click)="acceptAll()">Aceptar Todas</button>
        </div>
      </div>
    </div>

    <!-- Pestaña flotante para reabrir la configuración si ya se ha cerrado -->
    <button class="cookie-trigger shadow-sm" *ngIf="!show()" (click)="openConfig()" aria-label="Configurar Cookies">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
        <path d="M8.5 8.5v.01"></path>
        <path d="M16 12.5v.01"></path>
        <path d="M12 16v.01"></path>
        <path d="M11 12.5v.01"></path>
      </svg>
    </button>
  `,
  styles: [`
    .cookie-banner {
      position: fixed; bottom: 0; left: 0; width: 100%;
      background: white; border-top: 4px solid var(--primary);
      padding: 1.5rem 0; z-index: 3000; animation: slideUp 0.5s ease;
      box-shadow: 0 -4px 15px rgba(0,0,0,0.1);
    }
    .cookie-content {
      display: flex; justify-content: space-between; align-items: center; gap: 2rem;
    }
    .cookie-config {
      display: flex; flex-direction: column; gap: 1.5rem;
    }
    .config-header {
      display: flex; justify-content: space-between; align-items: center;
    }
    .config-header h4 { margin: 0; font-size: 1.25rem; color: var(--primary); }
    .btn-close-icon {
      background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
    }
    .btn-close-icon:hover { color: var(--text-color); }
    .cookie-options-list {
      display: flex; flex-direction: column; gap: 1rem;
    }
    .cookie-option {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem; background: var(--bg-color); border-radius: 8px; border: 1px solid rgba(0,0,0,0.05); gap: 1rem;
    }
    .cookie-option-text h5 { margin: 0 0 0.25rem; font-size: 1rem; color: var(--text-color); }
    .cookie-option-text p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    
    .cookie-text h4 { margin: 0 0 0.5rem; font-size: 1.25rem; color: var(--primary); }
    .cookie-text p { font-size: 0.9rem; color: var(--text-muted); margin: 0; line-height: 1.5; }
    
    .cookie-actions { display: grid; grid-auto-columns: 1fr; grid-auto-flow: column; gap: 1rem; width: 100%; }
    .config-actions { grid-template-columns: 1fr 1fr; grid-auto-flow: row; }
    
    .cookie-actions .btn { width: 100%; white-space: nowrap; padding: 0.8rem 1rem; text-align: center; }
    
    /* Toggle Switch */
    .switch-container { display: flex; align-items: center; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
    input:checked + .slider { background-color: var(--primary); }
    input:focus + .slider { box-shadow: 0 0 1px var(--primary); }
    input:checked + .slider:before { transform: translateX(20px); }
    .slider.round { border-radius: 24px; }
    .slider.round:before { border-radius: 50%; }
    .switch.disabled .slider { background-color: #d1bfae; cursor: not-allowed; opacity: 0.6; }

    /* Floating trigger */
    .cookie-trigger {
      position: fixed; bottom: 20px; left: 20px; z-index: 2999;
      background: white; border: 2px solid var(--primary); border-radius: 50%;
      width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--primary); transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      padding: 0 !important; /* Overrides global btn padding */
    }
    .cookie-trigger:hover {
      transform: scale(1.1); background: var(--primary); color: white;
    }
    .cookie-trigger svg { width: 24px; height: 24px; }

    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    
    @media (max-width: 900px) {
      .cookie-banner { padding: 1.5rem 1rem; }
      .cookie-content { flex-direction: column; text-align: left; align-items: flex-start; }
      .cookie-actions { grid-auto-flow: row; grid-template-columns: 1fr; }
      .config-actions { grid-template-columns: 1fr; }
      .cookie-option { flex-direction: column; align-items: flex-start; }
      .switch-container { align-self: flex-end; margin-top: -30px; }
    }
  `]
})
export class CookieBannerComponent implements OnInit {
  show = signal(false);
  showConfig = signal(false);
  trackingEnabled = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkConsent();
    }
  }

  checkConsent() {
    const consent = localStorage.getItem('cookiePreferences');
    if (!consent) {
      setTimeout(() => {
        this.show.set(true);
        this.showConfig.set(false);
      }, 1500);
    } else {
      try {
        const prefs = JSON.parse(consent);
        this.trackingEnabled.set(prefs.tracking);
      } catch (e) {
        this.show.set(true);
      }
    }
  }

  acceptAll() {
    if (isPlatformBrowser(this.platformId)) {
      const prefs = { basic: true, tracking: true };
      localStorage.setItem('cookiePreferences', JSON.stringify(prefs));
      this.trackingEnabled.set(true);
      this.closeBanner();
    }
  }

  acceptBasic() {
    if (isPlatformBrowser(this.platformId)) {
      const prefs = { basic: true, tracking: false };
      localStorage.setItem('cookiePreferences', JSON.stringify(prefs));
      this.trackingEnabled.set(false);
      this.closeBanner();
    }
  }

  toggleConfig() {
    this.showConfig.set(!this.showConfig());
  }

  openConfig() {
    if (isPlatformBrowser(this.platformId)) {
      const consent = localStorage.getItem('cookiePreferences');
      if (consent) {
        try {
          const prefs = JSON.parse(consent);
          this.trackingEnabled.set(prefs.tracking);
        } catch (e) { }
      }
    }
    this.showConfig.set(true);
    this.show.set(true);
  }

  onTrackingChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.trackingEnabled.set(input.checked);
  }

  savePreferences() {
    if (isPlatformBrowser(this.platformId)) {
      const prefs = { basic: true, tracking: this.trackingEnabled() };
      localStorage.setItem('cookiePreferences', JSON.stringify(prefs));
      this.closeBanner();
    }
  }

  closeBanner() {
    this.show.set(false);
  }
}

