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

            if (products && products.length > 0) {
                const baseUrl = environment.apiUrl.replace('/api', '');
                products.forEach(p => {
                    if (p.local_image_path && p.local_image_path.startsWith('/')) {
                        p.local_image_path = baseUrl + p.local_image_path;
                    }
                });
                this.store.setResources(products);
            } else {
                // Si la BD está vacía, cargamos los mock data temporalmente (no los insertamos porque requiere admin)
                const data = await firstValueFrom(this.http.get<ResourceMap[]>('assets/mapeo_recursos.json'));
                const mappedData = data.filter(r => r.tipo === 'asociado').map((item, index) => {
                    item.id = item.url_origen ? (item.url_origen.split('/').pop() || `prod-${index}`) : `prod-${index}`;
                    if (item.ruta_imagen) item.local_image_path = `assets/images/${item.ruta_imagen.split('\\').pop()}`;
                    if (item.textos_asociados) {
                        item.name = item.textos_asociados[0] || '';
                        const pStr = item.textos_asociados[1];
                        item.price = pStr ? parseFloat(pStr.replace(',', '.').match(/[\d.]+/)?.[0] || '0') : 0;
                        item.description = item.textos_asociados[2] || '';
                        item.category = item.url_origen?.includes('/collections/') ? item.url_origen.split('/collections/')[1].split('/')[0] : 'Especiales';
                    }
                    return item;
                });
                this.store.setResources(mappedData);
            }
            this.store.setLoading(false);
        } catch (err: any) {
            this.store.setError("Could not load products.");
            this.store.setLoading(false);
        }
    }
}
