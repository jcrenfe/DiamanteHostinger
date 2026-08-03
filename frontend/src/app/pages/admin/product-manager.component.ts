import { Component, inject, signal, OnInit, NgZone, computed } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { CommonModule } from '@angular/common';
import { db, storage } from '../../app.firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { ResourceMap } from '../../store/app.store';
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
                <td><img [src]="prod.local_image_path || 'assets/images/placeholder.jpg'" 
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
      <div class="modal-content shadow-lg">
        <h3 class="title-font">{{ editingId ? 'Editar' : 'Nuevo' }} Producto</h3>
        <form (ngSubmit)="saveProduct()">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" [(ngModel)]="currentProd.name" name="name" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Precio (€)</label>
              <input type="number" step="0.01" [(ngModel)]="currentProd.price" name="price" required>
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
              <span>Mostrar en inicio</span>
            </label>
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea [(ngModel)]="currentProd.description" name="description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Ruta Imagen (local o remota)</label>
            <input type="text" [(ngModel)]="currentProd.local_image_path" name="image" placeholder="assets/images/... o http...">
            
            <label class="mt-2">O sube un archivo desde tu dispositivo:</label>
            <input type="file" accept="image/*" (change)="handleImageUpload($event)" [disabled]="isUploading()">
            
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

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()" [disabled]="isUploading()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="isUploading()">Guardar Cambios</button>
          </div>
        </form>
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

    .form-group { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    
    .checkbox-group { margin-bottom: 1.5rem; }
    .checkbox-label { display: flex; align-items: center; gap: 0.8rem; cursor: pointer; font-weight: 500; color: var(--text-dark); }
    .checkbox-label input[type="checkbox"] { width: 1.2rem; height: 1.2rem; cursor: pointer; accent-color: var(--primary); }
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
    
    return list.sort((a, b) => {
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
  private currentUploadTask: UploadTask | null = null;

  async ngOnInit() {
    this.categoryService.loadCategories();
    this.loadProducts();
  }

  async loadProducts() {
    const snap = await getDocs(collection(db, 'productos'));
    this.products.set(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ResourceMap));
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

      const fileName = `${Date.now()}_${file.name.split('.')[0]}.webp`;
      const storageRef = ref(storage, `productos/${fileName}`);

      this.currentUploadTask = uploadBytesResumable(storageRef, optimizedBlob, { contentType: 'image/webp' });

      this.currentUploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          this.zone.run(() => {
            this.uploadProgress.set(Math.round(progress));
          });
        },
        (error) => {
          this.zone.run(() => {
            if (error.code === 'storage/canceled') {
              this.toastService.info('Carga cancelada');
            } else {
              let msg = `Error de subida: ${error.message}`;
              if (window.location.hostname === 'localhost') {
                msg += '. Revisa la configuración de CORS en Firebase si el error persiste.';
              }
              this.toastService.error(msg);
            }
            this.isUploading.set(false);
            this.currentUploadTask = null;
          });
        },
        async () => {
          const url = await getDownloadURL(this.currentUploadTask!.snapshot.ref);
          this.zone.run(() => {
            this.currentProd.local_image_path = url;
            this.toastService.success('Imagen optimizada y subida correctamente');
            this.isUploading.set(false);
            this.currentUploadTask = null;
          });
        }
      );

    } catch (e: any) {
      this.toastService.error(`Error de carga: ${e.message || 'Fallo desconocido'}`);
      this.isUploading.set(false);
    }
  }

  cancelUpload() {
    if (this.currentUploadTask) {
      this.currentUploadTask.cancel();
      this.isUploading.set(false);
      this.currentUploadTask = null;
    }
  }

  previewProduct(prod: ResourceMap) {
    this.viewingProd.set(prod);
    this.previewState.set('card'); // Reset to card view by default
    this.isPreviewOpen.set(true);
  }

  async duplicateProduct(prod: ResourceMap) {
    try {
      const newId = `${prod.id}-copy-${Date.now()}`;
      const clone = { ...prod };
      // @ts-ignore - explicitly remove id to conform with setDoc requirement
      delete clone.id;

      const newProd = {
        ...clone,
        name: `${prod.name} (Copia)`
      };

      await setDoc(doc(db, 'productos', newId), newProd);
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
        await updateDoc(doc(db, 'productos', this.editingId), this.currentProd);
      } else {
        const id = this.currentProd.name?.toLowerCase().replace(/\s+/g, '-') || Date.now().toString();
        await setDoc(doc(db, 'productos', id), { ...this.currentProd, id });
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
        await deleteDoc(doc(db, 'productos', id));
        this.toastService.success('Producto eliminado correctamente');
        this.loadProducts();
      } catch (err) {
        this.toastService.error('Error al eliminar el producto');
      }
    }
  }

  onImgError(event: any) {
    event.target.src = 'assets/images/placeholder.jpg';
  }
}
