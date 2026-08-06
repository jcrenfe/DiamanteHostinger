import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Offer {
    id?: string;
    title: string;
    description: string;
    code?: string; 
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
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/offers`;

    private offersSignal = signal<Offer[]>([]);
    offers = this.offersSignal.asReadonly();

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    async loadOffers() {
        try {
            const list = await firstValueFrom(this.http.get<Offer[]>(this.API_URL, { headers: this.getHeaders() }));
            this.offersSignal.set(list || []);
        } catch(e) {
            this.offersSignal.set([]);
        }
    }

    async getActiveOffers() {
        try {
            const list = await firstValueFrom(this.http.get<Offer[]>(`${this.API_URL}?active=true`, { headers: this.getHeaders() }));
            return list || [];
        } catch (e) {
            return [];
        }
    }

    async saveOffer(offer: Offer) {
        if (offer.id) {
            await firstValueFrom(this.http.put(`${this.API_URL}/${offer.id}`, offer, { headers: this.getHeaders() }));
        } else {
            await firstValueFrom(this.http.post(this.API_URL, offer, { headers: this.getHeaders() }));
        }
        await this.loadOffers();
    }

    async deleteOffer(id: string) {
        await firstValueFrom(this.http.delete(`${this.API_URL}/${id}`, { headers: this.getHeaders() }));
        await this.loadOffers();
    }
}
