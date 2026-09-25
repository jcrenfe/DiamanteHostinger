import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { OrderService } from '../../services/order.service';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  template: `
    <app-header></app-header>
    
    <main class="container section-padding">
      <h1 class="title-font page-title">Mis Pedidos</h1>
      <p class="text-muted">Aquí puedes ver el historial de tus desayunos y su estado actual.</p>

      <div class="orders-list mt-4" *ngIf="!loading(); else loader">
        <div class="order-card shadow-sm fade-in" *ngFor="let order of orders()">
          <div class="order-header">
            <div class="order-id">Pedido #{{ order.id.substring(0,8) }}</div>
            <span class="status-badge" [class]="order.status">{{ getStatusLabel(order.status) }}</span>
          </div>
          
          <div class="order-details">
            <div class="items">
              <ul>
                <li *ngFor="let item of order.items">
                  {{ item.quantity }}x {{ item.name || item.product?.name }}
                </li>
              </ul>
            </div>
            
            <div class="meta">
              <p><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Fecha: <strong>{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</strong></p>
              <p><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Entrega: {{ order.delivery_date }} ({{ order.delivery_timeSlot }})</p>
              <p class="total">Total: <span>{{ order.total | number:'1.2-2' }}€</span></p>
            </div>
          </div>
        </div>

        <div *ngIf="orders().length === 0" class="empty-state text-center p-5">
           <div class="empty-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
           <h3>Aún no has hecho ningún pedido</h3>
           <p>¡Nuestros desayunos artesanos te están esperando!</p>
           <button class="btn btn-primary mt-3" routerLink="/productos">Ver Catálogo</button>
        </div>
      </div>

      <ng-template #loader>
        <div class="text-center p-5">
          <p>Cargando tus pedidos...</p>
        </div>
      </ng-template>
    </main>
  `,
  styles: [`
    .page-title { color: var(--primary); margin-bottom: 0.5rem; }
    .order-card { background: white; border-radius: 12px; margin-bottom: 1.5rem; overflow: hidden; border: 1px solid #eee; }
    .order-header { 
      padding: 1rem 1.5rem; background: #fafafa; display: flex; 
      justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;
    }
    .order-id { font-weight: 700; color: var(--primary); }
    .status-badge { 
      padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; 
      font-weight: 800; text-transform: uppercase;
    }
    .status-badge.pending { background: #fff3cd; color: #856404; }
    .status-badge.paid { background: #d4edda; color: #155724; }
    .status-badge.delivered { background: #cce5ff; color: #004085; }

    .order-details { padding: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .items ul { list-style: none; padding: 0; margin: 0; font-size: 0.95rem; }
    .meta p { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-muted); }
    .total { border-top: 1px solid #f0f0f0; padding-top: 1rem; margin-top: 1rem !important; font-size: 1.1rem !important; color: var(--primary) !important; }
    .total span { font-weight: 800; color: var(--accent); }
    .empty-icon { font-size: 4rem; margin-bottom: 1rem; }

    @media (max-width: 600px) {
      .order-details { grid-template-columns: 1fr; gap: 1rem; }
    }
  `]
})
export class MyOrdersComponent {
  auth = inject(AuthStore);
  orderService = inject(OrderService);

  orders = signal<any[]>([]);
  loading = signal(true);

  constructor() {
    effect(async () => {
      const user = this.auth.user();
      const isAuthLoading = this.auth.loading();

      if (isAuthLoading) {
        this.loading.set(true);
        return;
      }

      if (user) {
        this.loading.set(true);
        const data = await this.orderService.getOrdersByUser();
        this.orders.set([...data].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
        this.loading.set(false);
      } else {
        this.orders.set([]);
        this.loading.set(false);
      }
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente de pago',
      failed: 'Pago fallido',
      refunded: 'Reembolsado',
      paid: 'Pagado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      canceled: 'Cancelado'
    };
    return map[status?.toLowerCase()] || status || '';
  }
}
