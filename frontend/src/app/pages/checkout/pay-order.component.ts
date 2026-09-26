import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { loadStripe } from '@stripe/stripe-js';
import { HeaderComponent } from '../../components/header/header.component';
import { OrderService } from '../../services/order.service';
import { environment } from '../../../environments/environment';

type PageState = 'loading' | 'invalid' | 'paid' | 'closed' | 'slot_unavailable' | 'error' | 'payable';

/**
 * Pagar un pedido ya guardado desde el enlace del correo de "pago pendiente" (/pagar/:id?t=firma).
 * Muestra los datos del pedido y abre la pasarela de Stripe con el mismo número de pedido, de modo
 * que al pagarse el aviso de Stripe lo marca como pagado sin crear otro.
 */
@Component({
    selector: 'app-pay-order',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent],
    template: `
    <app-header></app-header>
    <main class="container section-padding pay-page fade-in">
      <header class="pay-header">
        <h1 class="title-font">Completar el pago</h1>
        <p class="text-muted" *ngIf="order()">Pedido <strong>#{{ order()!.id }}</strong></p>
      </header>

      <div class="state-card" *ngIf="state() === 'loading'"><p>Cargando tu pedido…</p></div>

      <div class="state-card" *ngIf="state() === 'invalid'">
        <h3>Enlace no válido</h3>
        <p>No hemos encontrado el pedido de este enlace. Comprueba que has abierto el enlace completo del correo o escríbenos y te ayudamos.</p>
        <a class="btn btn-primary" routerLink="/contacto">Contactar</a>
      </div>

      <div class="state-card ok" *ngIf="state() === 'paid'">
        <h3>✅ Este pedido ya está pagado</h3>
        <p>No tienes que hacer nada más. Recibirás (o ya has recibido) el correo de confirmación.</p>
        <a class="btn btn-primary" routerLink="/">Volver a la tienda</a>
      </div>

      <div class="state-card" *ngIf="state() === 'closed'">
        <h3>Este pedido ya no está activo</h3>
        <p>El pedido se canceló o se reembolsó, así que no se puede pagar. Si quieres, puedes hacer un pedido nuevo.</p>
        <a class="btn btn-primary" routerLink="/productos">Ver desayunos</a>
      </div>

      <div class="state-card warn" *ngIf="state() === 'slot_unavailable'">
        <h3>La hora de entrega ya no está disponible</h3>
        <p>Otro cliente ha reservado la hora de tu pedido ({{ order()?.delivery?.date }} a las {{ order()?.delivery?.timeSlot }}) antes de completar el pago. No se te ha cobrado nada. Haz un pedido nuevo eligiendo otra hora.</p>
        <a class="btn btn-primary" routerLink="/productos">Hacer un pedido nuevo</a>
      </div>

      <div class="state-card warn" *ngIf="state() === 'error'">
        <h3>No se ha podido abrir la pasarela de pago</h3>
        <p>{{ errorMessage() }}</p>
        <button class="btn btn-primary" (click)="openGateway()">Intentarlo de nuevo</button>
      </div>

      <div class="pay-layout" *ngIf="state() === 'payable' && order() as o">
        <section class="pay-card">
          <div class="delivery-data-box">
            <h4>¡Atención! Estos son los datos de entrega</h4>
            <p><strong>Dirección:</strong> {{ o.delivery.address }}, {{ o.delivery.city }} ({{ o.delivery.zip }})</p>
            <p *ngIf="o.delivery.addressExtra"><strong>Piso / puerta:</strong> {{ o.delivery.addressExtra }}</p>
            <p><strong>Teléfono:</strong> {{ o.customer.phone }}</p>
            <p><strong>Entrega:</strong> {{ o.delivery.date }} a las {{ o.delivery.timeSlot }}</p>
            <small>Si algún dato no es correcto, escríbenos antes de pagar.</small>
          </div>
          <p class="text-muted" *ngIf="!gatewayReady()">Abriendo la pasarela de pago…</p>
          <div id="stripe-pay-element"></div>
        </section>

        <aside class="summary-card">
          <h3 class="title-font">Tu pedido</h3>
          <div class="summary-line" *ngFor="let it of o.items">
            <span>{{ it.name }} × {{ it.quantity }}</span>
            <span>{{ it.price * it.quantity | number:'1.2-2' }}€</span>
          </div>
          <div class="summary-line surcharge" *ngIf="o.surchargeAmount > 0">
            <span>🚚 Incremento por desplazamiento</span>
            <span>{{ o.surchargeAmount | number:'1.2-2' }}€</span>
          </div>
          <div class="summary-total">
            <span>Total a pagar</span>
            <strong>{{ o.total | number:'1.2-2' }}€</strong>
          </div>
        </aside>
      </div>
    </main>
  `,
    styles: [`
    .pay-page { max-width: 1100px; }
    .pay-header { margin-bottom: 2rem; }
    .state-card { background: white; border-radius: 16px; padding: 2.5rem; max-width: 640px; margin: 0 auto; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .state-card h3 { color: var(--primary); margin-bottom: 1rem; }
    .state-card p { margin-bottom: 1.5rem; }
    .state-card.ok h3 { color: #1e7e34; }
    .state-card.warn { border-top: 4px solid #e67e22; }
    .pay-layout { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; align-items: start; }
    .pay-card, .summary-card { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .pay-card { min-height: 400px; }
    .delivery-data-box { background: #fff8e6; border: 1px solid #f0c36d; border-left: 4px solid #e67e22; border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 1.5rem; }
    .delivery-data-box h4 { margin: 0 0 0.6rem; color: #8b4513; font-size: 1.05rem; }
    .delivery-data-box p { margin: 0 0 0.3rem; }
    .delivery-data-box small { display: block; margin-top: 0.5rem; color: var(--text-muted); }
    .summary-card h3 { margin-bottom: 1rem; }
    .summary-line { display: flex; justify-content: space-between; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px dashed #eecdab; font-size: 0.95rem; }
    .summary-line.surcharge { color: #e67e22; font-style: italic; }
    .summary-total { display: flex; justify-content: space-between; margin-top: 1rem; font-size: 1.2rem; color: var(--primary); }
    @media (max-width: 820px) {
      .pay-layout { grid-template-columns: 1fr; }
      .summary-card { order: -1; }
    }
  `]
})
export class PayOrderComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private orderService = inject(OrderService);

    state = signal<PageState>('loading');
    order = signal<any>(null);
    gatewayReady = signal(false);
    errorMessage = signal('');

    private orderId = '';
    private checkout: any = null;
    private statusTimer: any = null;

    async ngOnInit() {
        this.orderId = this.route.snapshot.paramMap.get('id') || '';
        const token = this.route.snapshot.queryParamMap.get('t') || '';
        const res = await this.orderService.getPaymentInfo(this.orderId, token);
        if (!res.ok) {
            this.state.set('invalid');
            return;
        }
        this.order.set(res.data);
        if (res.data.status === 'paid') { this.state.set('paid'); return; }
        if (res.data.status === 'closed') { this.state.set('closed'); return; }
        this.state.set('payable');
        await this.openGateway();
    }

    async openGateway() {
        this.state.set('payable');
        this.gatewayReady.set(false);
        const params: any = await this.orderService.initPayment(this.orderId);
        if (params?.clientSecret) {
            setTimeout(() => this.mountStripe(params.clientSecret), 0);
            this.watchStatus();
            return;
        }
        if (params?.reason === 'slot_unavailable') this.state.set('slot_unavailable');
        else if (params?.reason === 'already_paid') this.state.set('paid');
        else if (params?.reason === 'order_closed') this.state.set('closed');
        else {
            this.errorMessage.set(params?.message || 'Inténtalo de nuevo en unos minutos.');
            this.state.set('error');
        }
    }

    private async mountStripe(clientSecret: string) {
        try {
            this.destroyCheckout();
            const stripe = await loadStripe(environment.stripePublishableKey);
            if (!stripe) throw new Error('Stripe no disponible');
            this.checkout = await (stripe as any).createEmbeddedCheckoutPage({ clientSecret });
            this.checkout.mount('#stripe-pay-element');
            this.gatewayReady.set(true);
        } catch (e) {
            this.errorMessage.set('No se ha podido cargar la pasarela de pago. Inténtalo de nuevo en unos minutos.');
            this.state.set('error');
        }
    }

    /** Cuando Stripe confirma el pago (aviso al servidor), el pedido pasa a pagado: se muestra el éxito. */
    private watchStatus() {
        this.stopWatching();
        this.statusTimer = setInterval(async () => {
            const status = await this.orderService.getOrderStatus(this.orderId);
            if (status === 'paid') {
                this.stopWatching();
                this.router.navigate(['/checkout/success'], { queryParams: { order_id: this.orderId } });
            }
        }, 5000);
    }

    private stopWatching() {
        if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null; }
    }

    private destroyCheckout() {
        if (this.checkout) { try { this.checkout.destroy(); } catch { } this.checkout = null; }
    }

    ngOnDestroy() {
        this.stopWatching();
        this.destroyCheckout();
    }
}
