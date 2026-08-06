import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Campaign {
    id?: string;
    header: string;
    summary: string;
    message: string;
    image?: string;
    cta: string;
    status: 'draft' | 'scheduled' | 'sending' | 'completed';
    recipientsCount?: number;
    scheduledFor?: string;
    createdAt?: any;
    lastSentAt?: any;
}

export interface UserRecipient {
    id: string;
    email: string;
    name: string;
    role?: string;
    selected?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CampaignService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/campaign`;
    
    // We will assume a users API exists to fetch clients
    private readonly USERS_URL = `${environment.apiUrl}/users`;

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    async loadCampaigns(): Promise<Campaign[]> {
        try {
            return await firstValueFrom(this.http.get<Campaign[]>(this.API_URL, { headers: this.getHeaders() }));
        } catch (e) {
            return [];
        }
    }

    async saveCampaign(campaign: Campaign): Promise<string> {
        if (campaign.id) {
            await firstValueFrom(this.http.put(`${this.API_URL}/${campaign.id}`, campaign, { headers: this.getHeaders() }));
            return campaign.id;
        } else {
            const res = await firstValueFrom(this.http.post<Campaign>(this.API_URL, campaign, { headers: this.getHeaders() }));
            return res.id!;
        }
    }

    async deleteCampaign(id: string) {
        await firstValueFrom(this.http.delete(`${this.API_URL}/${id}`, { headers: this.getHeaders() }));
    }

    async sendCampaign(campaign: Campaign, recipients: string[]) {
        const payload = {
            campaignId: campaign.id,
            header: campaign.header,
            summary: campaign.summary,
            message: campaign.message,
            cta: campaign.cta,
            image: campaign.image,
            recipients: recipients
        };
        const response = await firstValueFrom(this.http.post<any>(`${this.API_URL}/send-bulk`, payload, { headers: this.getHeaders() }));
        return response;
    }

    async getClientUsers(): Promise<UserRecipient[]> {
        try {
            const users = await firstValueFrom(this.http.get<UserRecipient[]>(`${this.USERS_URL}/clients`, { headers: this.getHeaders() }));
            return users.map(u => ({ ...u, selected: true }));
        } catch (e) {
            return [];
        }
    }

    async getSubscribersEmails(): Promise<string[]> {
        const clientUsers = await this.getClientUsers();
        return clientUsers.map(u => u.email);
    }
}
