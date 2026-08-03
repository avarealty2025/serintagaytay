export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tin: string;
}

export interface BookingSettings {
  checkInTime: string;
  checkOutTime: string;
  holdDurationHours: number;
  holdReminderHours: number;
  minStayDefault: number;
  maxStayDefault: number;
  reservationFee: number;
  reservationFeeType: "fixed" | "percentage";
}

export interface TaxSettings {
  vat: number;
  localTax: number;
  serviceCharge: number;
  tourismFee: number;
}

export interface FeeDefaults {
  cleaningFee: number;
  extraGuestFee: number;
  securityDeposit: number;
  earlyCheckInFee: number;
  lateCheckOutFee: number;
}

export interface DiscountSettings {
  weeklyDiscountPct: number;
  monthlyDiscountPct: number;
  returningGuestPct: number;
}

export interface CancellationPolicy {
  name: string;
  freeCancellationHours: number;
  cancellationFeePct: number;
  noShowFeePct: number;
}

export interface PaymentAccount {
  id: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  qrPhotoId: string;
}

export interface PaymentSettings {
  methods: string[];
  gcashName: string;
  gcashNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  instructions: string;
  accounts: PaymentAccount[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger: string;
  enabled: boolean;
}

export interface SystemSettings {
  business: BusinessInfo;
  booking: BookingSettings;
  taxes: TaxSettings;
  fees: FeeDefaults;
  discounts: DiscountSettings;
  cancellation: CancellationPolicy;
  payment: PaymentSettings;
  houseRules: string[];
  bookingStatuses: string[];
  notifications: NotificationTemplate[];
}

export const DEFAULT_SETTINGS: SystemSettings = {
  business: {
    name: "Serin Tagaytay Staycation",
    address: "Serin West & East, Tagaytay City, Cavite",
    phone: "",
    email: "",
    website: "serintagaytaystaycation.com",
    tin: "",
  },
  booking: {
    checkInTime: "14:00",
    checkOutTime: "12:00",
    holdDurationHours: 12,
    holdReminderHours: 6,
    minStayDefault: 1,
    maxStayDefault: 28,
    reservationFee: 0,
    reservationFeeType: "fixed",
  },
  taxes: {
    vat: 0,
    localTax: 0,
    serviceCharge: 0,
    tourismFee: 0,
  },
  fees: {
    cleaningFee: 0,
    extraGuestFee: 0,
    securityDeposit: 0,
    earlyCheckInFee: 0,
    lateCheckOutFee: 0,
  },
  discounts: {
    weeklyDiscountPct: 0,
    monthlyDiscountPct: 0,
    returningGuestPct: 0,
  },
  cancellation: {
    name: "Standard",
    freeCancellationHours: 48,
    cancellationFeePct: 50,
    noShowFeePct: 100,
  },
  payment: {
    methods: ["GCash", "SeaBank", "BPI", "UnionBank", "Maya"],
    gcashName: "APRIL LYN MAE VALENZUELA",
    gcashNumber: "09760573160",
    bankName: "BPI",
    bankAccountName: "APRIL LYN MAE VALENZUELA",
    bankAccountNumber: "1769179069",
    instructions:
      "Please verify the amount before proceeding. Kindly send the proof of payment for proper tagging.",
    accounts: [
      { id: "gcash", provider: "GCash", accountName: "APRIL LYN MAE VALENZUELA", accountNumber: "09760573160", qrPhotoId: "" },
      { id: "seabank", provider: "SeaBank", accountName: "APRIL LYN MAE VALENZUELA", accountNumber: "17946734235", qrPhotoId: "" },
      { id: "bpi", provider: "BPI", accountName: "APRIL LYN MAE VALENZUELA", accountNumber: "1769179069", qrPhotoId: "" },
      { id: "unionbank", provider: "UnionBank", accountName: "APRIL LYN MAE VALENZUELA", accountNumber: "8881 7044 1495", qrPhotoId: "" },
      { id: "maya", provider: "Maya", accountName: "APRIL LYN MAE VALENZUELA", accountNumber: "09760573160", qrPhotoId: "" },
    ],
  },
  houseRules: [
    "No smoking inside the unit",
    "No pets allowed",
    "No parties or events",
    "Quiet hours: 10 PM to 7 AM",
    "Maximum guests as per unit capacity",
    "Valid government ID required at check-in",
  ],
  bookingStatuses: [
    "pending_payment",
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
    "no_show",
    "expired",
  ],
  notifications: [
    {
      id: "booking_confirmed",
      name: "Booking Confirmed",
      subject: "Your booking at Serin Tagaytay is confirmed",
      body: "Hi {guest_name}, your booking for {unit_name} from {check_in} to {check_out} has been confirmed.",
      trigger: "on_confirm",
      enabled: true,
    },
    {
      id: "payment_reminder",
      name: "Payment Reminder",
      subject: "Payment reminder for your Serin Tagaytay booking",
      body: "Hi {guest_name}, this is a reminder to complete your payment of {amount} for booking {booking_ref}.",
      trigger: "on_hold_reminder",
      enabled: true,
    },
    {
      id: "checkin_reminder",
      name: "Check-in Reminder",
      subject: "Your check-in at Serin Tagaytay is tomorrow",
      body: "Hi {guest_name}, we look forward to welcoming you tomorrow at {check_in_time}. Your unit is {unit_name}.",
      trigger: "day_before_checkin",
      enabled: true,
    },
  ],
};

export function getSettings(): SystemSettings {
  return DEFAULT_SETTINGS;
}
