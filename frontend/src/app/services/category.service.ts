import { Injectable, signal } from '@angular/core';
import { db } from '../app.firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, writeBatch, where } from 'firebase/firestore';

export interface Category {
    id?: string;
    name: string;
    isDefault?: boolean; // For "Varios"
    order?: number;
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private categoriesSignal = signal<Category[]>([]);
    categories = this.categoriesSignal.asReadonly();

    constructor() {}

    async loadCategories(): Promise<void> {
        try {
            const q = query(collection(db, 'categorias'), orderBy('order', 'asc'));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                // Seed initial categories if none exist
                await this.seedInitialCategories();
                return this.loadCategories();
            }

            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Category);
            
            // 🔥 MIGRATION: Auto-rename "Varios" to "Desayunos" if found as default
            const varios = list.find(c => (c.name === 'Varios' || c.id === 'varios') && c.isDefault);
            if (varios) {
                await this.saveCategory({ ...varios, name: 'Desayunos' });
                return this.loadCategories(); // Reload after migration
            }

            this.categoriesSignal.set(list);
        } catch (err) {
            // Si hay un error al leer de la BD (ej. permisos), mostramos las iniciales si estuvieran cargadas
        }
    }

    private async seedInitialCategories() {
        const initialNames = ["Cestas de frutas", "Desayuno infantil", "Desayunos", "Merienda y brunch", "Productos adicionales"];
        const batch = writeBatch(db);

        initialNames.forEach((name, index) => {
            const id = this.slugify(name);
            const docRef = doc(db, 'categorias', id);
            batch.set(docRef, {
                name,
                isDefault: name === 'Desayunos',
                order: index
            });
        });

        await batch.commit();
    }

    private slugify(text: string): string {
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    async saveCategory(category: Category) {
        if (category.id) {
            const oldCat = this.categories().find(c => c.id === category.id);
            if (oldCat && oldCat.name !== category.name) {
                // Rename detected: propagate to products
                await this.propagateCategoryRename(oldCat.name, category.name);
            }
            await updateDoc(doc(db, 'categorias', category.id), { ...category });
        } else {
            const id = this.slugify(category.name);
            const newDoc = doc(db, 'categorias', id);
            await setDoc(newDoc, { ...category, id });
        }
        await this.loadCategories();
    }

    async deleteCategory(id: string) {
        // Find if it's default
        const cat = this.categories().find(c => c.id === id);
        if (cat?.isDefault) {
            throw new Error('No se puede eliminar la categoría predeterminada.');
        }

        // Move products to "Desayunos" before deleting
        await this.reassignProductsToDefault(cat?.name);

        await deleteDoc(doc(db, 'categorias', id));
        await this.loadCategories();
    }

    private async propagateCategoryRename(oldName: string, newName: string) {
        const productsRef = collection(db, 'productos');
        const productsRef = collection(db, 'productos');
        const q = query(productsRef, where('category', '==', oldName));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                batch.update(d.ref, { category: newName });
            });
            await batch.commit();
        }
    }

    private async reassignProductsToDefault(oldCategoryName?: string) {
        if (!oldCategoryName) return;
        
        const defaultCat = this.categories().find(c => c.isDefault);
        if (!defaultCat) return;

        const productsRef = collection(db, 'productos');
        const q = query(productsRef, where('category', '==', oldCategoryName));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                batch.update(d.ref, { category: defaultCat.name });
            });
            await batch.commit();
        }
    }
}
