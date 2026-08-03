import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-container">
      <!-- Sidebar -->
      <aside class="admin-sidebar shadow-lg">
        <div class="sidebar-header">
          <div class="logo-text title-font" routerLink="/">Diamante <span>Admin</span></div>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span> Dashboard
          </a>
          <a routerLink="/admin/productos" routerLinkActive="active" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></span> Productos
          </a>
          <a routerLink="/admin/pedidos" routerLinkActive="active" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></span> Pedidos
          </a>
          <a routerLink="/admin/citas" routerLinkActive="active" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span> Disponibilidad
          </a>
          <a routerLink="/admin/ofertas" routerLinkActive="active" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></span> Ofertas
          </a>
          <a routerLink="/admin/campanas" routerLinkActive="active" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span> Campañas
          </a>
          <a routerLink="/admin/rutas" routerLinkActive="active" class="nav-item">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polyline points="16 8 20 8 23 11 23 16 16 16 16 8"></polyline><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></span> Rutas de Reparto
          </a>
          <a routerLink="/" class="nav-item mt-auto">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></span> Volver a la web
          </a>
          <button (click)="auth.logout()" class="nav-item logout-btn">
            <span class="icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span> Cerrar Sesión
          </button>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="admin-content">
        <header class="content-header">
          <h2 class="title-font">Panel de Control</h2>
          <div class="user-info" *ngIf="authStore.user()">
            <span>Hola, <strong>{{ authStore.user()?.displayName || 'Admin' }}</strong></span>
            <div class="avatar shadow-sm">
               {{ authStore.user()?.displayName?.charAt(0) || 'A' }}
            </div>
          </div>
        </header>

        <section class="page-body fade-in">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .admin-container { display: flex; min-height: 100vh; background: #f4f7f6; }
    
    .admin-sidebar { 
      width: 280px; background: var(--primary); color: white; 
      display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
    }
    
    .sidebar-header { padding: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .logo-text { font-size: 1.5rem; cursor: pointer; color: white; }
    .logo-text span { color: var(--secondary); font-weight: 300; }
    
    .sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 1.5rem 0; }
    .nav-item { 
      display: flex; align-items: center; gap: 1rem; padding: 1.2rem 2.5rem; 
      color: rgba(255,255,255,0.7); text-decoration: none; transition: all 0.3s;
      font-weight: 500; border: none; background: none; width: 100%; text-align: left;
      cursor: pointer;
    }
    .nav-item:hover, .nav-item.active { background: rgba(255,255,255,0.05); color: white; }
    .nav-item.active { border-left: 4px solid var(--secondary); padding-left: calc(2.5rem - 4px); }
    .nav-item .icon { font-size: 1.2rem; }
    .logout-btn { color: #ff8a8a; border-top: 1px solid rgba(255,255,255,0.1); margin-bottom: 0; }

    .admin-content { 
      flex: 1; 
      display: flex; 
      flex-direction: column; 
      height: 100vh;
      min-width: 0;
      position: relative;
    }
    .content-header { 
      background: white; padding: 1.5rem 3rem; display: flex; 
      justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;
    }
    
    .user-info { display: flex; align-items: center; gap: 1rem; }
    .avatar { 
      width: 40px; height: 40px; background: var(--secondary); border-radius: 50%; 
      display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;
    }
    
    .page-body { padding: 1.5rem 3rem; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
    .mt-auto { margin-top: auto; }

    @media (max-width: 992px) {
      .admin-sidebar { width: 80px; }
      .nav-item span:not(.icon), .logo-text, .user-info span { display: none; }
      .nav-item { justify-content: center; padding: 1.5rem; }
      .sidebar-header { padding: 1.5rem; }
    }
  `]
})
export class AdminLayoutComponent {
  authStore = inject(AuthStore);
  auth = inject(AuthService);
}
