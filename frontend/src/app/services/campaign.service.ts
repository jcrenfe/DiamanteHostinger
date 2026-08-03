import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { db, functions } from '../app.firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

    async loadCampaigns(): Promise<Campaign[]> {
        const snap = await getDocs(collection(db, 'campañas'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Campaign);
    }

    async saveCampaign(campaign: Campaign): Promise<string> {
        if (campaign.id) {
            await updateDoc(doc(db, 'campañas', campaign.id), { ...campaign });
            return campaign.id;
        } else {
            const newDoc = doc(collection(db, 'campañas'));
            const id = newDoc.id;
            await setDoc(newDoc, { ...campaign, id, createdAt: serverTimestamp() });
            return id;
        }
    }

    async deleteCampaign(id: string) {
        await deleteDoc(doc(db, 'campañas', id));
    }

    async sendCampaign(campaign: Campaign, recipients: string[]) {
        // Uso de HTTPS Callable para envío masivo de campañas
        const sendFn = httpsCallable(functions, 'sendCampaign');
        const response = await sendFn({
            campaignId: campaign.id,
            header: campaign.header,
            summary: campaign.summary,
            message: campaign.message,
            cta: campaign.cta,
            image: campaign.image,
            recipients: recipients
        });
        return response.data;
    }

    async getClientUsers(): Promise<UserRecipient[]> {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users: UserRecipient[] = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            // SOLO CLIENTES (excluir administradores)
            if (data['email'] && data['role'] !== 'admin') {
                users.push({
                    id: doc.id,
                    email: data['email'],
                    name: data['name'] || data['displayName'] || data['nombre'] || 'Cliente',
                    role: data['role'] || 'cliente',
                    selected: true
                });
            }
        });
        return users;
    }

    async getSubscribersEmails(): Promise<string[]> {
        const clientUsers = await this.getClientUsers();
        return clientUsers.map(u => u.email);
    }
}
