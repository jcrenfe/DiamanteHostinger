import { Injectable, signal, computed } from '@angular/core';
import { ResourceMap } from './app.store';

export interface CartItem {
    product: ResourceMap;
    quantity: number;
}

@Injectable({
    providedIn: 'root'
})
export class CartStore {
    // State
    private _items = signal<CartItem[]>([]);
    private _isOpen = signal<boolean>(false);

    // Selectors
    items = computed(() => this._items());
    isOpen = computed(() => this._isOpen());

    totalItems = computed(() =>
        this._items().reduce((acc, item) => acc + item.quantity, 0)
    );

    totalPrice = computed(() =>
        this._items().reduce((acc, item) => {
            const price = item.product.price || 0;
            return acc + (price * item.quantity);
        }, 0)
    );

    // Actions
    toggleCart() {
        this._isOpen.update(open => !open);
    }

    openCart() {
        this._isOpen.set(true);
    }

    closeCart() {
        this._isOpen.set(false);
    }

    addItem(product: ResourceMap, quantity: number = 1) {
        this._items.update(items => {
            const existing = items.find(i => i.product.id === product.id);
            if (existing) {
                return items.map(i =>
                    i.product.id === product.id
                        ? { ...i, quantity: i.quantity + quantity }
                        : i
                );
            }
            return [...items, { product, quantity }];
        });
        this.openCart(); // Show cart when adding item
    }

    removeItem(productId: string) {
        this._items.update(items => items.filter(i => i.product.id !== productId));
    }

    updateQuantity(productId: string, quantity: number) {
        if (quantity <= 0) {
            this.removeItem(productId);
            return;
        }
        this._items.update(items =>
            items.map(i => i.product.id === productId ? { ...i, quantity } : i)
        );
    }

    setItems(items: CartItem[]) {
        this._items.set(items || []);
    }

    clearCart() {
        this._items.set([]);
    }
}
