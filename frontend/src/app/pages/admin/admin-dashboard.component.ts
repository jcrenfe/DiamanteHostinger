import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-stats grid">
      <div class="stat-card shadow-sm">
        <div class="stat-icon red"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
        <div class="stat-info">
          <span class="label">Pedidos Totales</span>
          <h3 class="value">{{ totalOrders() }}</h3>
        </div>
      </div>
      
      <div class="stat-card shadow-sm">
        <div class="stat-icon gold"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
        <div class="stat-info">
          <span class="label">Productos Activos</span>
          <h3 class="value">{{ totalProducts() }}</h3>
        </div>
      </div>

      <div class="stat-card shadow-sm">
        <div class="stat-icon green"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
        <div class="stat-info">
          <span class="label">Ventas Totales</span>
          <h3 class="value">{{ totalRevenue() | number:'1.2-2' }}€</h3>
        </div>
      </div>
    </div>

    <div class="dashboard-sections mt-5">
      <div class="recent-orders-card shadow-sm">
        <h3 class="title-font section-title">Pedidos Recientes</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of recentOrders()">
                <td>{{ order.customer_name || 'Sin nombre' }}</td>
                <td>{{ (order.createdAt | date:'short') || order.createdAt }}</td>
                <td>{{ order.total | number:'1.2-2' }}€</td>
                <td><span class="status-badge" [class]="order.status">{{ getStatusLabel(order.status) }}</span></td>
              </tr>
              <tr *ngIf="recentOrders().length === 0">
                <td colspan="4" class="text-center">No hay pedidos recientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
    .stat-card { background: white; padding: 2rem; border-radius: 12px; display: flex; align-items: center; gap: 1.5rem; }
    .stat-icon { width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    .stat-icon.red { background: #fee2e2; }
    .stat-icon.gold { background: #fef3c7; }
    .stat-icon.green { background: #dcfce7; }
    .label { color: var(--text-muted); font-size: 0.9rem; font-weight: 600; text-transform: uppercase; }
    .value { margin: 0; font-size: 1.8rem; color: var(--primary); }

    .recent-orders-card { background: white; padding: 2.5rem; border-radius: 12px; }
    .section-title { margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 1rem; border-bottom: 2px solid #f4f7f6; color: var(--text-muted); font-size: 0.85rem; }
    td { padding: 1.2rem 1rem; border-bottom: 1px solid #f4f7f6; font-size: 0.95rem; }
    .status-badge { padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
    .status-badge.pending { background: #fff3cd; color: #856404; }
    .status-badge.paid { background: #d4edda; color: #155724; }
    .mt-5 { margin-top: 3rem; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  totalOrders = signal(0);
  totalProducts = signal(0);
  totalRevenue = signal(0);
  recentOrders = signal<any[]>([]);

  private orderService = inject(OrderService);
  private http = inject(HttpClient);

  async ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    // Orders
    const orders = await this.orderService.getAllOrders();
    this.totalOrders.set(orders.length);

    let rev = 0;
    orders.forEach(data => {
      rev += Number(data['total']) || 0;
    });
    this.totalRevenue.set(rev);

    // Sort recent
    this.recentOrders.set(orders.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
    }).slice(0, 5));

    // Products
    try {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        const products = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/products`, { headers })) || [];
        this.totalProducts.set(products.length);
    } catch(e) {
        this.totalProducts.set(0);
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      canceled: 'Cancelado'
    };
    return map[status?.toLowerCase()] || status || '';
  }
}
