import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { AuthService } from '../../services/auth.service';
import { CartStore } from '../../store/cart.store';
import { CommonModule } from '@angular/common';

@Component({
   selector: 'app-header',
   standalone: true,
   imports: [RouterLink, CommonModule],
   template: `
    <header class="header shadow-sm">
      <div class="header-container">

        <!-- IZQUIERDA: Logo circular + Nombre de marca -->
        <a routerLink="/" class="logo-group">
          <div class="logo-wrapper">
            <div class="logo-inner">
               <img src="assets/images/logo.png" alt="Desayuno con Diamante" class="header-logo" loading="eager">
               <div class="logo-overlay-mask"></div>
            </div>
          </div>
          <div class="brand-info">
            <span class="brand-name">Desayuno con Diamante</span>
          </div>
        </a>

        <!-- CENTRO: Navegación (escritorio) -->
        <nav class="nav" [class.mobile-open]="isMenuOpen()">
          <ul class="nav-links">
            <li><a routerLink="/" class="nav-link" (click)="closeMobileMenu()">Inicio</a></li>
            <li><a routerLink="/productos" class="nav-link" (click)="closeMobileMenu()">Desayunos</a></li>
            <li><a routerLink="/ofertas" class="nav-link" (click)="closeMobileMenu()">Ofertas</a></li>
            <li><a routerLink="/contacto" class="nav-link" (click)="closeMobileMenu()">Contacto</a></li>
            <li *ngIf="store.isAuthenticated()"><a routerLink="/mis-pedidos" class="nav-link" (click)="closeMobileMenu()">Mis Pedidos</a></li>

            <!-- Auth en menú móvil -->
            <li *ngIf="store.isAuthenticated()" class="mobile-only-auth">
              <div class="user-display">
                <span class="welcome-text">Hola, <strong>{{ store.user()?.displayName || 'Cliente' }}</strong></span>
                <button (click)="onMobileLogout()" class="btn btn-logout-mobile">Cerrar Sesión</button>
              </div>
            </li>
            <li *ngIf="!store.isAuthenticated()" class="mobile-only-auth">
              <a routerLink="/login" class="btn btn-login-mobile" (click)="closeMobileMenu()">Iniciar Sesión</a>
            </li>
          </ul>
        </nav>

        <!-- DERECHA: Carrito + panel usuario + hamburguesa -->
        <div class="header-actions">
           <a *ngIf="!store.isAuthenticated()" routerLink="/login" class="btn btn-login">Entrar</a>

           <button class="btn btn-icon cart-btn" (click)="cart.toggleCart()" aria-label="Ver carrito">
             <svg class="cart-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="9" cy="21" r="1"></circle>
               <circle cx="20" cy="21" r="1"></circle>
               <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
             </svg>
             <span class="cart-badge" *ngIf="cart.totalItems() > 0">{{ cart.totalItems() }}</span>
           </button>

           <div class="user-floating-panel shadow-sm" *ngIf="store.isAuthenticated()">
              <a *ngIf="store.isAdmin()" routerLink="/admin" class="btn-dashboard-icon" title="Panel de Administración">
                <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </a>
              <span class="welcome-text">Hola, <strong>{{ store.user()?.displayName || 'Cliente' }}</strong></span>
              <button (click)="auth.logout()" class="btn btn-logout btn-sm">Salir</button>
           </div>

           <button class="btn-menu-mobile" (click)="toggleMobileMenu()" aria-label="Abrir menú">
             <svg *ngIf="!isMenuOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M3 12h18M3 6h18M3 18h18" />
             </svg>
             <svg *ngIf="isMenuOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M18 6L6 18M6 6l12 12" />
             </svg>
           </button>
        </div>
      </div>
    </header>
  `,
   styles: [`
    /* ─────────────────────────────────────────────────────
       HEADER — Layout de 3 zonas: logo | nav | actions
    ───────────────────────────────────────────────────── */
    .header {
      background: var(--surface);
      height: var(--header-height);
      position: sticky;
      top: 0;
      z-index: 1000;
      border-bottom: 3px solid var(--primary);
      transition: var(--transition-smooth);
      overflow: visible; /* Permite que el logo circular sobresalga hacia abajo */
    }

    /* Contenedor con su propio max-width y centrado */
    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      height: 100%;
      gap: 1.5rem;
      position: relative;   /* ancla el logo-wrapper absoluto */
    }

    /* ──── IZQUIERDA: logo + nombre (pegado al logo, no expande) ──── */
    .logo-group {
      flex: 0 1 auto;
      display: flex;
      align-items: center;
      height: 100%;
      padding-left: 145px;  /* hueco para el círculo del logo */
      min-width: 0;
      text-decoration: none;
    }

    /* Círculo del logo: posicionado absolutamente en el borde izquierdo del contenedor */
    .logo-wrapper {
      position: absolute;
      left: 2rem;           /* mismo que el padding-left del .header-container */
      bottom: -43px;        /* sobresale 1/3 por debajo */
      width: 130px;
      height: 130px;
      border-radius: 50%;
      border: 3px solid var(--primary);
      background: var(--surface);
      padding: 6px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      z-index: 1002;
    }
    .logo-inner {
      width: 100%; height: 100%;
      border-radius: 50%;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface);
      position: relative;
    }
    .header-logo { width: 100%; height: 100%; object-fit: contain; }
    .logo-overlay-mask {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      border-radius: 50%;
      box-shadow: inset 0 0 0 7px var(--surface);
      pointer-events: none;
    }

    .brand-info { display: flex; flex-direction: column; line-height: 1; min-width: 0; }
    .brand-name {
      font-family: var(--font-title);
      font-size: clamp(1rem, 1.5vw, 1.7rem);
      font-weight: 800;
      color: var(--primary);
      letter-spacing: -1px;
      line-height: 1.2;
      transition: font-size 0.3s ease;
      white-space: nowrap;
    }

    /* ──── CENTRO: navegación (ocupa el espacio libre empujando enlaces hacia la derecha) ──── */
    .nav {
      flex: 1;
      display: flex;
      justify-content: flex-end; /* Menú pegado al carrito */
      padding-right: 0.5rem;
    }
    .nav-links {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      margin: 0; padding: 0;
      list-style: none;
    }
    .nav-link {
      font-weight: 600;
      color: var(--text-dark);
      font-size: 1rem;
      white-space: nowrap;
      transition: color 0.2s;
      position: relative;
    }
    .nav-link:hover { color: var(--secondary); }

    /* ──── DERECHA: acciones (no expande, pegada al borde derecho) ──── */
    .header-actions {
      flex: 0 0 auto;
      display: flex;
      gap: 1.2rem;
      align-items: center;
      justify-content: flex-end;
    }

    .user-floating-panel {
      position: absolute;
      top: 50%;
      margin-top: calc(var(--header-height) / 2 + 8px);
      right: 2rem;
      background: var(--surface);
      border: 1px solid rgba(0,0,0,0.1);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      display: flex; align-items: center; gap: 1rem;
      z-index: 999;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .welcome-text { font-size: 0.85rem; color: var(--text-dark); }
    .btn-dashboard-icon {
      display: flex; align-items: center; justify-content: center;
      color: var(--primary); padding: 0.4rem; border-radius: 50%;
      background: #f8f9fa; transition: all 0.3s; border: 1px solid #eee;
    }
    .btn-dashboard-icon:hover { background: var(--primary); color: white; transform: scale(1.1); }

    .btn-login, .btn-logout {
      padding: 0.5rem 1rem; font-size: 0.9rem;
      background: var(--primary); color: white;
      border-radius: var(--radius-md); transition: var(--transition-smooth);
      border: 2px solid transparent; cursor: pointer;
    }
    .btn-login:hover, .btn-logout:hover {
      background: white; color: var(--primary); border-color: var(--primary);
      transform: translateY(-2px); box-shadow: 0 4px 10px rgba(139,69,19,0.15);
    }
    .btn-logout.btn-sm { padding: 0.35rem 0.8rem; font-size: 0.85rem; }

    .btn-icon { display: flex; align-items: center; justify-content: center; transition: var(--transition-smooth); }
    .cart-btn {
      width: 54px; height: 54px;
      background: white; border: 2px solid #eee; border-radius: 50%;
      padding: 0; position: relative;
      box-shadow: 0 4px 6px rgba(0,0,0,0.02);
      color: var(--primary); transition: var(--transition-smooth); cursor: pointer;
    }
    .cart-btn:hover {
      background: var(--primary); color: white; border-color: var(--primary);
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 6px 15px rgba(139,69,19,0.2);
    }
    .cart-svg { width: 26px; height: 26px; }
    .cart-badge {
      position: absolute; top: -2px; right: -2px;
      background: var(--secondary); color: white;
      border-radius: 50%; min-width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 800; border: 2px solid white;
    }

    /* Hamburguesa: oculta en escritorio */
    .btn-menu-mobile {
      display: none;
      background: none; border: none; color: var(--primary);
      width: 40px; height: 40px; padding: 0; cursor: pointer;
    }
    .btn-menu-mobile svg { width: 80%; height: 80%; margin: 0 auto; }

    /* ─────────────────────────────────────────────────────
       < 1200px: pantalla más estrecha que el max-width.
       Logo y carrito en los extremos con 25px de margen.
    ───────────────────────────────────────────────────── */
    @media (max-width: 1200px) {
      .header-container { max-width: 100%; padding: 0 25px; }
      .logo-wrapper { left: 25px; }
      .user-floating-panel { right: 25px; }
    }

    /* ─────────────────────────────────────────────────────
       < 850px: modo tablet/móvil.
       Desaparece el menú, aparece la hamburguesa.
       El texto "Desayuno..." se centra en el hueco libre.
    ───────────────────────────────────────────────────── */
    @media (max-width: 850px) {
      .header-container { padding: 0 20px; gap: 0.5rem; }

      /* Logo más pequeño */
      .logo-wrapper { left: 20px; width: 90px; height: 90px; bottom: -30px; }
      .logo-overlay-mask { box-shadow: inset 0 0 0 4px var(--surface); }

      /* Texto de marca: cuando está solo, se centra en el espacio libre */
      .logo-group { padding-left: 105px; flex: 1; justify-content: center; }
      .brand-name { font-size: 1.2rem; text-align: center; }

      /* Menú de escritorio oculto → aparece hamburguesa */
      .nav { display: none; }
      .btn-menu-mobile { display: flex; align-items: center; justify-content: center; z-index: 1001; }
      .user-floating-panel { display: none; }

      /* Menú desplegable al activar hamburguesa */
      .nav.mobile-open {
        display: flex;
        position: fixed;
        top: var(--header-height);
        left: 0;
        width: 100%;
        background: white;
        border-bottom: 2px solid var(--primary);
        z-index: 999;
        padding: 2rem;
        animation: slideDown 0.3s ease;
      }
      .nav-links { flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; }
      .nav-link { font-size: 1.3rem; width: 100%; text-align: center; padding: 0.5rem; display: block; }

      .mobile-only-auth {
        display: flex; flex-direction: column; align-items: center;
        margin-top: 1rem; padding-top: 1.5rem;
        border-top: 1px solid #eee; width: 100%;
      }
      .user-display { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
      .btn-logout-mobile, .btn-login-mobile {
        background: var(--primary); color: white;
        padding: 0.8rem 1.5rem; border-radius: var(--radius-md);
        font-size: 1rem; width: 100%; text-align: center;
        border: none; cursor: pointer; font-weight: 600; font-family: inherit;
      }

      .header-actions { gap: 0.75rem; }
      .cart-btn { width: 42px; height: 42px; }
      .cart-svg { width: 22px; height: 22px; }
      .cart-badge { width: 18px; height: 18px; font-size: 0.65rem; top: -1px; right: -1px; }
    }

    /* ─────────────────────────────────────────────────────
       < 500px: sin texto de marca
    ───────────────────────────────────────────────────── */
    @media (max-width: 500px) {
      .brand-name { display: none; }
      .logo-group { padding-left: 95px; justify-content: flex-start; }
    }

    /* Auth en menú: sólo visible en la versión móvil */
    @media (min-width: 851px) {
      .mobile-only-auth { display: none; }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HeaderComponent {
   public store = inject(AuthStore);
   public auth = inject(AuthService);
   public cart = inject(CartStore);

   isMenuOpen = signal(false);

   toggleMobileMenu() {
      this.isMenuOpen.set(!this.isMenuOpen());
   }

   closeMobileMenu() {
      this.isMenuOpen.set(false);
   }

   onMobileLogout() {
      this.closeMobileMenu();
      this.auth.logout();
   }
}
