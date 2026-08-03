import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../store/auth.store';
import { filter, map, take } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export const authGuard: CanActivateFn = (route, state) => {
    const store = inject(AuthStore);
    const router = inject(Router);

    // Convert Signal to Observable to wait for initial load if necessary
    return toObservable(store.loading).pipe(
        filter(loading => !loading), // Wait until not loading
        take(1),
        map(() => {
            if (store.isAuthenticated()) {
                return true;
            } else {
                router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
                return false;
            }
        })
    );
};

export const adminGuard: CanActivateFn = (route, state) => {
    const store = inject(AuthStore);
    const router = inject(Router);

    return toObservable(store.loading).pipe(
        filter(loading => !loading),
        take(1),
        map(() => {
            if (store.isAdmin()) {
                return true;
            } else {
                router.navigate(['/']); // Redirect clients away from admin
                return false;
            }
        })
    );
};
