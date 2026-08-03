import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  isOpen = signal(false);
  dialogData = signal<ConfirmDialogData | null>(null);
  private resolve: ((confirmed: boolean) => void) | null = null;

  open(data: ConfirmDialogData): Promise<boolean> {
    this.dialogData.set(data);
    this.isOpen.set(true);
    
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  confirm() {
    this.isOpen.set(false);
    if (this.resolve) {
      this.resolve(true);
      this.resolve = null;
    }
    this.dialogData.set(null);
  }

  cancel() {
    this.isOpen.set(false);
    if (this.resolve) {
      this.resolve(false);
      this.resolve = null;
    }
    this.dialogData.set(null);
  }
}
