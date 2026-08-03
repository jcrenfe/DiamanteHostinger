import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CartItem } from '../store/cart.store';
import { firstValueFrom } from 'rxjs';
import { db, functions } from '../app.firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { AppStore } from '../store/app.store';

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
    status: 'pending' | 'paid' | 'delivered' | 'cancelled';
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private http = inject(HttpClient);
    private store = inject(AppStore);

    async submitOrder(order: OrderData): Promise<{ success: boolean, orderId?: string, redsysOrderId?: string }> {
        try {
            const redsysOrderId = Math.floor(100000000000 + Math.random() * 900000000000).toString();

            const cleanOrder = JSON.parse(JSON.stringify(order));

            const ordersCol = collection(db, 'pedidos');
            const docRef = await addDoc(ordersCol, {
                ...cleanOrder,
                redsysOrderId: redsysOrderId,
                createdAt: serverTimestamp(),
                status: 'pending',
                failedPaymentAttempts: 0
            });

            return { success: true, orderId: docRef.id, redsysOrderId: redsysOrderId };
        } catch (err) {
            return { success: false };
        }
    }

    async getOrdersByUser(uid: string, email?: string): Promise<any[]> {
        try {
            const ordersCol = collection(db, 'pedidos');
            const ordersMap = new Map<string, any>();

            if (uid) {
                const qUid = query(ordersCol, where('customer.uid', '==', uid));
                const snapUid = await getDocs(qUid);
                snapUid.docs.forEach(doc => ordersMap.set(doc.id, { id: doc.id, ...doc.data() }));
            }

            if (email) {
                const qEmail = query(ordersCol, where('customer.email', '==', email));
                const snapEmail = await getDocs(qEmail);
                snapEmail.docs.forEach(doc => ordersMap.set(doc.id, { id: doc.id, ...doc.data() }));
            }

            const orders = Array.from(ordersMap.values());

            orders.sort((a, b) => {
                const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            return orders;
        } catch (err) {
            return [];
        }
    }

    async getOrderById(orderId: string): Promise<any> {
        try {
            const ordersCol = collection(db, 'pedidos');
            const docRef = doc(ordersCol, orderId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            const q = query(ordersCol, where('redsysOrderId', '==', orderId));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
                const docFound = querySnap.docs[0];
                return { id: docFound.id, ...docFound.data() };
            }
            return null;
        } catch (err) {
            return null;
        }
    }

    async registerFailedAttempt(orderId: string): Promise<{ success: boolean; attempts?: number; cancelled?: boolean; message?: string }> {
        try {
            const registerFailedFn = httpsCallable(functions, 'registerFailedPaymentAttempt');
            const res: any = await registerFailedFn({ orderId });
            return res.data;
        } catch (err) {
            return { success: false };
        }
    }

    async checkStripePaymentStatus(orderId: string, sessionId: string): Promise<any> {
        try {
            const checkStatusFn = httpsCallable(functions, 'checkStripePaymentStatus');
            const res: any = await checkStatusFn({ orderId, sessionId });
            return res.data;
        } catch (err) {
            return { success: false };
        }
    }



    async initPayment(amount: number, orderId: string): Promise<any> {
        const createPaymentFn = httpsCallable(functions, 'createPayment');
        const response = await createPaymentFn({ amount, orderId });
        return response.data;
    }

    async confirmOrderPayment(orderId: string, sessionId?: string): Promise<any> {
        const confirmPaymentFn = httpsCallable(functions, 'confirmOrderPayment');
        const response = await confirmPaymentFn({ orderId, sessionId });
        return response.data;
    }
}

