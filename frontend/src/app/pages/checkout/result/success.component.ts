import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CartStore } from '../../../store/cart.store';
import { HeaderComponent } from '../../../components/header/header.component';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  template: `
    <app-header></app-header>
    <main class="container section-padding text-center fade-in">
      <div class="result-card">
        <div class="icon success"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <h1 class="title-font">¡Pago Confirmado!</h1>
        <p>Gracias por confiar en <strong>Desayuno con Diamante</strong>.</p>
        <p class="text-muted">Tu pedido está siendo preparado con todo nuestro cariño y llegará en la fecha seleccionada.</p>
        
        <div class="order-info mt-4">
           <p>En breve recibirás un email con el resumen de tu compra.</p>
        </div>

        <div class="mt-4">
          <button class="btn btn-primary" routerLink="/">Volver a la Tienda</button>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .result-card { background: white; padding: 4rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); max-width: 600px; margin: 2rem auto; }
    .icon { font-size: 4rem; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; }
    .icon.success { background: #e8f5e9; color: #4caf50; }
    .order-info { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; }
  `]
})
export class CheckoutSuccessComponent implements OnInit {
  cart = inject(CartStore);
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  async ngOnInit() {
    this.cart.clearCart();

    const queryParams = this.route.snapshot.queryParams;
    const orderId = queryParams['order_id'];
    const sessionId = queryParams['session_id'];

    if (orderId) {
      try {
        await this.orderService.confirmOrderPayment(orderId, sessionId);
      } catch (err) { }
    }
  }
}

