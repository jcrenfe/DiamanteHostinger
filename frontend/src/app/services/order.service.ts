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
    /** Google ha modificado la dirección escrita (errata, otro código postal…): hay que avisar al cliente */
    addressCorrected?: boolean;
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
        addressExtra?: string;
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
        // Sin sesión no se envía "Bearer null": el servidor lo registraría como token malformado
        return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
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
     * y está dentro del radio de reparto. Si la dirección no se puede verificar
     * se devuelve valid:false (no se acepta el pedido); el bloqueo real y autoritativo ocurre en
     * submitOrder(), que repite la comprobación en el servidor.
     */
    async checkDeliveryDistance(address: string, city: string, zip: string): Promise<DeliveryCheckResult> {
        try {
            return await firstValueFrom(
                this.http.post<DeliveryCheckResult>(`${environment.apiUrl}/logistics/check-delivery`, { address, city, zip })
            );
        } catch (err) {
            return { valid: false, checked: false, reason: 'check_unavailable' };
        }
    }

    /** Pedidos del usuario con sesión (mine=1: solo los propios, también si es administrador). */
    async getOrdersByUser(): Promise<any[]> {
        try {
            const response = await firstValueFrom(
                this.http.get<any[]>(`${this.API_URL}?mine=1`, { headers: this.getHeaders() })
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

    /** Estado del pedido (endpoint público, válido también para clientes sin sesión). */
    /** Pedido pendiente de pago al que se llega desde el enlace del correo (t = firma del enlace). */
    async getPaymentInfo(orderId: string, token: string): Promise<{ ok: boolean; status?: number; data?: any }> {
        try {
            const data = await firstValueFrom(
                this.http.get<any>(`${this.API_URL}/${encodeURIComponent(orderId)}/payment`, { params: { t: token } })
            );
            return { ok: true, data };
        } catch (e: any) {
            return { ok: false, status: e?.status };
        }
    }

    async getOrderStatus(orderId: string): Promise<string | null> {
        try {
            const res = await firstValueFrom(this.http.get<{ status: string }>(`${this.API_URL}/${orderId}/status`));
            return res?.status ?? null;
        } catch (err) {
            return null;
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

    /** Abre la pasarela de Stripe para un pedido ya guardado; el importe lo pone el servidor a partir del pedido. */
    async initPayment(orderId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.http.post<any>(`${this.PAYMENT_URL}/create-payment`, { orderId })
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
