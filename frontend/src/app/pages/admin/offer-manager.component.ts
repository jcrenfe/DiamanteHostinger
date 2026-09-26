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
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { OfferBannerComponent } from '../../components/offer-banner/offer-banner.component';

@Component({
  selector: 'app-offer-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, OfferBannerComponent],
  template: `
    <div class="offer-manager">
      <div class="header-actions">
        <h2 class="title-font">Gestión de Ofertas</h2>
        <button class="btn btn-primary" (click)="openModal()">+ Nueva Oferta</button>
      </div>

      <div class="offers-grid mt-4">
        <div class="offer-tile fade-in" *ngFor="let offer of offerService.offers()" [class.inactive]="!offer.active">
          <div class="tile-preview">
            <ng-container *ngTemplateOutlet="offerPreview; context: { $implicit: offer }"></ng-container>
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
      <div class="modal-content offer-form-content shadow-lg">
        <header class="form-modal-header">
          <div>
            <span class="form-modal-eyebrow">Promociones</span>
            <h3 class="title-font">{{ currentOffer.id ? 'Editar oferta' : 'Nueva oferta' }}</h3>
          </div>
          <div class="form-modal-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="closeModal()" [disabled]="isUploading()">Cancelar</button>
            <button type="submit" form="offerForm" class="btn btn-primary btn-sm" [disabled]="isUploading()">Guardar</button>
            <button type="button" class="btn-close" (click)="closeModal()" [disabled]="isUploading()" aria-label="Cerrar">×</button>
          </div>
        </header>

        <div class="offer-form-layout">
          <form class="offer-form" id="offerForm" (ngSubmit)="saveOffer()">
            <div class="form-group">
              <label>Título</label>
              <div class="field-with-color">
                <input type="text" [(ngModel)]="currentOffer.title" name="title" required placeholder="Ej: Especial San Valentín">
                <input type="color" class="color-swatch" title="Color del título" *ngIf="currentOffer.type !== 'product_deal'"
                       [ngModel]="currentOffer.titleColor || '#ffffff'" (ngModelChange)="currentOffer.titleColor = $event" name="titleColor">
              </div>
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <div class="field-with-color">
                <textarea [(ngModel)]="currentOffer.description" name="description" rows="2" required placeholder="Cuenta en qué consiste la oferta..."></textarea>
                <input type="color" class="color-swatch" title="Color de la descripción" *ngIf="currentOffer.type !== 'product_deal'"
                       [ngModel]="currentOffer.descriptionColor || '#ffffff'" (ngModelChange)="currentOffer.descriptionColor = $event" name="descriptionColor">
              </div>
            </div>

            <div class="form-group">
              <label>Tipo de oferta</label>
              <div class="type-cards">
                <button type="button" class="type-card" [class.selected]="currentOffer.type === 'banner'" (click)="setType('banner')">
                  <span class="type-icon">🖼️</span>
                  <strong>Banner web</strong>
                  <small>Franja destacada en Ofertas</small>
                </button>
                <button type="button" class="type-card" [class.selected]="currentOffer.type === 'coupon'" (click)="setType('coupon')">
                  <span class="type-icon">🎟️</span>
                  <strong>Cupón</strong>
                  <small>Código de descuento</small>
                </button>
                <button type="button" class="type-card" [class.selected]="currentOffer.type === 'product_deal'" (click)="setType('product_deal')">
                  <span class="type-icon">🎁</span>
                  <strong>Producto</strong>
                  <small>Producto con banda</small>
                </button>
              </div>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="currentOffer.active" name="active">
                <span>Oferta activa (visible en la tienda)</span>
              </label>
            </div>

            <!-- Cupón -->
            <div class="option-panel" *ngIf="currentOffer.type === 'coupon'">
              <div class="form-row">
                <div class="form-group">
                  <label>Código promo</label>
                  <div class="field-with-color">
                    <input type="text" [(ngModel)]="currentOffer.code" name="code" placeholder="DIAMANTE10">
                    <input type="color" class="color-swatch" title="Color del código"
                           [ngModel]="currentOffer.codeColor || '#ffffff'" (ngModelChange)="currentOffer.codeColor = $event" name="codeColor">
                  </div>
                </div>
                <div class="form-group">
                  <label>% Descuento</label>
                  <input type="number" [(ngModel)]="currentOffer.discountPercent" name="discount" min="0" max="100" placeholder="10">
                </div>
              </div>
              <div class="form-group">
                <label>Etiqueta superior</label>
                <div class="field-with-color">
                  <input type="text" value="CUPÓN DISPONIBLE" readonly class="readonly-field" tabindex="-1">
                  <input type="color" class="color-swatch" title="Color de la etiqueta «CUPÓN DISPONIBLE»"
                         [ngModel]="currentOffer.badgeColor || '#ffffff'" (ngModelChange)="currentOffer.badgeColor = $event" name="badgeColor">
                </div>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="currentOffer.discountCorner" name="discountCorner">
                  <span>Mostrar descuento</span>
                </label>
              </div>
              <div class="form-row" *ngIf="currentOffer.discountCorner">
                <div class="form-group">
                  <label>Color del %</label>
                  <label class="color-field">
                    <input type="color" [ngModel]="currentOffer.discountColor || '#ffffff'" (ngModelChange)="currentOffer.discountColor = $event" name="discountColor">
                    <span>{{ (currentOffer.discountColor || '#ffffff') | uppercase }}</span>
                  </label>
                </div>
                <div class="form-group">
                  <label>Color de la banda</label>
                  <label class="color-field">
                    <input type="color" [ngModel]="currentOffer.discountBgColor || '#e67e22'" (ngModelChange)="currentOffer.discountBgColor = $event" name="discountBgColor">
                    <span>{{ (currentOffer.discountBgColor || '#e67e22') | uppercase }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Oferta de producto -->
            <div class="option-panel" *ngIf="currentOffer.type === 'product_deal'">
              <div class="form-group">
                <label>Producto asociado</label>
                <select [(ngModel)]="currentOffer.productId" name="productId">
                  <option *ngFor="let prod of products" [value]="prod.id">{{ prod.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Texto de la banda</label>
                <input type="text" [(ngModel)]="currentOffer.ribbonText" name="ribbonText" placeholder="¡Rebajado!">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Color de la banda</label>
                  <label class="color-field">
                    <input type="color" [(ngModel)]="currentOffer.ribbonColor" name="ribbonColor">
                    <span>{{ (currentOffer.ribbonColor || '#e67e22') | uppercase }}</span>
                  </label>
                </div>
                <div class="form-group">
                  <label>Color del texto</label>
                  <label class="color-field">
                    <input type="color" [(ngModel)]="currentOffer.ribbonTextColor" name="ribbonTextColor">
                    <span>{{ (currentOffer.ribbonTextColor || '#ffffff') | uppercase }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Fondo (banner y cupón) -->
            <div class="form-group" *ngIf="currentOffer.type !== 'product_deal'">
              <label>Color de fondo</label>
              <label class="color-field">
                <input type="color" [(ngModel)]="currentOffer.backgroundColor" name="bgColor">
                <span>{{ (currentOffer.backgroundColor || '#8b4513') | uppercase }}</span>
              </label>
            </div>

            <div class="form-group" *ngIf="currentOffer.type !== 'product_deal'">
              <label>Imagen de fondo</label>
              <div class="image-upload-zone">
                <input type="text" [(ngModel)]="currentOffer.backgroundImage" name="bgImg" placeholder="assets/images/... o https://...">

                <div class="upload-divider"><span>o</span></div>

                <label class="file-drop" [class.disabled]="isUploading()">
                  <svg width="1.3em" height="1.3em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Sube una imagen desde tu dispositivo</span>
                  <small>Se optimizará automáticamente a formato WebP</small>
                  <input type="file" accept="image/*" (change)="handleImageUpload($event)" [disabled]="isUploading()" hidden>
                </label>

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
          </form>

          <aside class="live-preview">
            <span class="live-preview-label">
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Vista previa en vivo
            </span>
            <div class="live-preview-box">
              <div class="live-preview-card">
                <ng-container *ngTemplateOutlet="offerPreview; context: { $implicit: previewOffer() }"></ng-container>
              </div>
              <p class="live-preview-hint">Así se verá la oferta en la tienda.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>

    <!-- Representación de una oferta tal como se ve en la tienda: la usan el listado y la vista previa del modal -->
    <ng-template #offerPreview let-offer>
      <div class="offer-preview-frame" [class.is-deal]="offer.type === 'product_deal'">
        <app-offer-banner *ngIf="offer.type !== 'product_deal'" [offer]="offer"></app-offer-banner>
        <ng-container *ngIf="offer.type === 'product_deal'">
          <div class="deal-wrapper" *ngIf="productFor(offer) as prod; else noProduct">
            <div class="deal-ribbon" *ngIf="offer.ribbonText"
                 [style.backgroundColor]="offer.ribbonColor || '#e67e22'"
                 [style.color]="offer.ribbonTextColor || '#ffffff'">{{ offer.ribbonText }}</div>
            <app-product-card [product]="prod" [previewMode]="true"></app-product-card>
          </div>
          <ng-template #noProduct>
            <p class="preview-empty">Elige un producto para ver la vista previa.</p>
          </ng-template>
        </ng-container>
      </div>
    </ng-template>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .offers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .offer-tile { background: white; border: 1px solid rgba(139, 69, 19, 0.12); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .offer-tile.inactive .tile-preview { opacity: 0.55; filter: grayscale(0.6); }
    .tile-preview { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1.4rem 1rem; background: var(--background); min-height: 300px; }

    /* Misma presentación compacta en el listado y en la vista previa del modal */
    .offer-preview-frame { width: 100%; }
    .offer-preview-frame.is-deal { max-width: 290px; }
    .offer-preview-frame ::ng-deep .promo-banner { margin: 0; padding: 1.4rem; flex-direction: column; text-align: center; gap: 1rem; }
    .offer-preview-frame ::ng-deep .promo-banner h2 { font-size: 1.4rem; }
    .offer-preview-frame ::ng-deep .promo-banner p { font-size: 0.9rem; margin-bottom: 0.8rem; }
    .offer-preview-frame ::ng-deep .promo-banner .offer-amount { order: -1; font-size: 2.4rem; padding: 0.6rem 1.2rem; }
    .offer-preview-frame ::ng-deep .promo-banner .code-box { padding: 0.6rem 1rem; }
    .offer-preview-frame ::ng-deep .promo-banner .code-box strong { font-size: 1.2rem; }
    .deal-wrapper { position: relative; }
    .deal-ribbon { position: absolute; top: -12px; right: -10px; z-index: 10; padding: 0.55rem 1.1rem; font-weight: 800; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transform: rotate(5deg); font-size: 0.8rem; border: 2px solid white; }
    .preview-empty { color: var(--text-muted); font-size: 0.85rem; text-align: center; margin: 0; }

    .card-footer { padding: 0.8rem 1.2rem; background: #fff; border-top: 1px solid rgba(139, 69, 19, 0.1); display: flex; justify-content: space-between; align-items: center; }
    .status { font-size: 0.8rem; font-weight: 600; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.4rem; border-radius: 6px; transition: 0.3s; }
    .btn-icon:hover { background: rgba(0,0,0,0.08); }
    .btn-icon.delete:hover { background: #fee2e2; }

    .admin-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 5000; padding: 40px; }
    .modal-content { background: white; padding: 2.5rem; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }

    /* --- Modal de creación/edición de oferta (mismo estilo que el de productos) --- */
    .offer-form-content {
      max-width: 900px;
      padding: 1.25rem 1.75rem 1.75rem;
      background: linear-gradient(180deg, #FFFDFB 0%, #FFFFFF 140px);
    }
    .form-modal-header {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      padding-bottom: 0.85rem; margin-bottom: 1.1rem; border-bottom: 1px solid rgba(139, 69, 19, 0.12);
    }
    .form-modal-header h3 { margin-bottom: 0; font-size: 1.1rem; }
    .form-modal-eyebrow { display: inline-block; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--secondary); margin-bottom: 0.15rem; }
    .form-modal-actions { display: flex; align-items: center; gap: 0.6rem; }
    .btn-sm { padding: 0.45rem 1rem; font-size: 0.8rem; border-radius: var(--radius-md); }
    .btn-close { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #999; padding: 0 0 0 0.3rem; }
    .btn-close:hover { color: #333; }

    .offer-form-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1.75rem; align-items: start; }
    .offer-form { display: flex; flex-direction: column; min-width: 0; }
    .live-preview { display: flex; flex-direction: column; position: sticky; top: 0; }
    .live-preview-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--primary); margin-bottom: 0.4rem; }
    .live-preview-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;
      min-height: 320px; padding: 1.25rem 1rem;
      background: var(--background); border: 1px solid rgba(139, 69, 19, 0.12); border-radius: var(--radius-lg); overflow: hidden;
    }
    .live-preview-card { width: 100%; display: flex; justify-content: center; }
    .live-preview-hint { font-size: 0.7rem; color: var(--text-muted); text-align: center; margin: 0; }

    .form-group { margin-bottom: 0.9rem; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group > label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-muted); }
    .form-group input[type="text"], .form-group input[type="number"], .form-group select, .form-group textarea {
      width: 100%; min-width: 0; font-family: var(--font-body); font-size: 0.85rem; color: var(--text-dark);
      background: #FFFCF9; border: 1.5px solid rgba(139, 69, 19, 0.15); border-radius: var(--radius-md);
      padding: 0.5rem 0.7rem; transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }
    .form-group input[type="text"]:focus, .form-group input[type="number"]:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: var(--secondary); background: #fff; box-shadow: 0 0 0 4px rgba(230, 126, 34, 0.14);
    }
    .form-group textarea { resize: vertical; }

    /* Casilla de texto con su selector de color a la derecha */
    .field-with-color { display: flex; align-items: flex-start; gap: 0.5rem; }
    .field-with-color > input[type="text"], .field-with-color > textarea { flex: 1; width: auto; }
    .color-swatch { flex: 0 0 2.4rem; width: 2.4rem; height: 2.4rem; padding: 3px; background: #FFFCF9; border: 1.5px solid rgba(139, 69, 19, 0.15); border-radius: var(--radius-md); cursor: pointer; }
    .color-swatch:hover { border-color: var(--secondary); }
    .form-group input.readonly-field { background: #F6F1EA; color: var(--text-muted); cursor: default; font-weight: 700; letter-spacing: 0.04em; }

    /* Selector visual del tipo de oferta */
    .type-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .type-card {
      display: flex; flex-direction: column; align-items: center; gap: 0.15rem; text-align: center; cursor: pointer;
      background: var(--background); border: 1.5px solid rgba(139, 69, 19, 0.15); border-radius: var(--radius-lg);
      padding: 0.7rem 0.4rem; transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      font-family: var(--font-body); color: var(--text-dark);
    }
    .type-card:hover { border-color: var(--secondary); }
    .type-card.selected { border-color: var(--secondary); background: #FFF3E4; box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.16); }
    .type-icon { font-size: 1.5rem; line-height: 1.2; }
    .type-card strong { font-size: 0.78rem; color: var(--primary); }
    .type-card small { font-size: 0.64rem; color: var(--text-muted); line-height: 1.2; }

    .checkbox-group { margin-bottom: 0.9rem; }
    .checkbox-label {
      display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-weight: 500; font-size: 0.82rem; color: var(--text-dark);
      background: var(--background); border: 1px solid rgba(139, 69, 19, 0.12); border-radius: var(--radius-md); padding: 0.55rem 0.75rem;
      text-transform: none; letter-spacing: 0;
    }
    .checkbox-label input[type="checkbox"] { width: 1rem; height: 1rem; cursor: pointer; accent-color: var(--primary); }

    /* Bloque destacado con las opciones propias de cada tipo */
    .option-panel {
      background: var(--background); border: 1px solid rgba(139, 69, 19, 0.12); border-radius: var(--radius-lg);
      padding: 0.85rem 0.85rem 0.15rem; margin-bottom: 0.9rem;
    }

    /* Selector de color con el valor a la vista */
    .color-field {
      display: flex; align-items: center; gap: 0.6rem; cursor: pointer; background: #FFFCF9;
      border: 1.5px solid rgba(139, 69, 19, 0.15); border-radius: var(--radius-md); padding: 0.35rem 0.6rem;
      font-size: 0.8rem; font-weight: 600; color: var(--text-dark); text-transform: none; letter-spacing: 0; font-family: monospace;
    }
    .color-field:hover { border-color: var(--secondary); }
    .color-field input[type="color"] { width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 6px; background: none; cursor: pointer; }

    .image-upload-zone { background: var(--background); border: 1px solid rgba(139, 69, 19, 0.12); border-radius: var(--radius-lg); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.3rem; }
    .upload-divider { display: flex; align-items: center; gap: 0.6rem; color: var(--text-muted); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; margin: 0.15rem 0; }
    .upload-divider::before, .upload-divider::after { content: ''; flex: 1; height: 1px; background: rgba(139, 69, 19, 0.15); }
    .file-drop {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; text-align: center; color: var(--primary);
      background: #fff; border: 1.5px dashed rgba(139, 69, 19, 0.3); border-radius: var(--radius-md); padding: 0.9rem 0.75rem; cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease; text-transform: none; letter-spacing: 0;
    }
    .file-drop:hover { border-color: var(--secondary); background: #FFF8F0; }
    .file-drop span { font-weight: 600; font-size: 0.78rem; }
    .file-drop small { color: var(--text-muted); font-weight: 400; }
    .file-drop.disabled { opacity: 0.6; cursor: not-allowed; }

    .upload-progress-container { background: #f8f9fa; padding: 1rem; border-radius: 8px; border: 1px solid #eee; margin-top: 0.5rem; }
    .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
    .progress-fill { height: 100%; background: var(--secondary); transition: width 0.3s ease; }
    .upload-status { display: flex; justify-content: space-between; align-items: center; }
    .btn-cancel-upload { background: none; border: none; color: #dc3545; display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 4px; transition: background 0.2s; }
    .btn-cancel-upload:hover { background: #fff5f5; }

    @media (max-width: 820px) {
      .offer-form-layout { grid-template-columns: 1fr; }
      .live-preview { position: static; }
      .type-cards { grid-template-columns: 1fr; }
    }
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
      ribbonTextColor: '#ffffff',
      titleColor: '#ffffff',
      descriptionColor: '#ffffff',
      badgeColor: '#ffffff',
      codeColor: '#ffffff',
      discountCorner: false,
      discountColor: '#ffffff',
      discountBgColor: '#e67e22'
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
      const response = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/upload/image`, formData, { headers }));
      
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

  setType(type: Offer['type']) {
    this.currentOffer.type = type;
  }

  /** Oferta tal como se está editando, para la vista previa (banners y cupones) */
  previewOffer(): Offer {
    return {
      ...(this.currentOffer as Offer),
      title: this.currentOffer.title || 'Título de la oferta',
      description: this.currentOffer.description || 'Aquí aparecerá la descripción de la oferta.',
      // Sin % escrito, la vista previa enseña uno de ejemplo para que se vea la banda de la esquina
      discountPercent: this.currentOffer.discountPercent || (this.currentOffer.type === 'coupon' && this.currentOffer.discountCorner ? 10 : undefined)
    };
  }

  /** Producto asociado a una oferta de producto, con el formato de la tarjeta de la tienda */
  productFor(offer: Partial<Offer>): any {
    const prod = this.products.find(p => String(p.id) === String(offer.productId));
    if (!prod) return null;
    return {
      id: prod.id, url_origen: '', tipo: 'libre', name: prod.name, price: prod.price,
      description: prod.description, category: prod.category, local_image_path: prod.local_image_path, showOnHome: prod.showOnHome
    };
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
