import { Injectable, inject } from '@angular/core';
import { db } from '../app.firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { signal } from '@angular/core';

export interface Offer {
    id?: string;
    title: string;
    description: string;
    code?: string; // For coupons
    discountPercent?: number;
    active: boolean;
    type: 'banner' | 'coupon' | 'product_deal';
    imageUrl?: string;
    validUntil?: string;
    backgroundImage?: string;
    backgroundColor?: string;
    productId?: string;
    ribbonText?: string;
    ribbonColor?: string;
    ribbonTextColor?: string;
}

@Injectable({
    providedIn: 'root'
})
export class OfferService {
    private offersSignal = signal<Offer[]>([]);
    offers = this.offersSignal.asReadonly();

    async loadOffers() {
        const snap = await getDocs(collection(db, 'ofertas'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Offer);
        this.offersSignal.set(list);
    }

    async getActiveOffers() {
        const q = query(collection(db, 'ofertas'), where('active', '==', true));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Offer);
    }

    async saveOffer(offer: Offer) {
        if (offer.id) {
            await updateDoc(doc(db, 'ofertas', offer.id), { ...offer });
        } else {
            const newDoc = doc(collection(db, 'ofertas'));
            await setDoc(newDoc, { ...offer, id: newDoc.id });
        }
        await this.loadOffers();
    }

    async deleteOffer(id: string) {
        await deleteDoc(doc(db, 'ofertas', id));
        await this.loadOffers();
    }
}
