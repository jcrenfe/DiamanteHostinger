import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService, ConfirmDialogData } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="service.isOpen()" (click)="service.cancel()">
      <div class="dialog-content shadow-lg" (click)="$event.stopPropagation()">
        <div class="dialog-icon" [class]="service.dialogData()?.type || 'warning'">
          <svg *ngIf="service.dialogData()?.type === 'danger'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg *ngIf="service.dialogData()?.type !== 'danger'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        
        <h3 class="dialog-title">{{ service.dialogData()?.title }}</h3>
        <p class="dialog-message">{{ service.dialogData()?.message }}</p>
        
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="service.cancel()">
            {{ service.dialogData()?.cancelText || 'Cancelar' }}
          </button>
          <button class="btn" [class.btn-danger]="service.dialogData()?.type === 'danger'" 
                  [class.btn-primary]="service.dialogData()?.type !== 'danger'"
                  (click)="service.confirm()">
            {{ service.dialogData()?.confirmText || 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 4000;
      animation: fadeIn 0.2s ease;
    }
    
    .dialog-content {
      background: white;
      padding: 2rem;
      border-radius: 16px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      animation: slideUp 0.3s ease;
    }
    
    .dialog-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    
    .dialog-icon.danger {
      background: #fef2f2;
      color: #dc2626;
    }
    
    .dialog-icon.warning {
      background: #fef3c7;
      color: #d97706;
    }
    
    .dialog-icon.info {
      background: #e0f2fe;
      color: #0284c7;
    }
    
    .dialog-title {
      font-family: var(--title-font, 'Playfair Display', serif);
      font-size: 1.5rem;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    
    .dialog-message {
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    
    .dialog-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: 0.2s;
    }
    
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
    
    .btn-secondary:hover {
      background: #e5e7eb;
    }
    
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    
    .btn-primary:hover {
      background: var(--primary-dark, #6b3d0f);
    }
    
    .btn-danger {
      background: #dc2626;
      color: white;
    }
    
    .btn-danger:hover {
      background: #b91c1c;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class ConfirmDialogComponent {
  service = inject(ConfirmDialogService);
}
