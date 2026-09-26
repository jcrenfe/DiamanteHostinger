import { Component, inject, signal, OnInit, NgZone, computed } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ResourceMap } from '../../store/app.store';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiBaseUrl } from '../../utils/api-base';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ImageOptimizerService } from '../../services/image-optimizer.service';
import { CategoryService } from '../../services/category.service';


import { ProductDetailViewComponent } from '../../components/product-detail-view/product-detail-view.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

@Component({
  selector: 'app-product-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductDetailViewComponent, ProductCardComponent],
  template: `
    <div class="product-manager">
      <div class="header-actions">
        <h2 class="title-font">Gestión de Productos</h2>
        <div class="header-buttons">
          <button class="btn btn-secondary" (click)="router.navigate(['/admin/categorias'])">Gestionar Categorías</button>
          <button class="btn btn-primary" (click)="openModal()">+ Nuevo Producto</button>
        </div>
      </div>

      <div class="product-list mt-4">
        <div class="table-responsive shadow-sm">
          <table>
            <thead>
              <tr>
                <th>Imagen</th>
                <th class="sortable" (click)="sortBy('name')" title="Ordenar por Nombre">
                  Nombre
                  <span class="sort-icon" *ngIf="sortField() === 'name'">{{ sortAsc() ? '↑' : '↓' }}</span>
                </th>
                <th class="sortable" (click)="sortBy('category')" title="Ordenar por Categoría">
                  Categoría
                  <span class="sort-icon" *ngIf="sortField() === 'category'">{{ sortAsc() ? '↑' : '↓' }}</span>
                </th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let prod of sortedProducts()" class="fade-in">
                <td><img [src]="getImageUrl(prod.local_image_path)" 
                          (error)="onImgError($event)" 
                          class="thumb"></td>
                <td>{{ prod.name }}</td>
                <td>{{ prod.category }}</td>
                <td>{{ prod.price | number:'1.2-2' }}€</td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" title="Vista Previa" (click)="previewProduct(prod)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                    <button class="btn-icon" title="Duplicar" (click)="duplicateProduct(prod)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                    <button class="btn-icon" title="Editar" (click)="editProduct(prod)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="btn-icon delete" title="Borrar" (click)="deleteProduct(prod.id!)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div class="admin-modal preview-modal" *ngIf="isPreviewOpen()">
      <div class="modal-content preview-content shadow-lg" [ngClass]="previewState() === 'card' ? 'is-card-preview' : 'is-detail-preview'">
        <header class="preview-header">
           <h3 class="title-font">Previsualización de Tarjeta / Detalle</h3>
           <button class="btn-close" (click)="isPreviewOpen.set(false)">×</button>
        </header>
        
        <!-- Vista Tarjeta (Resumen) -->
        <div class="preview-body card-preview-layout" *ngIf="previewState() === 'card'">
            <div class="mock-grid">
               <app-product-card 
                  [product]="viewingProd()!" 
                  [previewMode]="true" 
                  (previewClick)="previewState.set('detail')">
               </app-product-card>
            </div>
            <p class="text-center text-muted mt-4">Haz clic en "Detalles" o en la tarjeta para ver la página completa</p>
        </div>

        <!-- Vista Detalle completa -->
        <div class="preview-body detail-preview-layout" *ngIf="previewState() === 'detail'">
           <button class="btn btn-secondary mb-3 back-btn" (click)="previewState.set('card')">
             <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
             Volver a la tarjeta
           </button>
           <app-product-detail-view 
              [product]="viewingProd()!" 
              [showActions]="false"
              [showBreadcrumb]="false">
           </app-product-detail-view>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div class="admin-modal" *ngIf="isModalOpen()">
      <div class="modal-content product-form-content shadow-lg">
        <header class="form-modal-header">
          <div>
            <span class="form-modal-eyebrow">Catálogo</span>
            <h3 class="title-font">{{ editingId ? 'Editar producto' : 'Nuevo producto' }}</h3>
          </div>
          <div class="form-modal-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="closeModal()" [disabled]="isUploading()">Cancelar</button>
            <button type="submit" form="productForm" class="btn btn-primary btn-sm" [disabled]="isUploading()">Guardar</button>
            <button type="button" class="btn-close" (click)="closeModal()" [disabled]="isUploading()" aria-label="Cerrar">×</button>
          </div>
        </header>

        <div class="product-form-layout">
          <form class="product-form" id="productForm" (ngSubmit)="saveProduct()">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="currentProd.name" name="name" placeholder="Ej. Cesta de bienvenida" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Precio (€)</label>
                <input type="number" step="0.01" [(ngModel)]="currentProd.price" name="price" placeholder="0.00" required>
              </div>
              <div class="form-group">
                <label>Categoría</label>
                <select [(ngModel)]="currentProd.category" name="category" required>
                  <option *ngFor="let cat of categoryService.categories()" [value]="cat.name">{{ cat.name }}</option>
                </select>
              </div>
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="currentProd.showOnHome" name="showOnHome">
                <span>Mostrar en la página de inicio</span>
              </label>
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <textarea [(ngModel)]="currentProd.description" name="description" rows="4" placeholder="Describe el producto..."></textarea>
            </div>
            <div class="form-group">
              <label>Imagen del producto</label>
              <div class="image-upload-zone">
                <input type="text" [(ngModel)]="currentProd.local_image_path" name="image" placeholder="assets/images/... o https://...">

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
                <app-product-card [product]="getPreviewProduct()" [previewMode]="true"></app-product-card>
              </div>
              <p class="live-preview-hint">Así se verá la tarjeta en la tienda.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .product-manager { 
      flex: 1;
      display: flex; 
      flex-direction: column;
      min-height: 0;
    }
    .header-actions { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      gap: 1rem; 
      flex-wrap: wrap; 
      margin-bottom: 1.5rem;
      flex-shrink: 0;
    }
    .header-buttons { display: flex; gap: 1rem; }
    
    .product-list { 
      flex: 1;
      min-height: 0;
      background: white;
      border-radius: 12px;
      border: 1px solid #eee;
      display: flex;
      flex-direction: column;
    }
    
    .table-responsive { 
      width: 100%; 
      flex: 1;
      overflow-y: auto;
      background: white;
    }
    table { width: 100%; border-collapse: collapse; }
    thead { position: sticky; top: 0; z-index: 10; background: #f8f9fa; }
    th { padding: 1.2rem; text-align: left; border-bottom: 2px solid #eee; transition: background 0.2s; }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { background: #e9ecef; }
    .sort-icon { font-size: 0.8rem; margin-left: 0.3rem; opacity: 0.7; }
    td { padding: 1rem 1.2rem; border-bottom: 1px solid #eee; }
    
    .thumb { width: 45px; height: 45px; border-radius: 8px; object-fit: cover; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0.5rem; border-radius: 6px; }
    .btn-icon:hover { background: #f0f0f0; }
    .btn-icon.delete:hover { background: #fee2e2; }

    .admin-modal { 
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0;
      background: rgba(0,0,0,0.5); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      z-index: 5000;
      padding: 40px;
    }
    .modal-content {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    /* --- Modal de creación/edición de producto --- */
    .product-form-content {
      max-width: 800px;
      padding: 1.25rem 1.75rem 1.75rem;
      background: linear-gradient(180deg, #FFFDFB 0%, #FFFFFF 140px);
    }
    .form-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding-bottom: 0.85rem;
      margin-bottom: 1.1rem;
      border-bottom: 1px solid rgba(139, 69, 19, 0.12);
    }
    .form-modal-header h3 { margin-bottom: 0; font-size: 1.1rem; }
    .form-modal-eyebrow {
      display: inline-block;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--secondary);
      margin-bottom: 0.15rem;
    }
    .form-modal-actions { display: flex; align-items: center; gap: 0.6rem; }
    .btn-sm {
      padding: 0.45rem 1rem;
      font-size: 0.8rem;
      border-radius: var(--radius-md);
    }
    .form-modal-actions .btn-close { font-size: 1.4rem; padding: 0 0 0 0.3rem; }

    .product-form-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 1.75rem;
      align-items: stretch;
    }
    /* Ambas columnas (form y preview) son "auto" + align-items:stretch, así que la fila
       adopta la altura de la que sea más alta de forma natural (puede variar según el
       contenido). La otra columna, al estirarse, absorbe el espacio sobrante en su último
       bloque (form-group con borde, o la caja de preview) para que sus bordes siempre
       terminen justo en el borde inferior de la fila, sea cual sea la más alta. */
    .product-form {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .product-form > .form-group:last-child {
      flex: 1;
      min-height: 0;
      margin-bottom: 0;
    }
    .product-form > .form-group:last-child .image-upload-zone {
      flex: 1;
      min-height: 0;
      justify-content: center;
    }

    .live-preview {
      display: flex;
      flex-direction: column;
    }
    .live-preview-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 0.4rem;
    }
    .live-preview-box {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      background: var(--background);
      border: 1px solid rgba(139, 69, 19, 0.12);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    /* El ancho coincide con el mínimo de tarjeta usado en la cuadrícula real (minmax(300px, 1fr))
       para que la vista previa conserve exactamente las mismas proporciones que en la tienda. */
    .live-preview-card { width: 100%; max-width: 300px; }
    .live-preview-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-align: center;
      margin: 0;
    }
    .preview-content { 
      background: white;
      border-radius: 16px;
      padding: 0; 
      overflow: hidden; 
      display: flex; 
      flex-direction: column; 
      max-height: 90vh; 
      width: auto;
      max-width: 1000px;
    }
    .preview-header { padding: 1.5rem 2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff; flex-shrink: 0; }
    .preview-body { padding: 3rem 2rem; overflow-y: auto; flex: 1; background: #fff; }
    .is-card-preview { width: 450px; }
    .is-detail-preview { width: 1000px; max-width: 95vw; }
    .mock-grid { display: block; max-width: 350px; margin: 0 auto; height: 480px; }
    .btn-close { background: none; border: none; font-size: 2rem; cursor: pointer; color: #999; }
    .btn-close:hover { color: #333; }
    
    .upload-progress-container { background: #f8f9fa; padding: 1rem; border-radius: 8px; border: 1px solid #eee; }
    .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
    .progress-fill { height: 100%; background: var(--secondary); transition: width 0.3s ease; }
    .upload-status { display: flex; justify-content: space-between; align-items: center; }
    .btn-cancel-upload { background: none; border: none; color: #dc3545; display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 4px; transition: background 0.2s; }
    .btn-cancel-upload:hover { background: #fff5f5; }

    .form-group { margin-bottom: 0.9rem; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .form-group label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      min-width: 0;
      font-family: var(--font-body);
      font-size: 0.85rem;
      color: var(--text-dark);
      background: #FFFCF9;
      border: 1.5px solid rgba(139, 69, 19, 0.15);
      border-radius: var(--radius-md);
      padding: 0.5rem 0.7rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }
    .form-group input[type="text"]:focus,
    .form-group input[type="number"]:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--secondary);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(230, 126, 34, 0.14);
    }
    .form-group textarea { resize: vertical; }

    .checkbox-group { margin-bottom: 0.9rem; }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.82rem;
      color: var(--text-dark);
      background: var(--background);
      border: 1px solid rgba(139, 69, 19, 0.12);
      border-radius: var(--radius-md);
      padding: 0.55rem 0.75rem;
    }
    .checkbox-label input[type="checkbox"] { width: 1rem; height: 1rem; cursor: pointer; accent-color: var(--primary); }

    .image-upload-zone {
      background: var(--background);
      border: 1px solid rgba(139, 69, 19, 0.12);
      border-radius: var(--radius-lg);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .upload-divider {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: var(--text-muted);
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0.15rem 0;
    }
    .upload-divider::before,
    .upload-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(139, 69, 19, 0.15);
    }
    .file-drop {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      text-align: center;
      color: var(--primary);
      background: #fff;
      border: 1.5px dashed rgba(139, 69, 19, 0.3);
      border-radius: var(--radius-md);
      padding: 0.9rem 0.75rem;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .file-drop:hover { border-color: var(--secondary); background: #FFF8F0; }
    .file-drop span { font-weight: 600; font-size: 0.78rem; }
    .file-drop small { color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
    .file-drop.disabled { opacity: 0.6; cursor: not-allowed; }

    @media (max-width: 820px) {
      .product-form-layout { grid-template-columns: 1fr; }
      .live-preview-card { max-width: 300px; }
    }
  `]
})
export class ProductManagerComponent implements OnInit {
  private toastService = inject(ToastService);
  private confirmDialogService = inject(ConfirmDialogService);
  public router = inject(Router);
  private imageOptimizer = inject(ImageOptimizerService);
  private zone = inject(NgZone);
  categoryService = inject(CategoryService);
  products = signal<ResourceMap[]>([]);

  sortField = signal<'name' | 'category' | null>(null);
  sortAsc = signal<boolean>(true);

  sortedProducts = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const list = [...this.products()];
    
    if (!field) return list;
    
    return [...list].sort((a, b) => {
      const valA = (a[field] as string || '').toLowerCase();
      const valB = (b[field] as string || '').toLowerCase();
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  });

  isModalOpen = signal(false);
  isPreviewOpen = signal(false);
  previewState = signal<'card' | 'detail'>('card');
  isUploading = signal(false);
  editingId: string | null = null;
  currentProd: Partial<ResourceMap> = {};
  viewingProd = signal<ResourceMap | null>(null);
  uploadProgress = signal(0);

  async ngOnInit() {
    this.categoryService.loadCategories();
    this.loadProducts();
  }

  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/products`;
  private readonly UPLOAD_URL = `${environment.apiUrl}/upload/image`;

  private getHeaders() {
      const token = localStorage.getItem('token');
      return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getImageUrl(path?: string): string {
    if (!path) return 'assets/images/placeholder.webp';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    if (path.startsWith('assets/') || path.startsWith('/assets/')) {
        return path;
    }
    const baseUrl = apiBaseUrl(environment.apiUrl);
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + cleanPath;
  }

  async loadProducts() {
    try {
        const list = await firstValueFrom(this.http.get<ResourceMap[]>(this.API_URL, { headers: this.getHeaders() }));
        this.products.set(list || []);
    } catch(e) {
        this.products.set([]);
    }
  }

  sortBy(field: 'name' | 'category') {
    if (this.sortField() === field) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  openModal() {
    this.editingId = null;
    const defaultCat = this.categoryService.categories().find(c => c.isDefault)?.name || 'Varios';
    this.currentProd = { category: defaultCat };
    this.isModalOpen.set(true);
  }

  editProduct(prod: ResourceMap) {
    this.editingId = prod.id!;
    this.currentProd = { ...prod };
    this.isModalOpen.set(true);
  }

  async handleImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.isUploading.set(true);
      this.uploadProgress.set(0);

      const optimizedBlob = await this.imageOptimizer.optimize(file, 1200, 0.75);

      const formData = new FormData();
      formData.append('image', optimizedBlob, `${Date.now()}_${file.name.split('.')[0]}.webp`);

      // Mock upload progress
      const progressInterval = setInterval(() => {
          this.zone.run(() => {
              let current = this.uploadProgress();
              if (current < 90) this.uploadProgress.set(current + 10);
          });
      }, 200);

      const response = await firstValueFrom(this.http.post<any>(this.UPLOAD_URL, formData, { headers: this.getHeaders() }));
      
      clearInterval(progressInterval);
      this.uploadProgress.set(100);

      this.zone.run(() => {
          this.currentProd.local_image_path = response.url;
          this.toastService.success('Imagen optimizada y subida correctamente');
          this.isUploading.set(false);
      });

    } catch (e: any) {
      this.toastService.error(`Error de carga: ${e.message || 'Fallo desconocido'}`);
      this.isUploading.set(false);
    }
  }

  cancelUpload() {
      // Not easily cancellable with standard HttpClient without subscription management, just stop UI
      this.isUploading.set(false);
  }

  getPreviewProduct(): ResourceMap {
    return {
      id: this.editingId || 'preview',
      url_origen: '',
      tipo: 'libre',
      name: this.currentProd.name || 'Nombre del producto',
      price: this.currentProd.price,
      description: this.currentProd.description,
      category: this.currentProd.category,
      local_image_path: this.currentProd.local_image_path,
      showOnHome: this.currentProd.showOnHome
    };
  }

  previewProduct(prod: ResourceMap) {
    this.viewingProd.set(prod);
    this.previewState.set('card'); // Reset to card view by default
    this.isPreviewOpen.set(true);
  }

  async duplicateProduct(prod: ResourceMap) {
    try {
      const { id, ...clone } = prod;

      const newId = `${id}-copy-${Date.now()}`;
      const newProd = {
        ...clone,
        id: newId,
        name: `${prod.name} (Copia)`
      };

      await firstValueFrom(this.http.post(this.API_URL, newProd, { headers: this.getHeaders() }));
      this.toastService.success('Producto duplicado correctamente');
      this.loadProducts();
    } catch (err) {
      this.toastService.error('Error al duplicar el producto');
    }
  }

  closeModal() {
    this.cancelUpload();
    this.isModalOpen.set(false);
  }

  async saveProduct() {
    try {
      if (this.editingId) {
        await firstValueFrom(this.http.put(`${this.API_URL}/${this.editingId}`, this.currentProd, { headers: this.getHeaders() }));
      } else {
        const id = this.currentProd.name?.toLowerCase().replace(/\s+/g, '-') || Date.now().toString();
        await firstValueFrom(this.http.post(this.API_URL, { ...this.currentProd, id }, { headers: this.getHeaders() }));
      }
      this.closeModal();
      this.loadProducts();
    } catch (err) {
      this.toastService.error('Error al guardar el producto');
    }
  }

  async deleteProduct(id: string) {
    const confirmed = await this.confirmDialogService.open({
      title: 'Eliminar Producto',
      message: '¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await firstValueFrom(this.http.delete(`${this.API_URL}/${id}`, { headers: this.getHeaders() }));
        this.toastService.success('Producto eliminado correctamente');
        this.loadProducts();
      } catch (err) {
        this.toastService.error('Error al eliminar el producto');
      }
    }
  }

  onImgError(event: any) {
    event.target.src = 'assets/images/placeholder.webp';
  }
}
