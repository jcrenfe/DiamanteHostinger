import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      <div *ngFor="let t of service.toasts()" 
           class="toast-item shadow-lg" 
           [ngClass]="t.type"
           (click)="service.remove(t.id)">
        <div class="toast-icon">
          <svg *ngIf="t.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <svg *ngIf="t.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <svg *ngIf="t.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
        <div class="toast-message">{{ t.message }}</div>
        <button class="toast-close">&times;</button>
      </div>
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      min-width: 300px;
      max-width: 450px;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: white;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      border-left: 6px solid #ccc;
      transition: transform 0.2s, opacity 0.2s;
    }
    .toast-item:hover {
      transform: translateY(-2px);
    }
    .toast-item.success { border-left-color: #27ae60; background: #f0fff4; }
    .toast-item.error { border-left-color: #c0392b; background: #fff5f5; }
    .toast-item.info { border-left-color: #2980b9; background: #f0f7ff; }

    .toast-icon { width: 24px; height: 24px; flex-shrink: 0; }
    .toast-icon.success { color: #27ae60; }
    .toast-icon.error { color: #c0392b; }
    .toast-icon.info { color: #2980b9; }
    
    .toast-message {
      flex-grow: 1;
      font-size: 0.95rem;
      font-weight: 500;
      color: #2c3e50;
    }
    .toast-close {
      background: none; border: none; font-size: 1.5rem; color: #999; cursor: pointer;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @media (max-width: 600px) {
      .toast-container {
        top: auto; bottom: 24px; left: 12px; right: 12px;
      }
      .toast-item { min-width: 0; width: 100%; }
    }
  `]
})
export class ToastComponent {
    service = inject(ToastService);
}
