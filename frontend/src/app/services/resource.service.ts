import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppStore, ResourceMap } from '../store/app.store';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ResourceService {
    private http = inject(HttpClient);
    private store = inject(AppStore);
    private readonly API_URL = `${environment.apiUrl}/products`;

    constructor() {
        this.init();
    }

    async init() {
        this.store.setLoading(true);
        try {
            const products = await firstValueFrom(this.http.get<ResourceMap[]>(this.API_URL));

            const baseUrl = environment.apiUrl.replace('/api', '');
            (products || []).forEach(p => {
                if (p.local_image_path && p.local_image_path.startsWith('/')) {
                    p.local_image_path = baseUrl + p.local_image_path;
                }
            });
            this.store.setResources(products || []);
            this.store.setLoading(false);
        } catch (err: any) {
            this.store.setError("Could not load products.");
            this.store.setLoading(false);
        }
    }
}
