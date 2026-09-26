import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { LogisticsService, RoutePlan } from '../../services/logistics.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-route-optimizer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="route-optimizer">
      <h2 class="title-font">Ruta de Reparto</h2>
      <p class="text-muted">Elige los pedidos que vas a entregar y calcula el mejor orden para un repartidor, respetando la franja horaria de cada entrega.</p>

      <div class="controls-card shadow-sm mt-4 fade-in">
        <div class="controls-grid">
          <div class="form-group">
            <label>Fecha de Reparto</label>
            <input type="date" [(ngModel)]="selectedDate" name="date" (change)="loadOrders()">
          </div>
          <div class="form-group">
            <label>Tiempo por entrega (minutos)</label>
            <input type="number" [(ngModel)]="margin" name="margin" min="0" max="60">
          </div>
        </div>

        <div class="orders-pick mt-4" *ngIf="orders().length > 0">
          <div class="pick-header">
            <strong>Pedidos del día ({{ selectedCount() }} de {{ orders().length }} elegidos)</strong>
            <span class="pick-actions">
              <button type="button" class="link-btn" (click)="selectAll()">Todos</button>
              <button type="button" class="link-btn" (click)="selectNone()">Ninguno</button>
            </span>
          </div>
          <label class="pick-row" *ngFor="let o of orders()" [class.checked]="isSelected(o.id)">
            <input type="checkbox" [checked]="isSelected(o.id)" (change)="toggle(o.id)">
            <span class="pick-time">{{ o.delivery_timeSlot }}</span>
            <span class="pick-info">
              <strong>{{ o.customer_name }}</strong>
              <small>{{ o.delivery_address }}, {{ o.delivery_city }}<span *ngIf="o.delivery_addressExtra"> ({{ o.delivery_addressExtra }})</span></small>
            </span>
            <span class="pick-status" [class.unpaid]="o.status === 'pending'">{{ statusLabel(o.status) }}</span>
          </label>
        </div>

        <div class="actions mt-4">
           <button class="btn btn-primary" (click)="calculate()" [disabled]="selectedCount() === 0 || loading()">
             {{ loading() ? 'Calculando con Google Maps...' : 'Calcular Ruta' }}
           </button>
           <small class="text-muted ml-2" *ngIf="selectedCount() === 0 && orders().length > 0">Elige al menos un pedido.</small>
        </div>
      </div>

      <div class="route-card shadow-sm mt-5 fade-in" *ngIf="result() as r">
        <div class="route-header">
          <h3>Ruta recomendada</h3>
          <div class="probability-score" [class.low]="r.warnings.length > 0">
             {{ r.warnings.length ? r.warnings.length + ' aviso(s)' : 'Todas las franjas se cumplen' }}
          </div>
        </div>

        <div class="route-stats">
          <div class="stat"><span>🚐 Salida:</span> <strong>{{ r.departure }}</strong></div>
          <div class="stat"><span>🏁 Última entrega:</span> <strong>{{ r.end }}</strong></div>
          <div class="stat"><span>⏱️ Conducción:</span> <strong>{{ r.totalDrivingMinutes }} min</strong></div>
          <div class="stat"><span>🛤️ Distancia:</span> <strong>{{ r.totalDistanceKm | number:'1.1-1' }} km</strong></div>
        </div>

        <div class="warnings" *ngIf="r.warnings.length">
          <div *ngFor="let w of r.warnings">⚠️ {{ warningLabel(w.id, w.message) }}</div>
        </div>

        <div class="order-sequence mt-3">
           <div class="origin-line">📍 Salida desde: {{ r.origin }}</div>
           <div class="sequence-item" *ngFor="let s of r.stops; let idx = index">
              <span class="step">{{ idx + 1 }}</span>
              <div class="info">
                 <div class="time">Llegada {{ s.eta }} <small class="slot">(franja {{ s.timeSlot }})</small></div>
                 <div class="addr">{{ s.customer_name }} · {{ s.customer_phone }}</div>
                 <div class="addr">{{ s.address }}<span *ngIf="s.addressExtra"> — {{ s.addressExtra }}</span></div>
                 <div class="leg">🚗 {{ s.legMinutes }} min · {{ s.legKm | number:'1.1-1' }} km desde la parada anterior
                   <span *ngIf="s.waitMin > 0"> · esperar {{ s.waitMin }} min</span>
                   <span class="late" *ngIf="s.lateMin > 0"> · {{ s.lateMin }} min tarde</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div *ngIf="orders().length === 0 && selectedDate" class="text-center p-5 mt-4 bg-white rounded shadow-sm">
         <p>No hay pedidos para entregar el día {{ selectedDate | date:'fullDate' }}.</p>
      </div>
    </div>
  `,
    styles: [`
    .controls-card { background: white; padding: 2.5rem; border-radius: 12px; }
    .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-weight: 600; font-size: 0.9rem; color: var(--primary); }
    input[type=date], input[type=number] { padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }

    .pick-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; color: var(--primary); }
    .link-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-weight: 600; margin-left: 0.8rem; }
    .pick-row { display: flex; align-items: center; gap: 0.9rem; padding: 0.7rem 0.9rem; border: 1px solid #eee; border-radius: 10px; margin-bottom: 0.5rem; cursor: pointer; font-weight: 400; }
    .pick-row.checked { background: #fdf6ee; border-color: var(--accent); }
    .pick-row input { width: 18px; height: 18px; }
    .pick-time { font-weight: 800; color: var(--accent); min-width: 3.2rem; }
    .pick-info { flex: 1; display: flex; flex-direction: column; color: #333; }
    .pick-info small { color: #666; }
    .pick-status { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 12px; background: #dcfce7; color: #166534; font-weight: 700; white-space: nowrap; }
    .pick-status.unpaid { background: #fef3c7; color: #92400e; }

    .route-card { background: white; border-radius: 16px; overflow: hidden; border-top: 5px solid var(--accent); max-width: 760px; }
    .route-header { padding: 1.5rem; background: #fafafa; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
    .route-header h3 { margin: 0; color: var(--primary); }

    .probability-score { padding: 0.3rem 0.8rem; border-radius: 20px; background: #dcfce7; color: #166534; font-weight: 800; font-size: 0.8rem; }
    .probability-score.low { background: #fee2e2; color: #991b1b; }

    .route-stats { padding: 1.5rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; background: #fdfaf7; border-bottom: 1px solid #eee; }
    .stat { display: flex; flex-direction: column; font-size: 0.85rem; }
    .stat span { color: var(--text-muted); }
    .warnings { padding: 1rem 1.5rem; background: #fff5f5; color: #991b1b; font-size: 0.9rem; border-bottom: 1px solid #fee2e2; }

    .order-sequence { padding: 1.5rem; }
    .origin-line { font-size: 0.85rem; color: #666; margin-bottom: 1.2rem; }
    .sequence-item { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.4rem; position: relative; }
    .sequence-item:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 30px; bottom: -22px; width: 2px; background: #f0f0f0; }

    .step { width: 30px; height: 30px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; z-index: 2; flex-shrink: 0; }
    .info { flex: 1; }
    .time { font-weight: 800; color: var(--accent); font-size: 0.95rem; }
    .slot { color: #888; font-weight: 400; }
    .addr { font-size: 0.85rem; color: #555; }
    .leg { font-size: 0.78rem; color: #888; margin-top: 0.2rem; }
    .late { color: #991b1b; font-weight: 700; }

    .mt-5 { margin-top: 3rem; }
  `]
})
export class RouteOptimizerComponent implements OnInit {
    private logisticsService = inject(LogisticsService);
    private orderService = inject(OrderService);
    private toast = inject(ToastService);

    /** Estados que no pueden entrar en una ruta (pedidos cancelados, reembolsados o sin pago válido) */
    private readonly NOT_DELIVERABLE = ['cancelled', 'refunded', 'paid_conflict', 'failed'];

    selectedDate = '';
    margin = 10;

    orders = signal<any[]>([]);
    selectedIds = signal<Set<string>>(new Set());
    selectedCount = computed(() => this.selectedIds().size);
    result = signal<RoutePlan | null>(null);
    loading = signal(false);

    ngOnInit() {
        // Por defecto, hoy
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.loadOrders();
    }

    async loadOrders() {
        if (!this.selectedDate) return;
        try {
            const all = await this.orderService.getAllOrders();
            const dayOrders = all
                .filter(o => o.delivery_date === this.selectedDate && !this.NOT_DELIVERABLE.includes(o.status))
                .sort((a, b) => String(a.delivery_timeSlot).localeCompare(String(b.delivery_timeSlot)) || String(a.customer_name).localeCompare(String(b.customer_name)));
            this.orders.set(dayOrders);
            // Por defecto se marcan los pedidos ya pagados
            this.selectedIds.set(new Set(dayOrders.filter(o => o.status === 'paid').map(o => String(o.id))));
        } catch (e) {
            this.orders.set([]);
            this.selectedIds.set(new Set());
        }
        this.result.set(null);
    }

    isSelected(id: string): boolean { return this.selectedIds().has(String(id)); }

    toggle(id: string) {
        const next = new Set(this.selectedIds());
        const key = String(id);
        if (next.has(key)) next.delete(key); else next.add(key);
        this.selectedIds.set(next);
        this.result.set(null);
    }

    selectAll() { this.selectedIds.set(new Set(this.orders().map(o => String(o.id)))); this.result.set(null); }
    selectNone() { this.selectedIds.set(new Set()); this.result.set(null); }

    statusLabel(status: string): string {
        return ({ paid: 'Pagado', pending: 'Sin pagar', delivered: 'Entregado' } as Record<string, string>)[status] || status;
    }

    warningLabel(id: string, message: string): string {
        const order = this.orders().find(o => String(o.id) === String(id));
        return `${order?.customer_name || 'Pedido ' + id}: ${message}`;
    }

    async calculate() {
        this.loading.set(true);
        try {
            const res = await this.logisticsService.optimizeRoutes({
                date: this.selectedDate,
                orderIds: [...this.selectedIds()],
                marginMinutes: this.margin
            });
            this.result.set(res);
        } catch (err) {
            const message = err instanceof HttpErrorResponse ? err.error?.message : null;
            this.toast.error(message || 'Error calculando la ruta. Comprueba la configuración del servidor.');
        } finally {
            this.loading.set(false);
        }
    }
}
