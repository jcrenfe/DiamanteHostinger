import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { db } from '../../app.firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { LogisticsService } from '../../services/logistics.service';

@Component({
    selector: 'app-route-optimizer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="route-optimizer">
      <h2 class="title-font">Asistencia Ruta de Reparto</h2>
      <p class="text-muted">Optimiza las entregas diarias calculando las rutas más eficientes para tus repartidores.</p>

      <div class="controls-card shadow-sm mt-4 fade-in">
        <div class="controls-grid">
          <div class="form-group">
            <label>Fecha de Reparto</label>
            <input type="date" [(ngModel)]="selectedDate" name="date" (change)="loadOrders()">
          </div>
          <div class="form-group">
            <label>Número de Repartidores</label>
            <input type="number" [(ngModel)]="driverCount" name="drivers" min="1" max="10">
          </div>
          <div class="form-group">
            <label>Margen Extra (minutos)</label>
            <input type="number" [(ngModel)]="margin" name="margin" min="0" max="60">
          </div>
          <div class="form-group">
            <label>Optimizar por</label>
            <select [(ngModel)]="optimizationGoal" name="goal">
              <option value="time">Tiempo más rápido</option>
              <option value="distance">Menos Kilometraje</option>
            </select>
          </div>
        </div>
        
        <div class="actions mt-4">
           <button class="btn btn-primary" (click)="calculate()" [disabled]="orders().length === 0 || loading()">
             {{ loading() ? 'Calculando con Google Maps...' : 'Calcular Ruta Óptima' }}
           </button>
        </div>
      </div>

      <div class="results-grid mt-5" *ngIf="results()">
        <div class="route-card shadow-sm" *ngFor="let route of results().routes; let i = index">
          <div class="route-header">
            <h3>Repartidor #{{ i + 1 }}</h3>
            <div class="probability-score" [class.low]="route.probabilityOfSuccess < 50" [class.mid]="route.probabilityOfSuccess < 80">
               {{ route.probabilityOfSuccess }}% de éxito
            </div>
          </div>
          
          <div class="route-stats">
            <div class="stat"><span>⏱️ Tiempo Est.:</span> <strong>{{ (route.totalTime / 60) | number:'1.0-0' }} min</strong></div>
            <div class="stat"><span>🛤️ Distancia:</span> <strong>{{ (route.totalDistance / 1000) | number:'1.1-1' }} km</strong></div>
            <div class="stat"><span>📍 Entregas:</span> <strong>{{ route.orders.length }}</strong></div>
          </div>

          <div class="order-sequence mt-3">
             <div class="sequence-item" *ngFor="let order of route.orders; let idx = index">
                <span class="step">{{ idx + 1 }}</span>
                <div class="info">
                   <div class="time">{{ order.delivery.timeSlot || order.delivery.time }}</div>
                   <div class="addr">{{ order.customer.name }} - {{ order.delivery.address }}</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div *ngIf="orders().length === 0 && selectedDate" class="text-center p-5 mt-4 bg-white rounded shadow-sm">
         <p>No hay pedidos registrados para el día {{ selectedDate | date:'fullDate' }}.</p>
      </div>
    </div>
  `,
    styles: [`
    .controls-card { background: white; padding: 2.5rem; border-radius: 12px; }
    .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-weight: 600; font-size: 0.9rem; color: var(--primary); }
    input, select { padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }

    .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; }
    .route-card { background: white; border-radius: 16px; overflow: hidden; border-top: 5px solid var(--accent); }
    .route-header { padding: 1.5rem; background: #fafafa; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
    .route-header h3 { margin: 0; color: var(--primary); }
    
    .probability-score { padding: 0.3rem 0.8rem; border-radius: 20px; background: #dcfce7; color: #166534; font-weight: 800; font-size: 0.8rem; }
    .probability-score.mid { background: #fef3c7; color: #92400e; }
    .probability-score.low { background: #fee2e2; color: #991b1b; }

    .route-stats { padding: 1.5rem; display: flex; justify-content: space-between; background: #fdfaf7; border-bottom: 1px solid #eee; }
    .stat { display: flex; flex-direction: column; font-size: 0.85rem; }
    .stat span { color: var(--text-muted); }

    .order-sequence { padding: 1.5rem; }
    .sequence-item { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; position: relative; }
    .sequence-item:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 30px; bottom: -20px; width: 2px; background: #f0f0f0; }
    
    .step { width: 30px; height: 30px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; z-index: 2; }
    .info { flex: 1; }
    .time { font-weight: 800; color: var(--accent); font-size: 0.9rem; }
    .addr { font-size: 0.85rem; color: #555; }
    
    .mt-5 { margin-top: 3rem; }
  `]
})
export class RouteOptimizerComponent implements OnInit {
    private logisticsService = inject(LogisticsService);

    selectedDate = '';
    driverCount = 1;
    margin = 10;
    optimizationGoal: 'time' | 'distance' = 'time';

    orders = signal<any[]>([]);
    results = signal<any>(null);
    loading = signal(false);

    ngOnInit() {
        // Default to today
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.loadOrders();
    }

    async loadOrders() {
        if (!this.selectedDate) return;
        const q = query(collection(db, 'pedidos'), where('delivery.date', '==', this.selectedDate));
        const snap = await getDocs(q);
        this.orders.set(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        this.results.set(null);
    }

    async calculate() {
        this.loading.set(true);
        try {
            const res = await this.logisticsService.optimizeRoutes({
                orders: this.orders(),
                drivers: this.driverCount,
                marginMinutes: this.margin,
                optimizeFor: this.optimizationGoal
            });
            this.results.set(res);
        } catch (err) {
            alert('Error calculando la ruta. Comprueba la configuración del servidor.');
        } finally {
            this.loading.set(false);
        }
    }
}
