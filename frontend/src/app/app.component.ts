import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { ResourceService } from './services/resource.service';
import { AccessibilityMenuComponent } from './components/accessibility-menu/accessibility-menu.component';
import { CookieBannerComponent } from './components/cookie-banner/cookie-banner.component';
import { FooterComponent } from './components/footer/footer.component';

import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AccessibilityMenuComponent, CookieBannerComponent, FooterComponent, CartDrawerComponent, ToastComponent, ConfirmDialogComponent, NgIf],
  template: `
    <div class="main-content">
      <router-outlet></router-outlet>
      <app-footer *ngIf="!isAdminRoute()"></app-footer>
    </div>
    <app-cart-drawer></app-cart-drawer>
    <app-accessibility-menu *ngIf="!isAdminRoute()"></app-accessibility-menu>
    <app-cookie-banner *ngIf="!isAdminRoute()"></app-cookie-banner>
    <app-toast></app-toast>
    <app-confirm-dialog></app-confirm-dialog>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--background);
      position: relative;
    }
  `]
})
export class AppComponent {
  private resourceService = inject(ResourceService);
  private router = inject(Router);

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin') === true;
  }
}
