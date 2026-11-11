import { z } from 'zod';
export const materialSchema = z.object({ sku:z.string().trim().min(1).max(60), name:z.string().trim().min(1).max(160), unit:z.string().trim().min(1).max(20) });
export const materialRequestSchema = z.object({ contractorOrgId:z.string().uuid(), materialId:z.string().uuid(), quantity:z.number().positive().max(999999999), note:z.string().max(1000).optional() });
export const reviewRequestSchema = z.object({ action:z.enum(['APPROVE','REJECT']), note:z.string().trim().min(1).max(1000) });
export const purchaseOrderSchema = z.object({ vendorOrgId:z.string().uuid(), materialRequestId:z.string().uuid().optional(), lines:z.array(z.object({materialId:z.string().uuid(),quantity:z.number().positive(),unitPrice:z.number().nonnegative().optional()})).min(1) });
export const deliverySchema = z.object({deliveryReference:z.string().trim().min(1).max(100),deliveredAt:z.string().datetime(),lines:z.array(z.object({purchaseOrderLineId:z.string().uuid(),deliveredQuantity:z.number().positive()})).min(1)});
export const inspectionSchema = z.object({acceptedQuantity:z.number().nonnegative(),rejectedQuantity:z.number().nonnegative(),note:z.string().max(1000).optional()}).refine(v=>v.acceptedQuantity+v.rejectedQuantity>0);
export const issueSchema = z.object({projectId:z.string().uuid(),contractorOrgId:z.string().uuid(),materialId:z.string().uuid(),quantity:z.number().positive()});
export const ledgerEntrySchema = z.object({quantity:z.number().positive(),note:z.string().trim().min(1).max(1000)});
