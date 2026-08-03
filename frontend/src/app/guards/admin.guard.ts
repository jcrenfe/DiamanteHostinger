import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../store/auth.store';
import { map, take } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    // If loading, we wait or return true if we trust sync, 
    // but better to check the signal/store state
    if (store.user()?.role === 'admin') {
        return true;
    }

    router.navigate(['/login']);
    return false;
};
