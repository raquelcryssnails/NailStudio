
import type { Timestamp } from 'firebase/firestore';

// Added DayOpeningHours here from layout.tsx for better organization with Firestore types
export interface DayOpeningHours {
  id: string;
  name: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 for Sunday, 1 for Monday, etc.
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface AppSettings {
  id?: string; // Document ID, e.g., "mainSettings"
  openingHours?: DayOpeningHours[];
  userName?: string;
  salonTagline?: string;
  salonLogoUrl?: string; // URL for the salon logo in the sidebar
  whatsappSchedulingMessage?: string;
  salonName?: string; 
  salonAddress?: string; 
  salonPhone?: string; 
  theme?: string;
  updatedAt?: string | Timestamp; // Added to match getAppSettingsFS return
}

export interface ClientPackageServiceItem {
  serviceId: string;
  totalQuantity: number; // Total quantity from the package
  remainingQuantity: number; // How many are left to use
}

export interface ClientPackageInstance {
  packageId: string;
  packageName: string; // Store name for easier display
  purchaseDate: string; // ISO Date string
  expiryDate: string; // ISO Date string
  services: ClientPackageServiceItem[];
  status: 'Ativo' | 'Expirado' | 'Utilizado'; // Utilizado = all services used up
  originalPrice?: string;
  paidPrice: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  stampsEarned?: number;
  mimosRedeemed?: number;
  purchasedPackages?: ClientPackageInstance[];
  createdAt?: string | Timestamp; // string for ISO, Timestamp for Firestore
  updatedAt?: string | Timestamp;
}

export interface SalonService {
  id: string;
  name: string;
  duration: string;
  price: string; // Stored as "XX.YY"
  category: string;
  description?: string;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface SalonServiceItemForPackage {
  serviceId: string;
  quantity: number;
}

export interface Appointment {
  id: string;
  clientName: string; // Consider changing to clientId for better relations
  serviceIds: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  professionalId: string;
  status: 'Agendado' | 'Confirmado' | 'Concluído' | 'Cancelado';
  totalAmount?: string; // Calculated total price, e.g., "120.50"
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface SalonPackage {
  id: string;
  name: string;
  shortDescription?: string;
  services: SalonServiceItemForPackage[];
  price: string;
  originalPrice?: string;
  validityDays?: number;
  status?: string; // e.g., "Ativo", "Inativo"
  themeColor?: 'primary' | 'accent';
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: string; // Stored as "XX.YY"
  date: string; // YYYY-MM-DD
  category: string;
  type: 'income' | 'expense'; // Added type for income/expense
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  avatarUrl?: string; // URL for the avatar image
  dataAiHint?: string; // For placeholder generation
  commissionRate?: number | null; // Percentage, e.g., 10 for 10%
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  stock: number; // Current stock quantity
  lowStockThreshold: number; // Threshold for low stock alert
  supplier?: string;
  unit?: string; // e.g., 'un', 'ml', 'g', 'L', 'kg'
  costPrice?: string; // Purchase price, "XX.YY"
  sellingPrice?: string; // Selling price (if applicable), "XX.YY"
  sku?: string; // Stock Keeping Unit / Barcode
  lastRestockDate?: string; // ISO Date string, YYYY-MM-DD
  notes?: string;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}


// Keep Expense type for backward compatibility if needed, or gradually phase out.
// For now, we'll focus on using FinancialTransaction.
// export type Expense = FinancialTransaction & { type: 'expense' };
// export type Income = FinancialTransaction & { type: 'income' };

    
