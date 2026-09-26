import { Component, inject, signal, computed, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignService, Campaign, UserRecipient } from '../../services/campaign.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImageOptimizerService } from '../../services/image-optimizer.service';

@Component({
  selector: 'app-campaign-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="campaign-manager">
      <div class="header-actions">
        <h2 class="title-font">Gestión de Campañas E-mail</h2>
        <button class="btn btn-primary" (click)="openCreator()">+ Crear Nueva Campaña</button>
      </div>

      <div class="campaigns-list mt-4">
        <div class="table-responsive shadow-sm">
          <table>
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Estado</th>
                <th>Enviado el</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let camp of campaigns()" class="fade-in">
                <td>
                  <strong>{{ camp.header }}</strong>
                  <br><small class="text-muted">{{ camp.summary }}</small>
                </td>
                <td><span class="status-badge" [class]="camp.status">{{ getStatusLabel(camp.status) }}</span></td>
                <td>{{ camp.lastSentAt?.toDate() | date:'medium' }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" (click)="editCampaign(camp)" title="Editar borrador"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="btn-icon select-users" (click)="openRecipientSelector(camp)" title="Seleccionar clientes destinatarios y enviar" *ngIf="camp.status !== 'sending'"><svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></button>
                    <button class="btn-icon delete" (click)="deleteCampaign(camp.id!, camp.header)" title="Eliminar"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="campaigns().length === 0" class="text-center p-5">No hay campañas registradas.</div>
        </div>
      </div>
    </div>

    <!-- Creator Modal -->
    <div class="admin-modal" *ngIf="isModalOpen()">
      <div class="modal-card shadow-xl wide fade-in">
        <div class="modal-header">
          <div>
            <span class="modal-badge">Campaña E-mail</span>
            <h3 class="title-font">{{ editingId ? 'Editar Campaña' : 'Crear Nueva Campaña' }}</h3>
            <p class="text-subtitle">Diseña el mensaje y revisa la vista previa antes de guardarla o enviarla.</p>
          </div>
          <button type="button" class="close-btn" (click)="closeModal()" title="Cerrar modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div class="modal-body-grid">
           <!-- Form side -->
           <form (ngSubmit)="saveCampaign()" class="camp-form">
              <div class="form-group">
                <label><span class="icon">🏷️</span> Asunto / Cabecera</label>
                <input type="text" [(ngModel)]="currentCamp.header" name="header" required placeholder="Ej: ¡Oferta de Primavera en Cestas Especiales!">
              </div>

              <div class="form-group">
                <label><span class="icon">📝</span> Texto Resumen (Pre-header)</label>
                <input type="text" [(ngModel)]="currentCamp.summary" name="summary" required placeholder="Ej: Descubre nuestras nuevas cestas artesanales con 15% de descuento...">
              </div>

              <div class="form-group">
                <label><span class="icon">💬</span> Mensaje Principal (Soporta HTML)</label>
                <textarea [(ngModel)]="currentCamp.message" name="message" rows="5" required placeholder="Escribe aquí el contenido del correo..."></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label><span class="icon">🖼️</span> Imagen Ilustrativa</label>
                  <div class="upload-box">
                    <input type="text" [(ngModel)]="currentCamp.image" name="image" placeholder="URL de la imagen (https://...)">
                    <label class="btn-upload-file">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Subir archivo
                      <input type="file" accept="image/*" (change)="handleImageUpload($event)" [disabled]="isUploading()">
                    </label>
                  </div>
                  
                  <div *ngIf="isUploading()" class="upload-progress-container mt-2">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="uploadProgress()"></div>
                    </div>
                    <div class="upload-status">
                      <small class="text-muted">Subiendo e imágenes: {{ uploadProgress() }}%</small>
                      <button type="button" class="btn-cancel-upload" (click)="cancelUpload()">
                        <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label><span class="icon">🔗</span> Botón de Acción (CTA)</label>
                  <input type="text" [(ngModel)]="currentCamp.cta" name="cta" placeholder="Ej: Ver Catálogo Completo">
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Guardar Borrador
                </button>
              </div>
           </form>

           <!-- Preview side -->
           <div class="preview-panel">
              <div class="preview-header">
                <span class="preview-title">👁️ Vista Previa en Vivo</span>
                <span class="preview-tag">Cliente Email</span>
              </div>
              
              <div class="email-client-mockup shadow-md">
                 <div class="email-mockup-bar">
                   <div class="dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
                   <div class="subject-bar">{{ currentCamp.header || 'Asunto del correo' }}</div>
                 </div>

                 <div class="email-preview-content">
                    <!-- Email Header -->
                    <div class="p-email-banner">
                       <img src="assets/images/logo_transparent.webp" alt="Logo" class="p-logo" />
                       <p class="p-banner-subtitle">Campaña Especial</p>
                    </div>

                    <!-- Email Body -->
                    <div class="p-email-body">
                       <h2 class="p-header-title">{{ currentCamp.header || 'Título de la Campaña' }}</h2>
                       
                       <div class="p-summary-box" *ngIf="currentCamp.summary">
                          <strong>Resumen:</strong> {{ currentCamp.summary }}
                       </div>

                       <div class="p-img-wrapper" *ngIf="currentCamp.image">
                         <img [src]="currentCamp.image" class="p-img" alt="Imagen de campaña">
                       </div>

                       <div class="p-msg" [innerHTML]="currentCamp.message || 'Escribe un mensaje para ver cómo aparecerá en el correo...'"></div>

                       <div class="p-cta-container">
                          <a class="p-cta-btn">{{ currentCamp.cta || 'Ver Cestas Ahora' }}</a>
                       </div>
                    </div>

                    <!-- Email Footer -->
                    <div class="p-email-footer">
                       <p>© Desayuno con Diamante. Todos los derechos reservados.</p>
                       <p class="small">Recibes este correo por estar suscrito a nuestras novedades.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Recipient Selector Modal -->
    <div class="admin-modal" *ngIf="isRecipientModalOpen()">
      <div class="modal-card shadow-xl recipient-modal fade-in">
        <div class="modal-header">
          <div>
            <span class="modal-badge client-badge">Destinatarios Clientes</span>
            <h3 class="title-font">Seleccionar Clientes para Enviar</h3>
            <p class="text-subtitle">Campaña: <strong>{{ selectedCampaignForSend()?.header }}</strong></p>
          </div>
          <button type="button" class="close-btn" (click)="closeRecipientModal()" title="Cerrar modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="modal-body-recipients">
          <!-- Toolbar: Search + Quick Select -->
          <div class="recipients-toolbar">
            <div class="search-field">
              <span class="search-icon">🔍</span>
              <input type="text" [ngModel]="clientSearchQuery()" (ngModelChange)="clientSearchQuery.set($event)" placeholder="Buscar por nombre o email de cliente...">
            </div>
            
            <div class="selection-actions">
              <button type="button" class="btn-link" (click)="toggleSelectAll(true)">Seleccionar todos</button>
              <span class="sep">•</span>
              <button type="button" class="btn-link" (click)="toggleSelectAll(false)">Desmarcar todos</button>
            </div>
          </div>

          <!-- Recipients List (CLIENTS ONLY) -->
          <div class="recipients-list-wrapper">
             <div class="client-row" *ngFor="let client of filteredClientUsers()" [class.selected]="client.selected" (click)="toggleUserSelection(client)">
                <input type="checkbox" [checked]="client.selected" (click)="$event.stopPropagation(); toggleUserSelection(client)">
                <div class="client-avatar">{{ client.name.charAt(0).toUpperCase() }}</div>
                <div class="client-details">
                   <span class="client-name">{{ client.name }}</span>
                   <span class="client-email">{{ client.email }}</span>
                </div>
                <span class="role-pill">CLIENTE</span>
             </div>
             
             <div *ngIf="filteredClientUsers().length === 0" class="empty-clients text-center p-4">
                No se encontraron usuarios registrados como clientes que coincidan con la búsqueda.
             </div>
          </div>
        </div>

        <div class="modal-footer-recipients">
          <span class="selected-count-badge">
             <strong>{{ selectedClientsCount() }}</strong> de {{ clientUsers().length }} clientes seleccionados
          </span>
          <div class="footer-btns">
            <button type="button" class="btn btn-secondary" (click)="closeRecipientModal()">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="executeSendToSelected()" [disabled]="selectedClientsCount() === 0">
               🚀 Enviar a {{ selectedClientsCount() }} cliente(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    table { width: 100%; background: white; border-radius: 12px; border-collapse: collapse; }
    th { background: #f8f9fa; padding: 1rem; text-align: left; color: #64748b; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 1.2rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    
    .status-badge { padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-badge.draft { background: #f1f5f9; color: #475569; }
    .status-badge.completed { background: #dcfce7; color: #15803d; }
    .status-badge.sending { background: #fef3c7; color: #b45309; }

    .actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; font-size: 1.1rem; padding: 0.5rem; border-radius: 8px; transition: all 0.2s; color: #475569; display: flex; align-items: center; justify-content: center; }
    .btn-icon:hover { background: #ffffff; color: var(--primary); border-color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .btn-icon.select-users { color: #0284c7; border-color: #bae6fd; background: #f0f9ff; }
    .btn-icon.select-users:hover { background: #e0f2fe; color: #0369a1; border-color: #38bdf8; }
    .btn-icon.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    /* Modal Backdrop - Absolute position filling 100% of the dashboard main content area */
    .admin-modal { 
      position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; 
      background: rgba(15, 23, 42, 0.65); 
      backdrop-filter: blur(8px); 
      display: flex; align-items: center; justify-content: center; 
      z-index: 1000; 
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .modal-card { 
      background: #ffffff; 
      border-radius: 20px; 
      max-width: 1050px; width: 100%; 
      max-height: 90vh; 
      display: flex; flex-direction: column;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.8);
    }
    .modal-card.recipient-modal { max-width: 650px; }

    .modal-header { 
      padding: 1.75rem 2rem 1.25rem 2rem; 
      border-bottom: 1px solid #f1f5f9; 
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fafaf9;
    }
    .modal-badge { 
      display: inline-block; background: #fef3c7; color: #92400e; 
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase; 
      padding: 0.25rem 0.6rem; border-radius: 12px; margin-bottom: 0.5rem; letter-spacing: 0.5px;
    }
    .modal-badge.client-badge { background: #e0f2fe; color: #0369a1; }
    .modal-header h3 { margin: 0; font-size: 1.5rem; color: #1e293b; }
    .text-subtitle { margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem; }
    
    .close-btn { 
      background: #f1f5f9; border: none; border-radius: 50%; width: 36px; height: 36px; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; 
      color: #64748b; transition: all 0.2s; 
    }
    .close-btn:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

    .modal-body-grid { 
      display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 2rem; 
      padding: 2rem; overflow-y: auto; align-items: start;
    }

    /* Form styling */
    .camp-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.88rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 0.4rem; }
    .form-group label .icon { font-size: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    
    input[type="text"], textarea { 
      padding: 0.8rem 1rem; border: 1.5px solid #e2e8f0; border-radius: 10px; 
      font-size: 0.95rem; color: #1e293b; transition: all 0.2s; background: #ffffff;
    }
    input[type="text"]:focus, textarea:focus { 
      outline: none; border-color: var(--secondary); 
      box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.15); 
    }
    textarea { resize: vertical; min-height: 120px; line-height: 1.5; }

    /* Custom Upload Box */
    .upload-box { display: flex; flex-direction: column; gap: 0.5rem; }
    .btn-upload-file { 
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; 
      background: #f8fafc; border: 1.5px dashed #cbd5e1; padding: 0.6rem 1rem; 
      border-radius: 8px; color: #475569; font-weight: 600; font-size: 0.85rem; 
      cursor: pointer; transition: all 0.2s; width: 100%; text-align: center;
    }
    .btn-upload-file:hover { background: #f1f5f9; border-color: var(--secondary); color: var(--secondary); }
    .btn-upload-file input[type="file"] { display: none; }

    .modal-actions { 
      display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; 
      padding-top: 1.25rem; border-top: 1px solid #f1f5f9; 
    }

    /* Live Email Preview Mockup */
    .preview-panel { display: flex; flex-direction: column; gap: 0.75rem; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; }
    .preview-title { font-weight: 700; font-size: 0.9rem; color: #475569; }
    .preview-tag { background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; }

    .email-client-mockup { 
      background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; 
      overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
    }
    .email-mockup-bar { 
      background: #f1f5f9; padding: 0.6rem 1rem; display: flex; align-items: center; 
      gap: 1rem; border-bottom: 1px solid #e2e8f0; 
    }
    .dots { display: flex; gap: 0.35rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }
    .subject-bar { font-size: 0.8rem; font-weight: 600; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .email-preview-content { 
      background: #FDF8F0; max-height: 480px; overflow-y: auto; font-family: 'Montserrat', sans-serif; 
    }
    .p-email-banner { background: #8B4513; padding: 1.5rem 1rem; text-align: center; color: white; }
    .p-logo { max-width: 130px; display: block; margin: 0 auto 0.5rem auto; }
    .p-banner-subtitle { margin: 0; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9; }
    
    .p-email-body { padding: 1.75rem 1.5rem; background: #ffffff; margin: 1rem; border-radius: 12px; border: 1px solid #F0E2D1; }
    .p-header-title { color: #8B4513; font-size: 1.25rem; margin-top: 0; margin-bottom: 0.75rem; font-family: Georgia, serif; }
    .p-summary-box { background: #FFF9F2; border-left: 3px solid #E67E22; padding: 0.75rem; font-size: 0.85rem; color: #5D4037; border-radius: 6px; margin-bottom: 1rem; }
    .p-img-wrapper { text-align: center; margin: 1rem 0; }
    .p-img { max-width: 100%; border-radius: 8px; max-height: 220px; object-fit: cover; }
    .p-msg { font-size: 0.9rem; color: #444; line-height: 1.6; word-break: break-word; }
    .p-cta-container { text-align: center; margin-top: 1.5rem; }
    .p-cta-btn { 
      background: #E67E22; color: white !important; padding: 0.75rem 1.75rem; 
      border-radius: 30px; font-weight: 700; font-size: 0.9rem; display: inline-block; 
      box-shadow: 0 4px 12px rgba(230, 126, 34, 0.25); text-decoration: none;
    }

    .p-email-footer { text-align: center; padding: 1rem; color: #94a3b8; font-size: 0.75rem; }
    .p-email-footer p { margin: 0.2rem 0; }

    /* Recipient Selector Modal Styles */
    .modal-body-recipients { padding: 1.5rem 2rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.2rem; max-height: 450px; }
    .recipients-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .search-field { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border: 1.5px solid #e2e8f0; padding: 0.5rem 0.8rem; border-radius: 10px; flex: 1; min-width: 240px; }
    .search-field input { border: none; background: transparent; padding: 0; width: 100%; font-size: 0.9rem; outline: none; }
    .selection-actions { display: flex; align-items: center; gap: 0.5rem; }
    .btn-link { background: none; border: none; color: #0284c7; font-weight: 600; font-size: 0.85rem; cursor: pointer; padding: 0; }
    .btn-link:hover { text-decoration: underline; }
    .sep { color: #cbd5e1; }

    .recipients-list-wrapper { display: flex; flex-direction: column; gap: 0.6rem; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem; background: #fafaf9; max-height: 320px; overflow-y: auto; }
    .client-row { display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1rem; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
    .client-row:hover { border-color: #cbd5e1; background: #f8fafc; }
    .client-row.selected { border-color: #38bdf8; background: #f0f9ff; }
    .client-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--secondary); }
    .client-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--secondary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; }
    .client-details { display: flex; flex-direction: column; flex: 1; }
    .client-name { font-weight: 600; font-size: 0.92rem; color: #1e293b; }
    .client-email { font-size: 0.82rem; color: #64748b; }
    .role-pill { font-size: 0.68rem; font-weight: 800; background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

    .modal-footer-recipients { padding: 1.25rem 2rem; border-top: 1px solid #f1f5f9; background: #fafaf9; display: flex; justify-content: space-between; align-items: center; }
    .selected-count-badge { font-size: 0.9rem; color: #475569; }
    .selected-count-badge strong { color: var(--primary); }
    .footer-btns { display: flex; gap: 0.75rem; }

    @media (max-width: 992px) {
      .modal-body-grid { grid-template-columns: 1fr; }
      .preview-panel { display: none; }
    }

    @media (max-width: 640px) {
      .admin-modal { padding: 0.5rem; }
      .modal-footer-recipients { flex-direction: column; gap: 1rem; align-items: stretch; text-align: center; }
    }

    .upload-progress-container { background: #f8fafc; padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; }
    .progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 0.4rem; }
    .progress-fill { height: 100%; background: var(--secondary); transition: width 0.3s ease; }
    .upload-status { display: flex; justify-content: space-between; align-items: center; }
    .btn-cancel-upload { background: none; border: none; color: #ef4444; display: flex; align-items: center; gap: 0.2rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
  `]
})
export class CampaignManagerComponent implements OnInit {
  campaignService = inject(CampaignService);
  campaigns = signal<Campaign[]>([]);
  isModalOpen = signal(false);
  editingId: string | null = null;
  currentCamp: Partial<Campaign> = {};
  isUploading = signal(false);
  uploadProgress = signal(0);

  // Recipient selector state
  isRecipientModalOpen = signal(false);
  selectedCampaignForSend = signal<Campaign | null>(null);
  clientUsers = signal<UserRecipient[]>([]);
  clientSearchQuery = signal('');

  filteredClientUsers = computed(() => {
    const q = this.clientSearchQuery().toLowerCase().trim();
    if (!q) return this.clientUsers();
    return this.clientUsers().filter(u => 
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  selectedClientsCount = computed(() => {
    return this.clientUsers().filter(u => u.selected).length;
  });

  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private confirmDialogService = inject(ConfirmDialogService);
  private imageOptimizer = inject(ImageOptimizerService);
  private zone = inject(NgZone);

  async ngOnInit() {
    this.refreshList();
  }

  async refreshList() {
    const list = await this.campaignService.loadCampaigns();
    this.campaigns.set(list);
  }

  openCreator() {
    this.editingId = null;
    this.currentCamp = { status: 'draft', cta: 'Ver Ofertas' };
    this.isModalOpen.set(true);
  }

  editCampaign(camp: Campaign) {
    this.editingId = camp.id!;
    this.currentCamp = { ...camp };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.cancelUpload();
    this.isModalOpen.set(false);
  }

  async saveCampaign() {
    await this.campaignService.saveCampaign(this.currentCamp as Campaign);
    this.closeModal();
    this.refreshList();
  }

  async deleteCampaign(id: string, header?: string) {
    const confirmed = await this.confirmDialogService.open({
      title: 'Eliminar Campaña',
      message: `¿Estás seguro de que deseas eliminar la campaña "${header || 'seleccionada'}"? Esta acción borrará el borrador y su historial.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await this.campaignService.deleteCampaign(id);
        this.toastService.success('Campaña eliminada correctamente.');
        this.refreshList();
      } catch (err) {
        this.toastService.error('Error al eliminar la campaña.');
      }
    }
  }

  // Recipient selection methods
  async openRecipientSelector(camp: Campaign) {
    this.selectedCampaignForSend.set(camp);
    this.clientSearchQuery.set('');
    this.toastService.info('Cargando lista de clientes registrados...');
    
    // Obtiene SOLO usuarios con rol de cliente (role !== 'admin')
    const clients = await this.campaignService.getClientUsers();
    this.clientUsers.set(clients);
    this.isRecipientModalOpen.set(true);
  }

  closeRecipientModal() {
    this.isRecipientModalOpen.set(false);
    this.selectedCampaignForSend.set(null);
  }

  toggleSelectAll(selectAll: boolean) {
    this.clientUsers.update(users => 
      users.map(u => ({ ...u, selected: selectAll }))
    );
  }

  toggleUserSelection(user: UserRecipient) {
    this.clientUsers.update(users =>
      users.map(u => u.id === user.id ? { ...u, selected: !u.selected } : u)
    );
  }

  async executeSendToSelected() {
    const camp = this.selectedCampaignForSend();
    if (!camp) return;

    const selectedEmails = this.clientUsers()
      .filter(u => u.selected)
      .map(u => u.email);

    if (selectedEmails.length === 0) {
      this.toastService.error('Debes seleccionar al menos un cliente.');
      return;
    }

    try {
      camp.status = 'sending';
      await this.campaignService.sendCampaign(camp, selectedEmails);
      this.toastService.success(`Campaña enviada con éxito a ${selectedEmails.length} cliente(s).`);
      this.closeRecipientModal();
      this.refreshList();
    } catch (err: any) {
      this.toastService.error('Error al enviar la campaña.');
      this.refreshList();
    }
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
          this.currentCamp.image = response.url;
          this.toastService.success('Imagen de campaña optimizada y subida');
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

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      sending: 'Enviando...',
      completed: 'Enviado',
      scheduled: 'Programado'
    };
    return map[status?.toLowerCase()] || status || '';
  }
}
