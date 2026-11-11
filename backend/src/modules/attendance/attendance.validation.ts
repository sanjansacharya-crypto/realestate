import {z} from 'zod';
const evidence=z.object({latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),photoMetadata:z.object({fileName:z.string().min(1).max(255),contentType:z.string().min(1).max(100),storageKey:z.string().min(1).max(500)}).strict().optional()}).strict();
export const checkInSchema=z.object({projectId:z.string().uuid(),workDate:z.string().date(),evidence:evidence.optional()});
export const checkOutSchema=z.object({evidence:evidence.optional()});
export const correctionSchema=z.object({proposedCheckIn:z.string().datetime().optional(),proposedCheckOut:z.string().datetime().optional(),reason:z.string().trim().min(5).max(1000)}).refine(v=>v.proposedCheckIn||v.proposedCheckOut);
export const correctionReviewSchema=z.object({approve:z.boolean(),reviewNote:z.string().trim().min(1).max(1000)});
