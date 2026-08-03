import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../components/header/header.component';

@Component({
    selector: 'app-checkout-fail',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent],
    template: `
    <app-header></app-header>
    <main class="container section-padding text-center fade-in">
      <div class="result-card">
        <div class="icon fail">✕</div>
        <h1 class="title-font">Pago Cancelado</h1>
        <p>Parece que ha habido un problema con la transacción o el proceso ha sido cancelado.</p>
        <p class="text-muted">No se ha realizado ningún cargo en tu tarjeta. Puedes volver a intentarlo cuando quieras.</p>

        <div class="mt-4 d-flex gap-3 justify-content-center">
          <button class="btn btn-primary" routerLink="/checkout">Reintentar Pedido</button>
          <button class="btn btn-secondary" routerLink="/">Volver a Inicio</button>
        </div>
      </div>
    </main>
  `,
    styles: [`
    .result-card { background: white; padding: 4rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); max-width: 600px; margin: 2rem auto; }
    .icon { font-size: 4rem; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; }
    .icon.fail { background: #ffebee; color: #f44336; }
    .gap-3 { gap: 1rem; }
    .d-flex { display: flex; }
    .justify-content-center { justify-content: center; }
  `]
})
export class CheckoutFailComponent { }
