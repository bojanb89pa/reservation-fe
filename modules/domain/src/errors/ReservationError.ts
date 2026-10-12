import { DomainError } from './DomainError';

export enum ReservationErrorCode {
  /** BE `ErrorResponse.code` for a 409 on an occupied time slot. */
  RESERVATION_SLOT_TAKEN = 'RESERVATION_SLOT_TAKEN',
}

/**
 * The requested slot is occupied: the business disallows overlapping PENDING
 * reservations, or a CONFIRMED reservation already covers it. `message` is the
 * localized text from the backend.
 */
export class ReservationSlotTakenError extends DomainError {
  constructor(message: string = ReservationErrorCode.RESERVATION_SLOT_TAKEN) {
    super(message, ReservationErrorCode.RESERVATION_SLOT_TAKEN);
    this.name = 'ReservationSlotTakenError';
  }
}

export enum BusinessErrorCode {
  /** BE message key for a 409 when a non-owner changes owner-only settings. */
  OWNER_REQUIRED = 'error.business.owner_required',
}
