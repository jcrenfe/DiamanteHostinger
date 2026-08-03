import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="admin-layout">
      <!-- Simple Sidebar -->
      <aside class="sidebar shadow-sm">
        <div class="sidebar-header">
           <h4 class="title-font">Desayuno Panel</h4>
        </div>
        <nav class="sidebar-nav">
          <button class="nav-item" [class.active]="activeTab() === 'dashboard'" (click)="setTab('dashboard')">🏠 Resumen</button>
          <button class="nav-item" [class.active]="activeTab() === 'products'" (click)="setTab('products')">🛒 Productos</button>
          <button class="nav-item" [class.active]="activeTab() === 'orders'" (click)="setTab('orders')">📦 Pedidos</button>
          <button class="nav-item" [class.active]="activeTab() === 'appointments'" (click)="setTab('appointments')">📅 Citas</button>
          <button class="nav-item" [class.active]="activeTab() === 'campaigns'" (click)="setTab('campaigns')">📧 Campañas</button>
          <button class="nav-item" [class.active]="activeTab() === 'settings'" (click)="setTab('settings')">⚙️ Ajustes</button>
        </nav>
        <div class="sidebar-footer">
           <button class="btn btn-outline-danger">Cerrar Sesión</button>
        </div>
      </aside>

      <!-- Main Admin Content -->
      <main class="admin-main">
        <header class="admin-header">
           <div class="header-breadcrumb">
              Admin &raquo; <span class="capitalize">{{ activeTab() }}</span>
           </div>
           <div class="admin-user-info">
              <span>👤 Admin</span>
           </div>
        </header>

        <section class="admin-content container section-padding">
           <!-- Dynamic Content Wrapper -->
           <div [ngSwitch]="activeTab()" class="fade-in">
              <div *ngSwitchCase="'dashboard'">
                 <div class="stats-grid">
                    <div class="stat-card">
                       <span class="stat-label">Ventas Hoy</span>
                       <h2 class="stat-value">€450.00</h2>
                    </div>
                    <div class="stat-card">
                       <span class="stat-label">Nuevos Pedidos</span>
                       <h2 class="stat-value">12</h2>
                    </div>
                    <div class="stat-card">
                       <span class="stat-label">Citas Pendientes</span>
                       <h2 class="stat-value">5</h2>
                    </div>
                 </div>
              </div>
              <div *ngSwitchCase="'products'">
                 <div class="card p-4">
                    <h3 class="title-font">Gestión de Productos</h3>
                    <p class="text-muted">Administra el inventario, precios y ofertas de tus cestas.</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;">+ Nuevo Producto</button>
                 </div>
              </div>
              <!-- Fallback -->
              <div *ngSwitchDefault>
                 <div class="admin-coming-soon">
                    <h3>Panel de {{ activeTab() }}</h3>
                    <p>Este módulo funcional se está cargando con la tradición familiar de "Desayuno con Diamante".</p>
                 </div>
              </div>
           </div>
        </section>
      </main>
    </div>
  `,
    styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #f8f9fa;
    }
    .sidebar {
      width: 260px;
      background: white;
      border-right: 1px solid #ddd;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .sidebar-header {
      padding: 2rem;
      border-bottom: 1px solid #eee;
      text-align: center;
    }
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0;
      display: flex;
      flex-direction: column;
    }
    .nav-item {
      padding: 1.25rem 2rem;
      text-align: left;
      background: none;
      border: none;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: 0.2s;
      border-left: 4px solid transparent;
    }
    .nav-item:hover {
      background: rgba(139, 69, 19, 0.05);
      color: var(--primary);
    }
    .nav-item.active {
      color: var(--primary);
      background: rgba(139, 69, 19, 0.08);
      border-left-color: var(--primary);
    }
    .sidebar-footer {
       padding: 2rem;
       border-top: 1px solid #eee;
    }
    .admin-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
    .admin-header {
       height: 70px;
       background: white;
       border-bottom: 1px solid #eee;
       display: flex;
       align-items: center;
       justify-content: space-between;
       padding: 0 2rem;
    }
    .header-breadcrumb { font-weight: 600; color: var(--text-muted); }
    .capitalize { text-transform: capitalize; color: var(--primary); }
    .admin-content { padding: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    .stat-card {
       background: white; padding: 2rem; border-radius: var(--radius-lg);
       box-shadow: 0 5px 15px rgba(0,0,0,0.02); text-align: center;
       border: 1px solid #eee;
    }
    .stat-label { font-size: 0.9rem; color: var(--text-muted); font-weight: 600; }
    .stat-value { font-size: 2.5rem; color: var(--primary); margin-top: 0.5rem; }
    .admin-coming-soon { text-align: center; padding: 4rem; background: white; border-radius: var(--radius-lg); }
    .btn-outline-danger { background: transparent; border: 1px solid var(--accent); color: var(--accent); padding: 0.6rem 1.2rem; cursor: pointer; font-weight: 600; border-radius: 8px; width: 100%; }
  `]
})
export class AdminDashboardComponent {
    activeTab = signal('dashboard');

    setTab(tab: string) { this.activeTab.set(tab); }
}
