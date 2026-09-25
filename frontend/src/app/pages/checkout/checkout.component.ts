import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartStore } from '../../store/cart.store';
import { AuthStore } from '../../store/auth.store';
import { OrderService, OrderData, DeliveryCheckResult } from '../../services/order.service';
import { AppointmentService, TimeSlot } from '../../services/appointment.service';
import { HeaderComponent } from '../../components/header/header.component';
import { DeliveryCalendarComponent } from '../../components/delivery-calendar/delivery-calendar.component';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { loadStripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

const STRIPE_PK = 'pk_test_51Tt8ruLfaSGxxAzCguSeOSjXZ6OiV9k5A8Uwa1dLc3uVO9PW9EeFBfX6MjgwfVFjnzioEPTDNdapGQaDYO3cC7Mz008EtsfQRx';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent, DeliveryCalendarComponent],
  template: `
    <app-header></app-header>

    <main class="checkout-page container section-padding">
      <div class="checkout-grid" *ngIf="!orderSuccess(); else successState">
        
        <header class="checkout-header">
           <h1 class="title-font section-title">Finalizar Pedido</h1>
           <p class="text-muted">Completa tus datos para enviarte tu desayuno con diamante.</p>
        </header>

        <!-- Embedded Stripe Checkout or Form -->
        <div class="checkout-form-column">
          
          <div class="form-section stripe-embedded-card" *ngIf="showStripeCheckout(); else orderFormBlock">
            <h3 class="title-font mb-2">Pasarela de Pago Segura</h3>
            <p class="text-muted mb-4">Completa el pago con tarjeta para finalizar tu pedido <strong>#{{ orderId() }}</strong>.</p>
            <div class="delivery-data-box">
              <h4>¡Atención! Estos son los datos de entrega</h4>
              <p class="corrected-warning" *ngIf="deliveryCheck()?.addressCorrected">✏️ Hemos corregido tu dirección, compruébala por favor.</p>
              <p><strong>Dirección:</strong> {{ deliveryCheck()?.formattedAddress || (checkoutForm.value.address + ', ' + checkoutForm.value.city + ' (' + checkoutForm.value.zip + ')') }}</p>
              <p *ngIf="checkoutForm.value.addressExtra"><strong>Piso / puerta:</strong> {{ checkoutForm.value.addressExtra }}</p>
              <p><strong>Teléfono:</strong> {{ checkoutForm.value.phone }}</p>
              <small>También los recibirás por correo. Si hay algún error, podrás comunicárnoslo respondiendo a ese correo.</small>
            </div>
            <div id="stripe-checkout-element"></div>
          </div>

          <ng-template #orderFormBlock>
            <form [formGroup]="checkoutForm" (ngSubmit)="onSubmit()">
              <!-- Basic Info -->
              <div class="form-section">
                <h3 class="title-font">1. Tus Datos</h3>
                <div class="form-group">
                  <label>Nombre Completo</label>
                  <input type="text" formControlName="name" placeholder="Ej. Juan Pérez">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Email</label>
                    <input type="email" formControlName="email" placeholder="email@ejemplo.com">
                  </div>
                  <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" formControlName="phone" placeholder="600 000 000">
                  </div>
                </div>
              </div>

              <!-- Delivery Info -->
              <div class="form-section">
                <h3 class="title-font">2. Entrega</h3>
                <div class="form-group">
                  <label>Dirección de Envío</label>
                  <input type="text" formControlName="address" placeholder="Calle, número, piso..." (blur)="checkAddress()">
                </div>
                <div class="form-group">
                  <label>Piso / puerta / escalera <span class="text-muted">(opcional)</span></label>
                  <input type="text" formControlName="addressExtra" placeholder="Ej. 2º B, escalera izquierda">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Ciudad</label>
                    <input type="text" formControlName="city" placeholder="Ej. Madrid" (blur)="checkAddress()">
                  </div>
                  <div class="form-group">
                    <label>Código Postal</label>
                    <input type="text" formControlName="zip" placeholder="28001" (blur)="checkAddress()">
                  </div>
                </div>

                <div class="delivery-check-status checking" *ngIf="checkingAddress()">
                  <small>Comprobando dirección…</small>
                </div>
                <div class="delivery-check-status ok" *ngIf="!checkingAddress() && deliveryCheck()?.checked && deliveryCheck()?.valid">
                  <small *ngIf="(deliveryCheck()!.surchargeAmount || 0) > 0">🚚 Se aplicará un incremento por desplazamiento de {{ deliveryCheck()!.surchargeAmount | number:'1.2-2' }}€.</small>
                  <small *ngIf="!(deliveryCheck()!.surchargeAmount || 0)">✅ Dirección dentro de nuestro radio de reparto.</small>
                </div>
                <div class="delivery-check-status corrected" *ngIf="!checkingAddress() && deliveryCheck()?.valid && deliveryCheck()?.addressCorrected">
                  <small>✏️ Hemos corregido tu dirección, compruébala por favor: <strong>{{ deliveryCheck()!.formattedAddress }}</strong></small>
                </div>
                <div class="delivery-check-status error" *ngIf="!checkingAddress() && deliveryCheck() && deliveryCheck()!.valid === false">
                  <small>⚠️ {{ deliveryCheckErrorMessage() }}</small>
                </div>
                
                <!-- Calendario de Selección de Fecha -->
                <div class="form-group mt-3 mb-4">
                  <label class="mb-2 d-block">Fecha de Entrega</label>
                  <app-delivery-calendar 
                    [selectedDate]="checkoutForm.get('date')?.value"
                    (dateSelected)="onDateSelected($event)">
                  </app-delivery-calendar>
                  <small class="text-danger mt-1" *ngIf="checkoutForm.get('date')?.touched && checkoutForm.get('date')?.invalid">
                    Por favor, selecciona un día disponible (en verde) en el calendario.
                  </small>
                </div>

                <!-- Selección de Horario -->
                <div class="form-group" *ngIf="checkoutForm.get('date')?.value">
                  <label>Hora de Entrega (Intervalos de 30m para el {{ checkoutForm.get('date')?.value }})</label>
                  <select formControlName="timeSlot">
                    <option value="">Selecciona hora de entrega...</option>
                    <option *ngFor="let slot of availableSlots()" [value]="slot.time" [disabled]="!slot.available">
                      {{ slot.time }} {{ !slot.available ? '(Horario no disponible / reservado)' : '' }}
                    </option>
                  </select>
                  <small class="text-muted" *ngIf="availableSlots().length === 0">
                    No hay franjas horarias disponibles para este día.
                  </small>
                </div>
              </div>

              <!-- Optional Message -->
              <div class="form-section">
                <h3 class="title-font">3. Personalización</h3>
                <div class="form-group">
                  <label>Mensaje para la tarjeta (opcional)</label>
                  <textarea formControlName="message" rows="3" placeholder="Ej: ¡Muchas felicidades! Que tengas un día maravilloso."></textarea>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg btn-block mt-4" [disabled]="checkoutForm.invalid || isSubmitting() || checkingAddress() || deliveryCheck()?.valid === false">
                {{ isSubmitting() ? 'Procesando...' : 'Confirmar y Pagar ' + (displayTotal() | number:'1.2-2') + '€' }}
              </button>
            </form>
          </ng-template>

        </div>

        <!-- Order Summary Column -->
        <aside class="order-summary-column">
          <div class="summary-card shadow-sm sticky-top">
            <h3 class="title-font">Resumen de Pedido</h3>
            <div class="summary-items">
              <div class="summary-item-card" *ngFor="let item of cart.items()">
                <div class="item-info">
                  <span class="item-name">{{ item.product.name }}</span>
                  <span class="item-price">{{ (item.product.price || 0) * item.quantity | number:'1.2-2' }}€</span>
                </div>

                <div class="item-controls mt-2">
                  <div class="quantity-picker">
                    <button class="qty-btn" (click)="handleUpdateQuantity(item.product.id, item.quantity - 1)" [disabled]="item.quantity <= 1">
                      <span>−</span>
                    </button>
                    <span class="quantity-value">{{ item.quantity }}</span>
                    <button class="qty-btn" (click)="handleUpdateQuantity(item.product.id, item.quantity + 1)">
                      <span>+</span>
                    </button>
                  </div>

                  <button class="remove-btn" (click)="handleRemoveItem(item.product.id, item.product.name ?? '')" title="Eliminar producto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>

              <div class="summary-item-card surcharge-item" *ngIf="deliveryCheck()?.checked && deliveryCheck()?.valid && (deliveryCheck()!.surchargeAmount || 0) > 0">
                <div class="item-info">
                  <span class="item-name">🚚 Incremento por desplazamiento</span>
                  <span class="item-price">{{ deliveryCheck()!.surchargeAmount | number:'1.2-2' }}€</span>
                </div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="summary-total">
              <span>Total</span>
              <span>{{ displayTotal() | number:'1.2-2' }}€</span>
            </div>

            <div class="trust-badges mt-4">
               <div class="badge-item">🛡️ Pago 100% Seguro</div>
               <div class="badge-item">🚚 Envío Local Garantizado</div>
               <div class="badge-item">🥐 Productos del Día</div>
            </div>
          </div>
        </aside>

      </div>

      <!-- Success Template -->
      <ng-template #successState>
        <div class="success-message fade-in text-center">
          <div class="success-icon">🎉</div>
          <h1 class="title-font">¡Pedido Recibido!</h1>
          <p>Tu pedido <strong>{{ orderId() }}</strong> ha sido procesado correctamente.</p>
          <p>Te hemos enviado un correo de confirmación con todos los detalles.</p>
          <div class="mt-4">
            <button class="btn btn-primary" routerLink="/">Volver al Inicio</button>
          </div>
        </div>
      </ng-template>

    </main>
  `,
  styles: [`
    .checkout-page { margin-top: 2rem; }
    .checkout-grid { 
      display: grid; 
      grid-template-columns: 1fr 380px; 
      grid-template-areas: 
        "header header"
        "form summary";
      gap: 4rem; 
      align-items: start;
    }
    .checkout-header { grid-area: header; margin-bottom: 2rem; }
    .checkout-form-column { grid-area: form; }
    .order-summary-column { grid-area: summary; }
    .sticky-top { position: sticky; top: 2rem; }
    .form-section { background: white; padding: 2.5rem; border-radius: 12px; border: 1px solid #eee; margin-bottom: 2rem; }
    .stripe-embedded-card { min-height: 400px; }
    .form-section h3 { margin-bottom: 1.5rem; color: var(--primary); }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    label { font-weight: 600; font-size: 0.9rem; color: #444; }
    input, select, textarea { 
      padding: 0.8rem 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;
      transition: border-color 0.3s;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--secondary); }
    .delivery-data-box { background: #fff8e6; border: 1px solid #f0c36d; border-left: 4px solid #e67e22; border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 1.5rem; }
    .delivery-data-box h4 { margin: 0 0 0.6rem; color: #8b4513; font-size: 1.05rem; }
    .delivery-data-box p { margin: 0 0 0.3rem; }
    .delivery-data-box small { display: block; margin-top: 0.5rem; color: var(--text-muted); }
    .delivery-check-status { margin-top: -0.8rem; margin-bottom: 1.5rem; font-size: 0.85rem; }
    .delivery-check-status.checking { color: var(--text-muted); }
    .delivery-check-status.ok { color: #1e7e34; }
    .delivery-check-status.corrected { color: #8a5a00; background: #fff3cd; border-radius: 6px; padding: 0.5rem 0.7rem; }
    .delivery-data-box .corrected-warning { color: #8a5a00; font-weight: 600; }
    .delivery-check-status.error { color: #c0392b; font-weight: 600; }
    .surcharge-item .item-name { color: var(--secondary); font-style: italic; }
    .surcharge-item .item-price { color: var(--secondary); }
    .summary-card { background: #fdfaf7; padding: 2rem; border-radius: 12px; border: 1px solid #f0e2d1; }
    .summary-items { margin: 1.5rem 0; display: flex; flex-direction: column; gap: 1.25rem; }
    
    .summary-item-card {
      display: flex;
      flex-direction: column;
      padding-bottom: 1rem;
      border-bottom: 1px dashed #eecdab;
    }
    .summary-item-card:last-child { border-bottom: none; padding-bottom: 0; }
    
    .item-info { display: flex; justify-content: space-between; align-items: flex-start; }
    .item-name { font-weight: 500; font-size: 0.95rem; color: #444; max-width: 70%; }
    .item-price { font-weight: 700; color: var(--primary); font-size: 0.95rem; }
    
    .item-controls { display: flex; justify-content: space-between; align-items: center; }
    
    .quantity-picker {
      display: flex;
      align-items: center;
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
      background: white;
    }
    .qty-btn {
      background: none;
      border: none;
      padding: 0.3rem 0.6rem;
      cursor: pointer;
      font-weight: bold;
      color: #333;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      width: 32px;
      height: 32px;
    }
    .qty-btn:hover:not(:disabled) {
      background: #fdfaf7;
    }
    .qty-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .quantity-value {
      font-weight: 600;
      padding: 0 0.5rem;
      font-size: 0.9rem;
      min-width: 24px;
      text-align: center;
      border-left: 1px solid #ddd;
      border-right: 1px solid #ddd;
      height: 32px;
      display: flex;
      align-items: center;
    }
    
    .remove-btn {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .remove-btn:hover { background: #fee2e2; color: #ef4444; }

    .summary-total { display: flex; justify-content: space-between; font-weight: 800; font-size: 1.3rem; color: var(--primary); margin-top: 1rem; }
    .trust-badges { display: flex; flex-direction: column; gap: 0.8rem; font-size: 0.85rem; color: var(--text-muted); }
    .success-message { padding: 6rem 0; }
    .success-icon { font-size: 5rem; margin-bottom: 2rem; }
    .btn-block { width: 100%; }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      filter: grayscale(0.5);
      transform: none !important;
      box-shadow: none !important;
    }
    
    @media (max-width: 992px) {
      .checkout-grid { 
        display: grid;
        grid-template-columns: 1fr;
        grid-template-areas: 
          "header"
          "summary"
          "form";
        gap: 3rem; 
      }
      .order-summary-column { margin-top: 0; }
    }

    @media (max-width: 768px) {
      .form-section {
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }
      .form-row {
        grid-template-columns: 1fr;
        gap: 0;
      }
      .section-title {
        font-size: 2rem;
      }
      .summary-card {
        padding: 1.5rem;
      }
    }
  `]
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  cart = inject(CartStore);
  private orderService = inject(OrderService);
  private authStore = inject(AuthStore);
  private appointmentService = inject(AppointmentService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  isSubmitting = signal(false);
  orderSuccess = signal(false);
  showStripeCheckout = signal(false);
  orderId = signal('');
  sessionId = signal('');
  availableSlots = signal<TimeSlot[]>([]);
  checkingAddress = signal(false);
  deliveryCheck = signal<DeliveryCheckResult | null>(null);
  private lastCheckedAddressKey = '';
  private checkoutInstance: any = null;
  private unsubscribeOrderListener: any = null;
  private stripeMessageListener: any = null;
  private stripePollingInterval: any = null;

  checkoutForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,}$/)]],
    address: ['', [Validators.required]],
    addressExtra: [''],
    city: ['', [Validators.required]],
    zip: ['', [Validators.required]],
    date: ['', [Validators.required]],
    timeSlot: ['', [Validators.required]],
    message: ['']
  });

  constructor() {
    this.checkoutForm.get('date')?.valueChanges.subscribe(async (date) => {
      if (date) {
        this.availableSlots.set([]);
        this.checkoutForm.get('timeSlot')?.setValue('');
        const slots = await this.appointmentService.getAvailableSlots(date);
        this.availableSlots.set(slots);
      }
    });
  }

  listenToOrderStatus(orderDocId: string) {
    if (!orderDocId) return;
    if (this.unsubscribeOrderListener) {
      clearInterval(this.unsubscribeOrderListener);
      this.unsubscribeOrderListener = null;
    }

    this.unsubscribeOrderListener = setInterval(async () => {
      const status = await this.orderService.getOrderStatus(orderDocId);
      if (status) {
        if (status === 'cancelled' && (this.showStripeCheckout() || this.isSubmitting())) {
          if (this.unsubscribeOrderListener) {
            clearInterval(this.unsubscribeOrderListener);
            this.unsubscribeOrderListener = null;
          }
          if (this.checkoutInstance) {
            try { this.checkoutInstance.destroy(); } catch (e) { }
            this.checkoutInstance = null;
          }
          this.showStripeCheckout.set(false);
          this.isSubmitting.set(false);

          await this.confirmDialog.open({
            title: '🔴 Pedido Cancelado',
            message: 'Has alcanzado el número máximo de intentos fallidos de pago para este pedido (o el tiempo límite ha expirado). El pedido ha sido cancelado y la hora reservada liberada.',
            confirmText: 'Entendido',
            cancelText: '',
            type: 'danger'
          });
          this.router.navigate(['/productos']);
        } else if (status === 'paid') {
            if (this.unsubscribeOrderListener) {
                clearInterval(this.unsubscribeOrderListener);
                this.unsubscribeOrderListener = null;
            }
            this.router.navigate(['/checkout/success'], { queryParams: { order_id: orderDocId } });
        }
      }
    }, 5000) as any;
  }

  ngOnInit() {
    if (this.cart.items().length === 0) {
      this.router.navigate(['/productos']);
    }
  }

  onDateSelected(dateStr: string) {
    this.checkoutForm.get('date')?.setValue(dateStr);
    this.checkoutForm.get('date')?.markAsTouched();
  }

  /**
   * Comprueba en vivo (al salir del campo de dirección/ciudad/CP) si la dirección existe y
   * está dentro del radio de reparto. Deduplicada: si la dirección no ha cambiado desde la
   * última comprobación, no repite la llamada. La comprobación autoritativa (que de verdad
   * bloquea el pedido) se repite en el servidor al enviar (ver onSubmit / OrderService.submitOrder).
   */
  async checkAddress() {
    const { address, city, zip } = this.checkoutForm.value;
    if (!address || !city || !zip) {
      this.deliveryCheck.set(null);
      this.lastCheckedAddressKey = '';
      return;
    }

    const key = `${address}|${city}|${zip}`;
    if (key === this.lastCheckedAddressKey) return;
    this.lastCheckedAddressKey = key;

    this.checkingAddress.set(true);
    const result = await this.orderService.checkDeliveryDistance(address, city, zip);
    // Si la dirección volvió a cambiar mientras esperábamos la respuesta, descartamos este resultado obsoleto
    if (key === this.lastCheckedAddressKey) {
      this.deliveryCheck.set(result);
      this.checkingAddress.set(false);
    }
  }

  displayTotal(): number {
    const surcharge = this.deliveryCheck()?.valid ? (this.deliveryCheck()?.surchargeAmount || 0) : 0;
    return this.cart.totalPrice() + surcharge;
  }

  deliveryCheckErrorMessage(): string {
    const check = this.deliveryCheck();
    if (!check) return '';
    if (check.reason === 'address_not_found') {
      return 'No hemos podido localizar esa dirección. Revisa que la calle, el número, la ciudad y el código postal sean correctos.';
    }
    if (check.reason === 'check_unavailable') {
      return 'No hemos podido verificar tu dirección en este momento. Inténtalo de nuevo en unos minutos.';
    }
    if (check.reason === 'too_far') {
      return `Tu dirección está a ${check.durationMinutes} min de trayecto, fuera de nuestro radio de reparto (máx. ${check.maxDeliveryMinutes} min).`;
    }
    return 'No podemos procesar el pedido con esa dirección.';
  }

  private setupStripeErrorDetector() {
    if (this.stripeMessageListener) {
      window.removeEventListener('message', this.stripeMessageListener);
    }

    let lastErrorDetectedTime = 0;

    this.stripeMessageListener = async (event: MessageEvent) => {
      if (event.origin && (event.origin.includes('stripe.com') || event.origin.includes('stripe.network'))) {
        let msgStr = '';
        try {
          msgStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        } catch (e) { }

        const lowerMsg = msgStr.toLowerCase();

        // Evitar falsos positivos en eventos de carga normal o redimensionamiento
        const isNormalEvent = lowerMsg.includes('resize') || lowerMsg.includes('page_load') || lowerMsg.includes('ready');

        const isErrorText = !isNormalEvent && (
          lowerMsg.includes('checkoutsubmitfailed') ||
          lowerMsg.includes('checkout_submit_failed') ||
          lowerMsg.includes('card_declined') ||
          lowerMsg.includes('declined') ||
          lowerMsg.includes('submit_failed') ||
          lowerMsg.includes('payment_intent_failed') ||
          lowerMsg.includes('charge_failed') ||
          lowerMsg.includes('402') ||
          lowerMsg.includes('error') ||
          lowerMsg.includes('failed') ||
          lowerMsg.includes('rejected')
        );

        const now = Date.now();
        if (isErrorText && (now - lastErrorDetectedTime > 1500) && this.orderId() && this.showStripeCheckout()) {
          lastErrorDetectedTime = now;
          await this.handlePaymentFailure(this.orderId());
        }
      }
    };

    window.addEventListener('message', this.stripeMessageListener);
  }

  private startStripeStatusPolling() {
    if (this.stripePollingInterval) {
      clearInterval(this.stripePollingInterval);
    }

    this.stripePollingInterval = setInterval(async () => {
      const oId = this.orderId();
      const sId = this.sessionId();
      if (oId && sId && this.showStripeCheckout()) {
        const res = await this.orderService.checkStripePaymentStatus(oId, sId);
        if (res && res.hasError) {
          if (res.cancelled || (res.attempts && res.attempts >= 3)) {
            this.stopStripeStatusPolling();
            this.showStripeCheckout.set(false);
            await this.confirmDialog.open({
              title: '🔴 Pedido Cancelado',
              message: 'Has alcanzado el número máximo de 3 intentos fallidos de pago para este pedido. El pedido ha sido cancelado.',
              confirmText: 'Entendido',
              cancelText: '',
              type: 'danger'
            });
            this.router.navigate(['/productos']);
          } else if (res.attempts) {
            this.toastService.error(`Intento de pago fallido en Stripe (${res.attempts}/3). Inténtalo de nuevo con otra tarjeta.`);
          }
        }
      } else {
        this.stopStripeStatusPolling();
      }
    }, 3000);
  }

  private stopStripeStatusPolling() {
    if (this.stripePollingInterval) {
      clearInterval(this.stripePollingInterval);
      this.stripePollingInterval = null;
    }
  }

  ngOnDestroy() {
    this.stopStripeStatusPolling();
    if (this.stripeMessageListener) {
      window.removeEventListener('message', this.stripeMessageListener);
      this.stripeMessageListener = null;
    }
    if (this.unsubscribeOrderListener) {
      clearInterval(this.unsubscribeOrderListener);
      this.unsubscribeOrderListener = null;
    }
    if (this.checkoutInstance) {
      try {
        this.checkoutInstance.destroy();
      } catch (e) {
        // Ignore destroy error on teardown
      }
      this.checkoutInstance = null;
    }
  }

  handleUpdateQuantity(productId: string, newQty: number) {
    if (newQty < 1) return;
    this.cart.updateQuantity(productId, newQty);
  }

  async handleRemoveItem(productId: string, productName: string) {
    const confirmed = await this.confirmDialog.open({
      title: 'Eliminar producto',
      message: `¿Estás seguro de que quieres eliminar "${productName}" del pedido?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'No, mantener',
      type: 'danger'
    });

    if (confirmed) {
      this.cart.removeItem(productId);
      if (this.cart.items().length === 0) {
        this.router.navigate(['/productos']);
      }
    }
  }

  async mountStripe(clientSecret: string) {
    try {
      if (this.checkoutInstance) {
        try {
          this.checkoutInstance.destroy();
        } catch (e) { }
        this.checkoutInstance = null;
      }

      const container = document.getElementById('stripe-checkout-element');
      if (container) container.innerHTML = '';

      const stripe = await loadStripe(STRIPE_PK);
      if (stripe) {
        this.checkoutInstance = await (stripe as any).createEmbeddedCheckoutPage({
          clientSecret: clientSecret
        });

        this.setupStripeErrorDetector();
        this.checkoutInstance.mount('#stripe-checkout-element');
      }
    } catch (stripeErr: any) {
      await this.handlePaymentFailure(this.orderId());
    }
  }

  async handlePaymentFailure(orderId: string) {
    if (!orderId) return;
    const res = await this.orderService.registerFailedAttempt(orderId);
    if (res && (res.cancelled || (res.attempts && res.attempts >= 3))) {
      this.showStripeCheckout.set(false);
      await this.confirmDialog.open({
        title: '🔴 Pedido Cancelado',
        message: 'Has alcanzado el número máximo de 3 intentos fallidos de pago para este pedido. El pedido ha sido cancelado y la hora reservada ha sido liberada.',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'danger'
      });
      this.router.navigate(['/productos']);
    } else if (res && res.attempts) {
      this.toastService.error(`Intento de pago fallido (${res.attempts}/3). Inténtalo de nuevo.`);
    }
  }

  async onSubmit() {
    if (this.checkoutForm.invalid) return;

    // Asegura que la comprobación de distancia corresponde a la dirección actual del formulario
    await this.checkAddress();
    if (this.deliveryCheck()?.valid === false) {
      this.toastService.error(this.deliveryCheckErrorMessage());
      return;
    }

    this.isSubmitting.set(true);

    const formVal = this.checkoutForm.value;
    const orderData: OrderData = {
      customer: {
        uid: this.authStore.user()?.uid,
        name: formVal.name,
        email: formVal.email,
        phone: formVal.phone
      },
      delivery: {
        address: formVal.address, addressExtra: formVal.addressExtra, city: formVal.city, zip: formVal.zip,
        date: formVal.date, timeSlot: formVal.timeSlot, message: formVal.message
      },
      items: this.cart.items(),
      total: this.cart.totalPrice(),
      status: 'pending',
      createdAt: new Date()
    };

    try {
      const result = await this.orderService.submitOrder(orderData);

      if (result.success && (result.redsysOrderId || result.orderId)) {
        const orderIdToPay = result.redsysOrderId || result.orderId!;
        const docIdToListen = result.orderId || orderIdToPay;
        this.orderId.set(orderIdToPay);
        this.listenToOrderStatus(docIdToListen);

        // Usamos el total autoritativo devuelto por el servidor (incluye el incremento por
        // desplazamiento calculado en servidor), no el subtotal local sin incremento.
        const amountToCharge = result.total ?? orderData.total;
        const paymentParams: any = await this.orderService.initPayment(amountToCharge, orderIdToPay);

        if (paymentParams && paymentParams.clientSecret) {
          if (paymentParams.sessionId) {
            this.sessionId.set(paymentParams.sessionId);
            this.startStripeStatusPolling();
          }
          this.showStripeCheckout.set(true);
          this.isSubmitting.set(false);

          setTimeout(async () => {
            await this.mountStripe(paymentParams.clientSecret);
          }, 150);

        } else if (paymentParams?.reason === 'slot_unavailable') {
          this.toastService.error(paymentParams.message || 'La hora de entrega elegida ya no está disponible. Elige otra.');
          this.isSubmitting.set(false);
          const date = this.checkoutForm.get('date')?.value;
          this.checkoutForm.get('timeSlot')?.setValue('');
          if (date) this.availableSlots.set(await this.appointmentService.getAvailableSlots(date));
        } else {
          this.toastService.error('Error al generar la pasarela de pago con Stripe.');
          this.isSubmitting.set(false);
          await this.handlePaymentFailure(orderIdToPay);
        }
      } else {
        if (result.reason === 'too_far' || result.reason === 'address_not_found' || result.reason === 'check_unavailable') {
          this.toastService.error(result.message || 'Tu dirección está fuera de nuestro radio de reparto.');
        } else if (result.reason === 'slot_unavailable') {
          this.toastService.error(result.message || 'La hora de entrega elegida ya no está disponible. Elige otra.');
          const date = this.checkoutForm.get('date')?.value;
          this.checkoutForm.get('timeSlot')?.setValue('');
          if (date) this.availableSlots.set(await this.appointmentService.getAvailableSlots(date));
        } else {
          this.toastService.error('Hubo un error al guardar tu pedido.');
        }
        this.isSubmitting.set(false);
      }
    } catch (err: any) {
      this.isSubmitting.set(false);
      await this.handlePaymentFailure(this.orderId());
    }
  }
}



