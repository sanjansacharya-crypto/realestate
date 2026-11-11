import { BookingStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface CreateBookingDTO {
  projectId: string;
  plotId: string;
  notes?: string;
}

export interface ReviewBookingDTO {
  action: 'APPROVE' | 'REJECT';
  reservationExpiresAt?: string; // Optional ISO string if setting a hold
  rejectionReason?: string;
  notes?: string;
}

export interface RecordPaymentDTO {
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface VerifyPaymentDTO {
  action: 'VERIFY' | 'REJECT';
  notes?: string;
}

export interface CancelBookingDTO {
  cancellationReason?: string;
}

export interface BookingListQuery {
  projectId?: string;
  status?: BookingStatus;
  plotId?: string;
  buyerId?: string;
  page?: number;
  limit?: number;
}

