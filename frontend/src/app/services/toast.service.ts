import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    message: string;
    type: ToastType;
    id: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private counter = 0;

    show(message: string, type: ToastType = 'info', duration = 4000) {
        const id = this.counter++;
        const toast: Toast = { id, message, type };

        this.toasts.update(all => [...all, toast]);

        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    success(message: string) { this.show(message, 'success'); }
    error(message: string) { this.show(message, 'error'); }
    info(message: string) { this.show(message, 'info'); }
    warning(message: string) { this.show(message, 'warning'); }

    remove(id: number) {
        this.toasts.update(all => all.filter(t => t.id !== id));
    }
}
