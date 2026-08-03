import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { db } from '../../app.firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

export interface StatusFilterOption {
  id: string;
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-order-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-manager fade-in">
      <div class="page-header">
        <h2 class="title-font">Gestión de Pedidos</h2>
      </div>

      <!-- Barra de Filtros y Ordenación -->
      <div class="toolbar-card shadow-sm">
        <!-- Filtro por Estado -->
        <div class="filter-group">
          <span class="filter-label">Estado:</span>
          <div class="chips-row">
            <button 
              *ngFor="let opt of statusOptions"
              type="button" 
              class="chip-btn"
              [class]="opt.cssClass"
              [class.active]="isStatusSelected(opt.id)"
              (click)="toggleStatusFilter(opt.id)"
            >
              <span class="chip-check">{{ isStatusSelected(opt.id) ? '✓' : '' }}</span>
              <span>{{ opt.label }}</span>
            </button>

            <button 
              type="button" 
              class="btn-link-all" 
              *ngIf="selectedStatuses().length < statusOptions.length"
              (click)="selectAllStatuses()"
            >
              Seleccionar todos
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Ordenación -->
        <div class="filter-group">
          <span class="filter-label">Ordenar por:</span>
          <div class="chips-row">
            <button 
              type="button" 
              class="sort-btn" 
              [class.active]="sortField() === 'date'"
              (click)="sortBy('date')"
            >
              <span>📅 Fecha</span>
              <span class="sort-arrow" *ngIf="sortField() === 'date'">
                {{ sortDirection() === 'asc' ? '▲ (Más antiguas)' : '▼ (Más recientes)' }}
              </span>
            </button>

            <button 
              type="button" 
              class="sort-btn" 
              [class.active]="sortField() === 'user'"
              (click)="sortBy('user')"
            >
              <span>👤 Usuario</span>
              <span class="sort-arrow" *ngIf="sortField() === 'user'">
                {{ sortDirection() === 'asc' ? '▲ (A - Z)' : '▼ (Z - A)' }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de Pedidos -->
      <div class="order-list mt-4">
        <div class="order-card shadow-sm fade-in" *ngFor="let order of filteredAndSortedOrders()">
          <div class="order-header">
            <div class="meta">
              <span class="order-id">#{{ order.id.substring(0,8) }}</span>
              <span class="date">{{ order.createdAt?.toDate() | date:'medium' }}</span>
            </div>
            <div class="status">
              <select [value]="order.status" (change)="updateStatus(order.id, $any($event.target).value)" [class]="order.status">
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div class="order-body">
            <div class="customer-info">
              <p>👤 <strong>{{ order.customer.name }}</strong> ({{ order.customer.email }})</p>
              <p>📍 {{ order.delivery.address }}, {{ order.delivery.city }} ({{ order.delivery.zip }})</p>
              <p>📅 Entrega: <strong>{{ order.delivery.date }}</strong> - {{ order.delivery.timeSlot }}</p>
              <p *ngIf="order.delivery.message">💌 <em>"{{ order.delivery.message }}"</em></p>
            </div>

            <div class="items-list">
              <ul>
                <li *ngFor="let item of order.items">
                  {{ item.quantity }}x {{ item.product.name }}
                </li>
              </ul>
            </div>

            <div class="order-footer">
               <span class="total-label">Total:</span>
               <span class="total-value">{{ order.total | number:'1.2-2' }}€</span>
            </div>
          </div>
        </div>
        
        <div *ngIf="filteredAndSortedOrders().length === 0" class="text-center p-5 bg-white rounded shadow-sm">
           <p class="text-muted mb-0">No se encontraron pedidos con los filtros aplicados.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-manager { padding-bottom: 3rem; }
    .page-header h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    
    .toolbar-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-top: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .divider {
      height: 1px;
      background-color: #f1f5f9;
      width: 100%;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 110px;
    }

    .chips-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .chip-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 0.4rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
      user-select: none;
    }

    .chip-check {
      font-weight: bold;
      width: 12px;
      text-align: center;
    }

    .chip-btn:hover {
      border-color: #94a3b8;
    }

    .chip-btn.active {
      font-weight: 700;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .chip-pending.active { background: #fff3cd; color: #856404; border-color: #ffeeba; }
    .chip-paid.active { background: #d4edda; color: #155724; border-color: #c3e6cb; }
    .chip-delivered.active { background: #cce5ff; color: #004085; border-color: #b8daff; }
    .chip-cancelled.active { background: #f8d7da; color: #721c24; border-color: #f5c6cb; }

    .btn-link-all {
      background: transparent;
      border: none;
      color: var(--secondary, #d97706);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      padding: 0.2rem 0.5rem;
    }

    .sort-btn {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.4rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary, #4a1525);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }
    .sort-btn:hover {
      background: #f8fafc;
      border-color: var(--secondary, #d97706);
    }
    .sort-btn.active {
      background: var(--primary, #4a1525);
      color: white;
      border-color: var(--primary, #4a1525);
      box-shadow: 0 2px 4px rgba(74, 21, 37, 0.2);
    }
    .sort-arrow {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    .order-card { background: white; border-radius: 12px; margin-bottom: 1.5rem; border-left: 6px solid #eee; overflow: hidden; }
    .order-header { 
      padding: 1.25rem 1.75rem; background: #fafafa; display: flex; 
      justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;
    }
    .order-id { font-weight: 800; color: var(--primary, #4a1525); margin-right: 1rem; }
    .date { color: var(--text-muted); font-size: 0.85rem; }
    
    .status select { 
      padding: 0.5rem 1rem; border-radius: 20px; border: 1px solid #ddd; 
      font-weight: 700; text-transform: uppercase; font-size: 0.75rem; 
      cursor: pointer;
    }
    .status select.pending { background: #fff3cd; color: #856404; }
    .status select.paid { background: #d4edda; color: #155724; }
    .status select.delivered { background: #cce5ff; color: #004085; }
    .status select.cancelled { background: #f8d7da; color: #721c24; }

    .order-body { padding: 1.5rem 1.75rem; display: grid; grid-template-columns: 1fr 1fr 150px; gap: 1.5rem; align-items: start; }
    .customer-info p { margin: 0 0 0.4rem 0; font-size: 0.9rem; }
    .items-list ul { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: #555; }
    .items-list li { margin-bottom: 0.3rem; }
    
    .order-footer { text-align: right; }
    .total-label { display: block; font-size: 0.8rem; color: var(--text-muted); }
    .total-value { font-size: 1.4rem; font-weight: 800; color: var(--accent, #d97706); }

    @media (max-width: 768px) {
      .order-body { grid-template-columns: 1fr; }
      .order-footer { text-align: left; margin-top: 1rem; }
      .toolbar-card { padding: 1rem; }
      .filter-label { min-width: 100%; margin-bottom: 0.2rem; }
    }
  `]
})
export class OrderManagerComponent implements OnInit {
  orders = signal<any[]>([]);

  statusOptions: StatusFilterOption[] = [
    { id: 'pending', label: 'Pendiente', cssClass: 'chip-pending' },
    { id: 'paid', label: 'Pagado', cssClass: 'chip-paid' },
    { id: 'delivered', label: 'Entregado', cssClass: 'chip-delivered' },
    { id: 'cancelled', label: 'Cancelado', cssClass: 'chip-cancelled' }
  ];

  selectedStatuses = signal<string[]>(['pending', 'paid', 'delivered', 'cancelled']);
  sortField = signal<'date' | 'user'>('date');
  sortDirection = signal<'asc' | 'desc'>('desc');

  filteredAndSortedOrders = computed(() => {
    const statuses = this.selectedStatuses();
    const field = this.sortField();
    const dir = this.sortDirection();

    // 1. Filtrar por estados seleccionados
    const list = this.orders().filter(order => statuses.includes(order.status || 'pending'));

    // 2. Ordenar por campo y dirección
    return list.sort((a, b) => {
      if (field === 'date') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dir === 'asc' ? timeA - timeB : timeB - timeA;
      } else {
        const nameA = (a.customer?.name || '').toLowerCase();
        const nameB = (b.customer?.name || '').toLowerCase();
        return dir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
    });
  });

  async ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    const q = query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    this.orders.set(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  toggleStatusFilter(status: string) {
    this.selectedStatuses.update(current => {
      if (current.includes(status)) {
        return current.filter(s => s !== status);
      } else {
        return [...current, status];
      }
    });
  }

  selectAllStatuses() {
    this.selectedStatuses.set(this.statusOptions.map(opt => opt.id));
  }

  sortBy(field: 'date' | 'user') {
    if (this.sortField() !== field) {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    } else {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    }
  }

  async updateStatus(id: string, newStatus: string) {
    try {
      await updateDoc(doc(db, 'pedidos', id), { status: newStatus });
      this.orders.update(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Error actualizando estado');
    }
  }
}
