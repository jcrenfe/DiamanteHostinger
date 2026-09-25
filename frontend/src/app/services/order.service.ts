import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CartItem } from '../store/cart.store';
import { firstValueFrom } from 'rxjs';
import { AppStore } from '../store/app.store';
import { environment } from '../../environments/environment';

export interface DeliveryCheckResult {
    valid: boolean;
    checked?: boolean;
    reason?: string;
    durationMinutes?: number;
    distanceKm?: number;
    maxDeliveryMinutes?: number;
    formattedAddress?: string;
    proximity?: 'near' | 'medium' | 'far';
    surchargeAmount?: number;
}

export interface OrderData {
    customer: {
        uid?: string;
        name: string;
        email: string;
        phone: string;
    };
    delivery: {
        address: string;
        city: string;
        zip: string;
        date: string;
        timeSlot: string;
        message?: string;
    };
    items: CartItem[];
    total: number;
    status?: 'pending' | 'paid' | 'delivered' | 'cancelled';
    createdAt?: Date;
}

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private http = inject(HttpClient);
    private store = inject(AppStore);
    private readonly API_URL = `${environment.apiUrl}/orders`;
    private readonly PAYMENT_URL = `${environment.apiUrl}/payment`;

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    async submitOrder(order: OrderData): Promise<{ success: boolean, orderId?: string, redsysOrderId?: string, reason?: string, message?: string, total?: number }> {
        try {
            const redsysOrderId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
            // Creamos ID ficticio si el backend espera UUID o autogenerado
            const orderId = redsysOrderId;

            const response = await firstValueFrom(
                this.http.post<any>(this.API_URL, {
                    id: orderId,
                    ...order,
                    redsysOrderId
                }, { headers: this.getHeaders() })
            );

            // response.total es el total autoritativo calculado en servidor (subtotal +
            // incremento por desplazamiento si aplica), puede diferir del enviado en `order.total`.
            return { success: true, orderId: response.id, redsysOrderId: response.redsysOrderId, total: response.total };
        } catch (err: any) {
            // El backend rechaza pedidos fuera del radio de reparto con 422 y un motivo explícito
            const body = err?.error;
            return { success: false, reason: body?.reason, message: body?.error };
        }
    }

    /**
     * Comprueba en vivo (mientras el cliente rellena el checkout) si su dirección existe
     * y está dentro del radio de reparto. El backend siempre responde 200 aquí (nunca
     * bloquea por un fallo técnico propio); el bloqueo real y autoritativo ocurre en
     * submitOrder(), que repite la comprobación en el servidor.
     */
    async checkDeliveryDistance(address: string, city: string, zip: string): Promise<DeliveryCheckResult> {
        try {
            return await firstValueFrom(
                this.http.post<DeliveryCheckResult>(`${environment.apiUrl}/logistics/check-delivery`, { address, city, zip })
            );
        } catch (err) {
            return { valid: true, checked: false, reason: 'check_failed' };
        }
    }

    async getOrdersByUser(uid: string, email?: string): Promise<any[]> {
        try {
            const response = await firstValueFrom(
                this.http.get<any[]>(this.API_URL, { headers: this.getHeaders() })
            );
            return response;
        } catch (err) {
            return [];
        }
    }

    async getAllOrders(): Promise<any[]> {
        try {
            return await firstValueFrom(
                this.http.get<any[]>(this.API_URL, { headers: this.getHeaders() })
            );
        } catch (err) {
            return [];
        }
    }

    async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
        try {
            await firstValueFrom(
                this.http.put(`${this.API_URL}/${orderId}/status`, { status }, { headers: this.getHeaders() })
            );
            return true;
        } catch (err) {
            return false;
        }
    }

    async getOrderById(orderId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.get<any>(`${this.API_URL}/${orderId}`, { headers: this.getHeaders() })
            );
            return response;
        } catch (err) {
            return null;
        }
    }

    async registerFailedAttempt(orderId: string): Promise<{ success: boolean; attempts?: number; cancelled?: boolean; message?: string }> {
        // Mocked or mapped to backend route
        return { success: true };
    }

    async checkStripePaymentStatus(orderId: string, sessionId: string): Promise<any> {
        return { success: true, status: 'paid' };
    }

    async initPayment(amount: number, orderId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.post<any>(`${this.PAYMENT_URL}/create-payment`, { amount, orderId })
            );
            return response;
        } catch (e: any) {
            // 409 del servidor: la hora ya no está disponible / el pedido ya no está activo
            return { success: false, reason: e?.error?.reason, message: e?.error?.error };
        }
    }

    async confirmOrderPayment(orderId: string, sessionId?: string): Promise<any> {
        // Redsys will notify automatically, but if needed via Stripe
        return { success: true, orderId };
    }
}
