import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../../services/category.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="category-manager">
      <div class="header-actions">
        <h2 class="title-font">Gestión de Categorías</h2>
        <button class="btn btn-primary" (click)="openModal()">+ Nueva Categoría</button>
      </div>

      <div class="category-list mt-4">
        <div class="table-responsive shadow-sm">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Orden</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of categoryService.categories()" class="fade-in">
                <td>
                  <span class="category-name">{{ cat.name }}</span>
                  <span *ngIf="cat.isDefault" class="badge-default">PREDETERMINADA</span>
                </td>
                <td>{{ cat.isDefault ? 'Fija' : 'Editable' }}</td>
                <td>{{ cat.order }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" title="Editar" (click)="editCategory(cat)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button *ngIf="!cat.isDefault" class="btn-icon delete" title="Borrar" (click)="deleteCategory(cat.id!)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Form -->
      <div class="admin-modal" *ngIf="isModalOpen()">
        <div class="modal-content shadow-lg">
          <h3 class="title-font">{{ editingId ? 'Editar' : 'Nueva' }} Categoría</h3>
          <form (ngSubmit)="saveCategory()">
            <div class="form-group">
              <label>Nombre de la Categoría</label>
              <input type="text" [(ngModel)]="currentCat.name" name="name" required [disabled]="!!currentCat.isDefault">
            </div>
            
            <div class="form-group">
              <label>Orden de visualización</label>
              <input type="number" [(ngModel)]="currentCat.order" name="order">
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="isModalOpen.set(false)">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; background: white; border-radius: 12px; overflow: hidden; border-collapse: collapse; }
    th { background: #f8f9fa; padding: 1.2rem; text-align: left; }
    td { padding: 1rem 1.2rem; border-bottom: 1px solid #eee; }
    .category-name { font-weight: 600; color: var(--primary); }
    .badge-default { 
      background: #e0f2fe; color: #0369a1; font-size: 0.65rem; 
      padding: 0.2rem 0.5rem; border-radius: 10px; margin-left: 0.5rem; 
      font-weight: 800;
    }
    .actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0.5rem; border-radius: 6px; }
    .btn-icon:hover { background: #f0f0f0; }
    .btn-icon.delete:hover { background: #fee2e2; color: #dc3545; }

    .admin-modal { 
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000;
    }
    .modal-content { background: white; padding: 2.5rem; border-radius: 16px; width: 100%; max-width: 400px; }
    .form-group { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
  `]
})
export class CategoryManagerComponent implements OnInit {
  categoryService = inject(CategoryService);
  private toastService = inject(ToastService);
  private confirmDialogService = inject(ConfirmDialogService);

  isModalOpen = signal(false);
  editingId: string | null = null;
  currentCat: Partial<Category> = {};

  ngOnInit() {
    this.categoryService.loadCategories();
  }

  openModal() {
    this.editingId = null;
    this.currentCat = { order: this.categoryService.categories().length };
    this.isModalOpen.set(true);
  }

  editCategory(cat: Category) {
    this.editingId = cat.id!;
    this.currentCat = { ...cat };
    this.isModalOpen.set(true);
  }

  async saveCategory() {
    try {
      await this.categoryService.saveCategory(this.currentCat as Category);
      this.toastService.success('Categoría guardada correctamente');
      this.isModalOpen.set(false);
    } catch (err) {
      this.toastService.error('Error al guardar la categoría');
    }
  }

  async deleteCategory(id: string) {
    const confirmed = await this.confirmDialogService.open({
      title: 'Eliminar Categoría',
      message: '¿Estás seguro? Los productos asociados pasarán a la categoría "Desayunos" por defecto.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await this.categoryService.deleteCategory(id);
        this.toastService.success('Categoría eliminada y productos reasignados');
      } catch (err: any) {
        this.toastService.error(err.message || 'Error al eliminar');
      }
    }
  }
}
