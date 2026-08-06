import { Component, inject, signal, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfferService, Offer } from '../../services/offer.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImageOptimizerService } from '../../services/image-optimizer.service';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';

@Component({
  selector: 'app-offer-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUrlPipe],
  template: `
    <div class="offer-manager">
      <div class="header-actions">
        <h2 class="title-font">Gestión de Ofertas</h2>
        <button class="btn btn-primary" (click)="openModal()">+ Nueva Oferta</button>
      </div>

      <div class="offers-grid mt-4">
        <div class="offer-card shadow-sm fade-in" *ngFor="let offer of offerService.offers()" 
             [class.inactive]="!offer.active"
             [class.has-bg]="offer.backgroundColor || offer.backgroundImage"
             [ngStyle]="{
               'background-image': offer.backgroundImage ? 'url(' + (offer.backgroundImage | imageUrl) + ')' : 'none',
               'background-color': offer.backgroundColor || 'white',
               'background-size': 'cover',
               'background-position': 'center'
             }">
          <div class="card-badge" [class]="offer.type"
               [ngStyle]="{
                 'background-color': offer.ribbonColor || '',
                 'color': offer.ribbonTextColor || ''
               }">
            {{ offer.ribbonText || offer.type.replace('_', ' ') }}
          </div>
          <div class="offer-info">
            <h3>{{ offer.title }}</h3>
            <p>{{ offer.description }}</p>
            <div class="discount" *ngIf="offer.discountPercent">-{{ offer.discountPercent }}%</div>
            <code class="promo-code" *ngIf="offer.code">{{ offer.code }}</code>
          </div>
          <div class="card-footer">
            <span class="status">{{ offer.active ? '🟢 Activa' : '🔴 Inactiva' }}</span>
            <div class="actions">
              <button class="btn-icon" (click)="editOffer(offer)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
              <button class="btn-icon delete" (click)="deleteOffer(offer.id!)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="offerService.offers().length === 0" class="text-center p-5">
        <p>No hay ofertas creadas actualmente.</p>
      </div>
    </div>

    <!-- Modal -->
    <div class="admin-modal" *ngIf="isModalOpen()">
      <div class="modal-content shadow-lg">
        <h3 class="title-font">{{ currentOffer.id ? 'Editar' : 'Nueva' }} Oferta</h3>
        <form (ngSubmit)="saveOffer()">
          <div class="form-group">
            <label>Título</label>
            <input type="text" [(ngModel)]="currentOffer.title" name="title" required placeholder="Ej: Especial San Valentín">
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea [(ngModel)]="currentOffer.description" name="description" rows="2" required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo</label>
              <select [(ngModel)]="currentOffer.type" name="type">
                <option value="banner">Banner Web</option>
                <option value="coupon">Cupón Descuento</option>
                <option value="product_deal">Oferta de Producto</option>
              </select>
            </div>
            <div class="form-group">
              <label>Activa</label>
              <div class="toggle">
                <input type="checkbox" [(ngModel)]="currentOffer.active" name="active">
              </div>
            </div>
          </div>
          <div class="form-row">
             <div class="form-group">
                <label>Color Fondo (#HEX)</label>
                <input type="color" [(ngModel)]="currentOffer.backgroundColor" name="bgColor">
             </div>
             <div class="form-group">
                <label>Imagen Fondo (URL opcional o Subir Archivo)</label>
                <input type="text" [(ngModel)]="currentOffer.backgroundImage" name="bgImg" placeholder="assets/images/... o http...">
                <input type="file" accept="image/*" class="mt-2" (change)="handleImageUpload($event)" [disabled]="isUploading()">
                
                <div *ngIf="isUploading()" class="upload-progress-container mt-3">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="uploadProgress()"></div>
                  </div>
                  <div class="upload-status">
                    <small class="text-muted">Subiendo: {{ uploadProgress() }}%</small>
                    <button type="button" class="btn-cancel-upload" (click)="cancelUpload()">
                      <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      Cancelar
                    </button>
                  </div>
                </div>
             </div>
          </div>
          
          <div *ngIf="currentOffer.type === 'product_deal'">
            <div class="form-group">
              <label>Producto Asociado</label>
              <select [(ngModel)]="currentOffer.productId" name="productId">
                 <option *ngFor="let prod of products" [value]="prod.id">{{prod.name}}</option>
              </select>
            </div>
            <div class="form-row">
               <div class="form-group">
                 <label>Texto de la Banda</label>
                 <input type="text" [(ngModel)]="currentOffer.ribbonText" name="ribbonText" placeholder="¡Rebajado!">
               </div>
               <div class="form-group">
                 <label>Color Banda (#HEX)</label>
                 <input type="color" [(ngModel)]="currentOffer.ribbonColor" name="ribbonColor">
               </div>
               <div class="form-group">
                 <label>Color Texto Banda</label>
                 <input type="color" [(ngModel)]="currentOffer.ribbonTextColor" name="ribbonTextColor">
               </div>
            </div>
          </div>

          <div class="form-row" *ngIf="currentOffer.type === 'coupon'">
            <div class="form-group">
              <label>Código Promo</label>
              <input type="text" [(ngModel)]="currentOffer.code" name="code" placeholder="DIAMANTE10">
            </div>
            <div class="form-group">
              <label>% Descuento</label>
              <input type="number" [(ngModel)]="currentOffer.discountPercent" name="discount">
            </div>
          </div>
          

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()" [disabled]="isUploading()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="isUploading()">Guardar Oferta</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .offers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
    .offer-card { background: white; border-radius: 12px; position: relative; overflow: hidden; display: flex; flex-direction: column; }
    .offer-card.inactive { opacity: 0.6; grayscale: 0.8; }
    
    .card-badge { position: absolute; top: 1rem; right: -2rem; transform: rotate(45deg); width: 100px; text-align: center; color: white; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0; }
    .card-badge.banner { background: #3b82f6; }
    .card-badge.coupon { background: #10b981; }
    .card-badge.product_deal { background: #f59e0b; }

    .offer-info { padding: 2rem; flex: 1; position: relative; z-index: 2; }
    .offer-info h3 { color: var(--primary); margin-bottom: 0.5rem; }
    .offer-info p { font-size: 0.9rem; color: #666; margin-bottom: 1rem; }
    
    .offer-card.has-bg .offer-info h3, 
    .offer-card.has-bg .offer-info p {
      color: white !important;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
    }
    .offer-card.has-bg .discount {
      text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
    }

    .discount { font-size: 2rem; font-weight: 800; color: var(--accent); }
    .promo-code { display: inline-block; padding: 0.3rem 0.8rem; background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 6px; font-weight: 600; font-family: monospace; color: #333; }
    
    .card-footer { padding: 1rem 2rem; background: rgba(249, 250, 251, 0.9); border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; backdrop-filter: blur(4px); }
    .status { font-size: 0.8rem; font-weight: 600; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.4rem; border-radius: 6px; transition: 0.3s; }
    .btn-icon:hover { background: rgba(0,0,0,0.1); }

    .admin-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000; }
    .modal-content { background: white; padding: 2.5rem; border-radius: 16px; width: 100%; max-width: 500px; }
    .form-group { margin-bottom: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }

    .upload-progress-container { background: #f8f9fa; padding: 1rem; border-radius: 8px; border: 1px solid #eee; margin-top: 0.5rem; }
    .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
    .progress-fill { height: 100%; background: var(--secondary); transition: width 0.3s ease; }
    .upload-status { display: flex; justify-content: space-between; align-items: center; }
    .btn-cancel-upload { background: none; border: none; color: #dc3545; display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 4px; transition: background 0.2s; }
    .btn-cancel-upload:hover { background: #fff5f5; }
  `]
})
export class OfferManagerComponent implements OnInit {
  offerService = inject(OfferService);
  toastService = inject(ToastService);
  private confirmDialogService = inject(ConfirmDialogService);
  private imageOptimizer = inject(ImageOptimizerService);
  private zone = inject(NgZone);
  private http = inject(HttpClient);

  isModalOpen = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  currentOffer: Partial<Offer> = {};
  products: any[] = [];

  async ngOnInit() {
    this.offerService.loadOffers();
    try {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        this.products = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/products`, { headers })) || [];
    } catch(e) {
        this.products = [];
    }
  }

  openModal() {
    this.currentOffer = {
      active: true,
      type: 'banner',
      backgroundColor: '#8B4513',
      ribbonText: '¡DESTACADO!',
      ribbonColor: '#e67e22',
      ribbonTextColor: '#ffffff'
    };
    this.isModalOpen.set(true);
  }

  editOffer(offer: Offer) {
    this.currentOffer = { ...offer };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.cancelUpload();
    this.isModalOpen.set(false);
  }

  async handleImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.isUploading.set(true);
      this.uploadProgress.set(0);

      const optimizedBlob = await this.imageOptimizer.optimize(file, 1600, 0.70);

      const formData = new FormData();
      formData.append('image', optimizedBlob, `${Date.now()}_${file.name.split('.')[0]}.webp`);

      const progressInterval = setInterval(() => {
          this.zone.run(() => {
              let current = this.uploadProgress();
              if (current < 90) this.uploadProgress.set(current + 10);
          });
      }, 200);

      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      const response = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/upload`, formData, { headers }));
      
      clearInterval(progressInterval);
      this.uploadProgress.set(100);

      this.zone.run(() => {
          this.currentOffer.backgroundImage = response.url;
          this.toastService.success('Imagen de oferta optimizada y subida');
          this.isUploading.set(false);
      });

    } catch (e: any) {
      this.toastService.error(`Fallo de carga: ${e.message || 'Error desconocido'}`);
      this.isUploading.set(false);
    }
  }

  cancelUpload() {
    this.isUploading.set(false);
  }

  async saveOffer() {
    await this.offerService.saveOffer(this.currentOffer as Offer);
    this.closeModal();
  }

  async deleteOffer(id: string) {
    const confirmed = await this.confirmDialogService.open({
      title: 'Eliminar Oferta',
      message: '¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await this.offerService.deleteOffer(id);
        this.toastService.success('Oferta eliminada correctamente');
      } catch (err) {
        this.toastService.error('Error al eliminar la oferta');
      }
    }
  }
}
