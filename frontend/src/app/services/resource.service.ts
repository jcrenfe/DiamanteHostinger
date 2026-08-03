import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppStore, ResourceMap } from '../store/app.store';
import { db } from '../app.firebase';
import { collection, getDocs, setDoc, doc, writeBatch } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ResourceService {
    private http = inject(HttpClient);
    private store = inject(AppStore);

    constructor() {
        this.init();
    }

    async init() {
        this.store.setLoading(true);
        try {
            // Priority 1: Try reading from Firestore
            const productsCol = collection(db, 'productos');
            const snapshot = await getDocs(productsCol);

            if (!snapshot.empty) {
                const products = snapshot.docs.map(doc => doc.data() as ResourceMap);
                this.store.setResources(products);
                this.store.setLoading(false);
                return;
            }

            // Priority 2: If Firestore is empty, load from JSON and SEED Firestore
            const data = await firstValueFrom(this.http.get<ResourceMap[]>('assets/mapeo_recursos.json'));

            const mappedData = data.filter(r => r.tipo === 'asociado').map((res, index) => {
                const item = { ...res };

                // Set a unique ID/Slug
                if (item.url_origen) {
                    const parts = item.url_origen.split('/');
                    item.id = parts[parts.length - 1] || `prod-${index}`;
                } else {
                    item.id = `item-${index}`;
                }

                // Map Image Path
                if (item.ruta_imagen) {
                    const fileName = item.ruta_imagen.split('\\').pop();
                    item.local_image_path = fileName ? `assets/images/${fileName}` : undefined;
                }

                // Map Product Details
                if (item.textos_asociados) {
                    item.name = item.textos_asociados[0] || '';
                    item.priceStr = item.textos_asociados[1] || '';
                    item.description = item.textos_asociados[2] || '';

                    if (item.priceStr) {
                        const priceMatch = item.priceStr.replace(',', '.').match(/[\d.]+/);
                        if (priceMatch) item.price = parseFloat(priceMatch[0]);
                        else item.price = 0;
                    } else {
                        item.price = 0;
                    }

                    if (item.url_origen && item.url_origen.includes('/collections/')) {
                        const colPart = item.url_origen.split('/collections/')[1];
                        item.category = colPart.split('/')[0].charAt(0).toUpperCase() + colPart.split('/')[0].slice(1);
                    } else {
                        item.category = 'Especiales';
                    }
                }

                // Ensure no undefined values for Firestore
                Object.keys(item).forEach(key => {
                    if ((item as any)[key] === undefined) {
                        (item as any)[key] = null;
                    }
                });

                return item;
            });

            // Seed Firestore (Batch write)
            const batch = writeBatch(db);
            mappedData.forEach(product => {
                const docRef = doc(db, 'productos', product.id!);
                batch.set(docRef, product);
            });
            await batch.commit();

            this.store.setResources(mappedData);
            this.store.setLoading(false);

        } catch (err: any) {
            this.store.setError("Could not sync with Database.");
            this.store.setLoading(false);
        }
    }
}
