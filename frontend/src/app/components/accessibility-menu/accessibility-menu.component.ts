import { Component, Inject, PLATFORM_ID, OnInit, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
    selector: 'app-accessibility-menu',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="a11y-container">
        <button class="a11y-btn" (click)="toggleMenu()" aria-label="Opciones de accesibilidad">
            <svg class="a11y-svg" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"></path>
            </svg>
        </button>

        <div class="a11y-dropdown shadow-lg" *ngIf="isOpen()">
            <div class="a11y-header">
                <h3>Accesibilidad</h3>
                <button class="close-btn" (click)="toggleMenu()" aria-label="Cerrar menú">&times;</button>
            </div>
            <div class="a11y-body">
                <div class="a11y-section">
                    <label>Tamaño del Texto</label>
                    <div class="font-size-btns">
                        <button [class.active]="settings.fontSizeLevel === 0" (click)="setFontSizeLevel(0)">A</button>
                        <button [class.active]="settings.fontSizeLevel === 1" (click)="setFontSizeLevel(1)">A+</button>
                        <button [class.active]="settings.fontSizeLevel === 2" (click)="setFontSizeLevel(2)">A++</button>
                        <button [class.active]="settings.fontSizeLevel === 3" (click)="setFontSizeLevel(3)">A+++</button>
                    </div>
                </div>
                <div class="a11y-grid">
                    <button class="toggle-setting" [class.active]="settings.contrast" (click)="toggleSetting('contrast')">
                       <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0 0 20"></path></svg></span> Contraste
                    </button>
                    <button class="toggle-setting" [class.active]="settings.grayscale" (click)="toggleSetting('grayscale')">
                       <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg></span> Blanco/Negro
                    </button>
                    <button class="toggle-setting" [class.active]="settings.highlightLinks" (click)="toggleSetting('highlightLinks')">
                       <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></span> Enlaces
                    </button>
                    <button class="toggle-setting" [class.active]="settings.darkMode" (click)="toggleSetting('darkMode')">
                       <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></span> Oscuro
                    </button>
                </div>
                <button class="reset-btn" (click)="resetSettings()">
                    Restablecer valores
                </button>
            </div>
        </div>
    </div>
    `,
    styles: [`
        .a11y-container { 
            position: fixed; 
            right: 25px; 
            bottom: 30px; 
            z-index: 9999; 
            pointer-events: none; 
        }
        .a11y-btn {
            pointer-events: auto;
            background: var(--surface);
            width: 60px; height: 60px; 
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            border: 3px solid var(--primary); 
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            transition: var(--transition-smooth);
            cursor: pointer;
            color: var(--primary);
            padding: 0;
            outline: none;
            will-change: transform;
        }
        .a11y-btn:hover { 
            background: var(--primary);
            color: var(--surface);
            border-color: var(--primary);
            transform: translateY(-5px); 
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .a11y-svg { width: 34px; height: 34px; }
        .a11y-dropdown {
            pointer-events: auto;
            position: absolute; bottom: 75px; right: 0; width: 320px;
            background: white; border-radius: var(--radius-lg); padding: 1.5rem;
            border: 1px solid #eee; 
            box-shadow: 0 15px 50px rgba(0,0,0,0.2);
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .a11y-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 1.25rem; border-bottom: 1px solid #f5f5f5; padding-bottom: 0.75rem;
        }
        .a11y-header h3 { font-size: 1.2rem; margin: 0; color: var(--primary); font-family: var(--font-title); }
        .close-btn { background: none; border: none; font-size: 2rem; cursor: pointer; color: #ccc; line-height: 1; }
        .close-btn:hover { color: var(--accent); }
        .a11y-section { margin-bottom: 1.5rem; }
        .a11y-section label { display: block; font-size: 0.9rem; font-weight: 700; color: #555; margin-bottom: 0.75rem; }
        .font-size-btns { display: flex; gap: 0.5rem; }
        .font-size-btns button {
            flex: 1; padding: 0.75rem 0.2rem; background: #f9f9f9; border: 1px solid #eee; border-radius: 10px;
            font-weight: 800; cursor: pointer; transition: 0.2s; color: var(--text-dark);
        }
        .font-size-btns button.active { background: var(--primary); color: white; border-color: var(--primary); }
        .a11y-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .toggle-setting {
            text-align: left; padding: 1rem;
            background: #f9f9f9; border: 1px solid #eee; border-radius: 12px;
            font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.3s;
            display: flex; flex-direction: column; gap: 0.5rem;
        }
        .toggle-setting .icon { font-size: 1.4rem; }
        .toggle-setting.active { background: var(--primary); color: white; border-color: var(--primary); }
        .reset-btn {
            width: 100%; padding: 1rem; background: #fff;
            border: 2px dashed #ddd; color: #888;
            border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .reset-btn:hover { border-color: var(--accent); color: var(--accent); background: #fff5f5; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
            .a11y-container { right: 15px; bottom: 15px; }
            .a11y-btn { width: 50px; height: 50px; }
            .a11y-svg { width: 24px; height: 24px; }
            .a11y-dropdown { width: 280px; bottom: 65px; padding: 1rem; }
        }
    `]
})
export class AccessibilityMenuComponent implements OnInit {
    isOpen = signal(false);

    settings = {
        contrast: false,
        grayscale: false,
        fontSizeLevel: 0,
        highlightLinks: false,
        darkMode: false
    };

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const savedSettings = localStorage.getItem('a11ySettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                this.applySettings();
            }
        }
    }

    toggleMenu() { this.isOpen.set(!this.isOpen()); }

    toggleSetting(setting: 'contrast' | 'grayscale' | 'highlightLinks' | 'darkMode') {
        (this.settings as any)[setting] = !(this.settings as any)[setting];
        this.saveAndApply();
    }

    setFontSizeLevel(level: number) {
        this.settings.fontSizeLevel = level;
        this.saveAndApply();
    }

    resetSettings() {
        this.settings = {
            contrast: false,
            grayscale: false,
            fontSizeLevel: 0,
            highlightLinks: false,
            darkMode: false
        };
        this.saveAndApply();
    }

    private saveAndApply() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('a11ySettings', JSON.stringify(this.settings));
            this.applySettings();
        }
    }

    applySettings() {
        if (isPlatformBrowser(this.platformId)) {
            const body = document.body;
            this.settings.contrast ? body.classList.add('high-contrast') : body.classList.remove('high-contrast');
            this.settings.grayscale ? body.classList.add('grayscale') : body.classList.remove('grayscale');
            this.settings.highlightLinks ? body.classList.add('highlight-links') : body.classList.remove('highlight-links');
            this.settings.darkMode ? body.classList.add('dark-mode') : body.classList.remove('dark-mode');
            body.classList.remove('font-size-1', 'font-size-2', 'font-size-3');
            if (this.settings.fontSizeLevel > 0) body.classList.add(`font-size-${this.settings.fontSizeLevel}`);
        }
    }
}
