import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ImageOptimizerService {

    /**
     * Optimizes an image: resizes it to a maximum dimension and compresses it.
     * Uses modern APIs and provides better error handling.
     */
    async optimize(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Optimización lenta/fallida')), 10000);
            const url = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                clearTimeout(timeout);
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height = (height / width) * maxWidth;
                        width = maxWidth;
                    } else {
                        width = (width / height) * maxWidth;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Context fail'));
                    return;
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) resolve(blob);
                    else {
                        // Fallback simple
                        canvas.toBlob((b) => b ? resolve(b) : reject('Encoder fail'), 'image/jpeg', quality);
                    }
                }, 'image/webp', quality);
            };

            img.onerror = () => {
                clearTimeout(timeout);
                URL.revokeObjectURL(url);
                reject(new Error('Path fail'));
            };

            img.src = url;
        });
    }
}
