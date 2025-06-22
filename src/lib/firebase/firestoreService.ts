
'use server';
import type {
  Appointment,
  Client,
  SalonService,
  SalonPackage,
  ClientPackageInstance,
  AppSettings, 
  DayOpeningHours, 
  FinancialTransaction,
  Professional,
  Product, // Added Product type
} from '@/types/firestore';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  getDoc,
  serverTimestamp,
  setDoc, 
} from 'firebase/firestore';

// Attempt to import db from the config file
let db: any; // Firestore Database instance
try {
  // This line assumes 'db' is exported from your firebase config
  db = require('@/lib/firebase/config').db;
} catch (e: any) {
  console.warn(
    'Firebase config not found or db not exported from it. Firestore functionality will be mocked. Error: ' + e.message
  );
}

// Helper to convert Firestore doc to our data type
const fromFirestore = <T extends { id: string }>(
  snapshot: any, // Firestore DocumentSnapshot
  options?: any // SnapshotOptions
): T => {
  const data = snapshot.data(options);
  const result: any = {
    id: snapshot.id,
    ...data,
  };

  // Default mimosRedeemed if Client type and field is missing
  if ('mimosRedeemed' in data === false && 'stampsEarned' in data) { // Heuristic for Client type
    result.mimosRedeemed = 0;
  }


  // Convert Timestamps to ISO strings if they exist and are Timestamps
  if (data?.createdAt && data.createdAt instanceof Timestamp) {
    result.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data?.updatedAt && data.updatedAt instanceof Timestamp) {
    result.updatedAt = data.updatedAt.toDate().toISOString();
  }
  // Handle specific date fields that might be Timestamps
  if (data?.date && data.date instanceof Timestamp) { // For Appointment.date or FinancialTransaction.date
    result.date = data.date.toDate().toISOString().split('T')[0];
  } else if (typeof data?.date === 'string' && data.date?.includes('T')) {
    // If it's already a string but in ISO format with time, just take the date part
    result.date = data.date.split('T')[0];
  }

  // Handle product lastRestockDate
  if (data?.lastRestockDate && data.lastRestockDate instanceof Timestamp) {
    result.lastRestockDate = data.lastRestockDate.toDate().toISOString().split('T')[0];
  } else if (typeof data?.lastRestockDate === 'string' && data.lastRestockDate?.includes('T')) {
    result.lastRestockDate = data.lastRestockDate.split('T')[0];
  }


  // Handle dates within purchasedPackages
  if (Array.isArray(data?.purchasedPackages)) {
    result.purchasedPackages = data.purchasedPackages.map((pkg: any) => ({
      ...pkg,
      ...(pkg.purchaseDate && pkg.purchaseDate instanceof Timestamp && {
        purchaseDate: pkg.purchaseDate.toDate().toISOString().split('T')[0],
      }),
      ...(pkg.expiryDate && pkg.expiryDate instanceof Timestamp && {
        expiryDate: pkg.expiryDate.toDate().toISOString().split('T')[0],
      }),
    }));
  }
  return result as T;
};


// ========== App Settings Functions ==========
const APP_CONFIG_COLLECTION = 'appConfiguration';
const MAIN_SETTINGS_DOC_ID = 'mainSettings';

export const getAppSettingsFS = async (): Promise<AppSettings | null> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getAppSettingsFS operation, returning null.');
    return null;
  }
  try {
    const docRef = doc(db, APP_CONFIG_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const appSettings: AppSettings = {
        id: docSnap.id,
        openingHours: data.openingHours, 
        userName: data.userName,
        salonTagline: data.salonTagline,
        salonLogoUrl: data.salonLogoUrl,
        whatsappSchedulingMessage: data.whatsappSchedulingMessage,
        salonName: data.salonName,
        salonAddress: data.salonAddress,
        salonPhone: data.salonPhone,
      };
      // Convert Timestamp to ISO string for updatedAt
      if (data.updatedAt && data.updatedAt instanceof Timestamp) {
        appSettings.updatedAt = data.updatedAt.toDate().toISOString();
      } else if (data.updatedAt) { 
        appSettings.updatedAt = data.updatedAt;
      }
      return appSettings;
    }
    console.log('No app settings document found in Firestore.');
    return null;
  } catch (error) {
    console.error('Error fetching app settings from Firestore:', error);
    throw error; 
  }
};

export const saveAppSettingsFS = async (settings: Partial<AppSettings>): Promise<void> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking saveAppSettingsFS operation.');
    return Promise.resolve();
  }
  try {
    const settingsDocRef = doc(db, APP_CONFIG_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const dataToSave: Partial<AppSettings> & { updatedAt?: any } = { ...settings, updatedAt: serverTimestamp() };
    
    // Ensure all potentially configurable fields are included in dataToSave if they exist in settings
    if (settings.openingHours) dataToSave.openingHours = settings.openingHours;
    if (settings.hasOwnProperty('userName')) dataToSave.userName = settings.userName;
    if (settings.hasOwnProperty('salonTagline')) dataToSave.salonTagline = settings.salonTagline;
    if (settings.hasOwnProperty('salonLogoUrl')) dataToSave.salonLogoUrl = settings.salonLogoUrl;
    if (settings.hasOwnProperty('whatsappSchedulingMessage')) dataToSave.whatsappSchedulingMessage = settings.whatsappSchedulingMessage;
    if (settings.hasOwnProperty('salonName')) dataToSave.salonName = settings.salonName;
    if (settings.hasOwnProperty('salonAddress')) dataToSave.salonAddress = settings.salonAddress;
    if (settings.hasOwnProperty('salonPhone')) dataToSave.salonPhone = settings.salonPhone;

    await setDoc(settingsDocRef, dataToSave, { merge: true });
    console.log('App settings saved to Firestore successfully:', dataToSave);
  } catch (error) {
    console.error('Error saving app settings to Firestore:', error);
    throw error; 
  }
};

// ========== Admin Status Check ==========
export const checkAdminStatusFS = async (uid: string): Promise<boolean> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking checkAdminStatusFS for UID: ${uid}, returning false.`);
    // In a real app, if db isn't available, you'd likely deny admin status.
    // For testing without Firebase, you might hardcode a specific mock UID to be admin.
    // Example: if (uid === 'mock-admin-uid') return true;
    return false;
  }
  try {
    const adminDocRef = doc(db, 'admins', uid);
    const docSnap = await getDoc(adminDocRef);
    if (docSnap.exists()) {
      // Check for a specific field, e.g., `isAdmin: true` or `role: 'admin'`
      // For this example, we'll assume if the document exists in 'admins' collection, they are an admin.
      // More robust: return docSnap.data()?.isAdmin === true;
      return true; 
    }
    return false; // User document does not exist in 'admins' collection
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false; // Default to not admin on error
  }
};


// ========== Client Functions ==========

export const addClientFS = async (
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Client> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addClientFS operation.');
    const mockId = `mock_client_${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id: mockId,
      ...clientData,
      stampsEarned: clientData.stampsEarned || 0,
      mimosRedeemed: clientData.mimosRedeemed || 0,
      purchasedPackages: clientData.purchasedPackages || [],
      createdAt: now,
      updatedAt: now,
    };
  }
  const dataToSave = {
    ...clientData,
    stampsEarned: clientData.stampsEarned || 0,
    mimosRedeemed: clientData.mimosRedeemed || 0,
    purchasedPackages: clientData.purchasedPackages || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'clients'), dataToSave);
  const docSnap = await getDoc(docRef); 
  return fromFirestore<Client>(docSnap);
};

export const getClientsFS = async (): Promise<Client[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getClientsFS operation, returning empty array.');
    return [];
  }
  const querySnapshot = await getDocs(collection(db, 'clients'));
  return querySnapshot.docs.map((doc) => fromFirestore<Client>(doc));
};

export const getClientFS = async (id: string): Promise<Client | null> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking getClientFS for ID: ${id}, returning null.`);
    return null;
  }
   const docRef = doc(db, "clients", id);
   const docSnap = await getDoc(docRef);
   return docSnap.exists() ? fromFirestore<Client>(docSnap) : null;
}

export const updateClientFS = async (
  id: string,
  data: Partial<Omit<Client, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking updateClientFS operation for ID: ${id}.`);
    const localClients = await getClientsFS(); 
    const clientIndex = localClients.findIndex(c => c.id === id);
    if (clientIndex > -1) {
        console.log(`Mocked updateClientFS for ${id} with data:`, data);
    }
    return Promise.resolve();
  }
  const clientDoc = doc(db, 'clients', id);
  const dataToUpdate: any = { ...data, updatedAt: serverTimestamp() };
  if (data.purchasedPackages) {
    dataToUpdate.purchasedPackages = data.purchasedPackages.map(pkg => ({
      ...pkg,
      purchaseDate: typeof pkg.purchaseDate === 'string' ? Timestamp.fromDate(new Date(pkg.purchaseDate)) : pkg.purchaseDate,
      expiryDate: typeof pkg.expiryDate === 'string' ? Timestamp.fromDate(new Date(pkg.expiryDate)) : pkg.expiryDate,
    })) as ClientPackageInstance[];
  }
  await updateDoc(clientDoc, dataToUpdate);
};

export const deleteClientFS = async (id: string): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking deleteClientFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const clientDoc = doc(db, 'clients', id);
  await deleteDoc(clientDoc);
};


// ========== Service Functions ==========

export const addServiceFS = async (
  serviceData: Omit<SalonService, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SalonService> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addServiceFS operation.');
    const mockId = `mock_service_${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id: mockId,
      ...serviceData,
      price: String(serviceData.price).replace(',', '.'),
      createdAt: now,
      updatedAt: now
    };
  }
  const dataToSave = {
    ...serviceData,
    price: String(serviceData.price).replace(',', '.'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'services'), dataToSave);
  const docSnap = await getDoc(docRef);
  return fromFirestore<SalonService>(docSnap);
};

export const getServicesFS = async (): Promise<SalonService[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getServicesFS operation, returning default mock services.');
    return [ 
        { id: "mockServiceId1", name: "Manicure Simples (Mock)", duration: "45 min", price: "35.00", category: "Mãos", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mockServiceId2", name: "Pedicure Completa (Mock)", duration: "60 min", price: "45.00", category: "Pés", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "mockServiceId3", name: "Spa dos Pés (Mock)", duration: "75 min", price: "60.00", category: "Pés", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
  }
  const querySnapshot = await getDocs(collection(db, 'services'));
  return querySnapshot.docs.map((doc) => fromFirestore<SalonService>(doc));
};

export const updateServiceFS = async (
  id: string,
  data: Partial<Omit<SalonService, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking updateServiceFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const serviceDoc = doc(db, 'services', id);
  const updateData: Partial<SalonService> & { updatedAt?: any } = { ...data, updatedAt: serverTimestamp() };
  if (data.price) {
    updateData.price = String(data.price).replace(',', '.');
  }
  await updateDoc(serviceDoc, updateData as any);
};

export const deleteServiceFS = async (id: string): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking deleteServiceFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const serviceDoc = doc(db, 'services', id);
  await deleteDoc(serviceDoc);
};


// ========== Appointment Functions ==========

export const addAppointmentFS = async (
  appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Appointment> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addAppointmentFS operation.');
    const mockId = `mock_appt_${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id: mockId,
      ...appointmentData,
      createdAt: now,
      updatedAt: now
    };
  }
  const dataToSave = {
    ...appointmentData,
    date: appointmentData.date, // Already YYYY-MM-DD string
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'appointments'), dataToSave);
  const docSnap = await getDoc(docRef);
  return fromFirestore<Appointment>(docSnap);
};

export const getAppointmentsFS = async (): Promise<Appointment[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getAppointmentsFS operation, returning empty array.');
    return [];
  }

  const q = query(collection(db, 'appointments'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => fromFirestore<Appointment>(doc));
};


export const updateAppointmentFS = async (
  id: string,
  data: Partial<Omit<Appointment, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking updateAppointmentFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const appointmentDoc = doc(db, 'appointments', id);
  await updateDoc(appointmentDoc, { ...data, updatedAt: serverTimestamp() });
};

export const deleteAppointmentFS = async (id: string): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking deleteAppointmentFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const appointmentDoc = doc(db, 'appointments', id);
  await deleteDoc(appointmentDoc);
};

// ========== Package Functions ==========

export const addPackageFS = async (
  packageData: Omit<SalonPackage, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SalonPackage> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addPackageFS operation.');
    const mockId = `mock_package_${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id: mockId,
      ...packageData,
      price: String(packageData.price).replace(',', '.'),
      originalPrice: packageData.originalPrice ? String(packageData.originalPrice).replace(',', '.') : undefined,
      createdAt: now,
      updatedAt: now
    };
  }
  const dataToSave = {
    ...packageData,
    price: String(packageData.price).replace(',', '.'),
    originalPrice: packageData.originalPrice ? String(packageData.originalPrice).replace(',', '.') : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'packages'), dataToSave);
  const docSnap = await getDoc(docRef);
  return fromFirestore<SalonPackage>(docSnap);
};

export const getPackagesFS = async (): Promise<SalonPackage[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getPackagesFS operation, returning default mock packages.');
     return [
      {
        id: "mock_pkg_fs_1",
        name: "Pacote Essencial FS (Mock)",
        shortDescription: "4x Manicure + 2x Pedicure.",
        services: [ { serviceId: "mockServiceId1", quantity: 4 }, { serviceId: "mockServiceId2", quantity: 2 } ],
        price: "167.00", originalPrice: "220.00", validityDays: 90, status: "Ativo", themeColor: "accent",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: "mock_pkg_fs_2",
        name: "Pacote Pedicure Premium FS (Mock)",
        shortDescription: "4 sessões de pedicure premium.",
        services: [{ serviceId: "mockServiceId2", quantity: 4 }],
        price: "130.00", originalPrice: "160.00", validityDays: 60, status: "Ativo", themeColor: "primary",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ];
  }
  const querySnapshot = await getDocs(collection(db, 'packages'));
  return querySnapshot.docs.map((doc) => fromFirestore<SalonPackage>(doc));
};

export const updatePackageFS = async (
  id: string,
  data: Partial<Omit<SalonPackage, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking updatePackageFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const packageDoc = doc(db, 'packages', id);
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  if (data.price) {
    updateData.price = String(data.price).replace(',', '.');
  }
  if (data.hasOwnProperty('originalPrice')) { 
    updateData.originalPrice = data.originalPrice ? String(data.originalPrice).replace(',', '.') : undefined;
  }
  await updateDoc(packageDoc, updateData);
};

export const deletePackageFS = async (id: string): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking deletePackageFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const packageDoc = doc(db, 'packages', id);
  await deleteDoc(packageDoc);
};


// ========== Professional Functions ==========
export const addProfessionalFS = async (
  professionalData: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Professional> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addProfessionalFS operation.');
    const mockId = `mock_professional_${Date.now()}`;
    const now = new Date().toISOString();
    return { 
      id: mockId, 
      ...professionalData, 
      commissionRate: professionalData.commissionRate === undefined ? null : Number(professionalData.commissionRate),
      createdAt: now, 
      updatedAt: now 
    };
  }
  const dataToSave = { 
    ...professionalData,
    commissionRate: professionalData.commissionRate === undefined || professionalData.commissionRate === null ? null : Number(professionalData.commissionRate),
    createdAt: serverTimestamp(), 
    updatedAt: serverTimestamp() 
  };
  const docRef = await addDoc(collection(db, 'professionals'), dataToSave);
  const docSnap = await getDoc(docRef);
  return fromFirestore<Professional>(docSnap);
};

export const getProfessionalsFS = async (): Promise<Professional[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getProfessionalsFS operation, returning empty array.');
    return [];
  }
  const querySnapshot = await getDocs(collection(db, 'professionals'));
  return querySnapshot.docs.map((doc) => fromFirestore<Professional>(doc));
};

export const getProfessionalFS = async (id: string): Promise<Professional | null> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking getProfessionalFS for ID: ${id}, returning null.`);
    // Example mock response for a specific ID if needed for testing
    // if (id === "mockProfessionalId1") {
    //   return { id: "mockProfessionalId1", name: "Mock Professional", specialty: "Mock Specialty", commissionRate: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    // }
    return null;
  }
  const docRef = doc(db, 'professionals', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? fromFirestore<Professional>(docSnap) : null;
};

export const updateProfessionalFS = async (
  id: string,
  data: Partial<Omit<Professional, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking updateProfessionalFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const professionalDoc = doc(db, 'professionals', id);
  const dataToUpdate: Partial<Professional> & { updatedAt?: any } = { ...data, updatedAt: serverTimestamp() };
  if (data.hasOwnProperty('commissionRate')) {
    dataToUpdate.commissionRate = data.commissionRate === undefined || data.commissionRate === null ? null : Number(data.commissionRate);
  }
  await updateDoc(professionalDoc, dataToUpdate as any);
};

export const deleteProfessionalFS = async (id: string): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking deleteProfessionalFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const professionalDoc = doc(db, 'professionals', id);
  await deleteDoc(professionalDoc);
};


// ========== Financial Transaction Functions (formerly Expense) ==========

export const addFinancialTransactionFS = async (
  transactionData: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinancialTransaction> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addFinancialTransactionFS operation.');
    const mockId = `mock_transaction_${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id: mockId,
      ...transactionData,
      amount: String(transactionData.amount).replace(',', '.'),
      date: transactionData.date, // YYYY-MM-DD string
      createdAt: now,
      updatedAt: now
    };
  }
  const dataToSave = {
    ...transactionData,
    amount: String(transactionData.amount).replace(',', '.'),
    date: transactionData.date, // YYYY-MM-DD string
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'financialTransactions'), dataToSave); // Changed collection name
  const docSnap = await getDoc(docRef);
  return fromFirestore<FinancialTransaction>(docSnap);
};

export const getFinancialTransactionsFS = async (): Promise<FinancialTransaction[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getFinancialTransactionsFS operation, returning empty array.');
    return [];
  }
  const q = query(collection(db, 'financialTransactions')); // Changed collection name
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => fromFirestore<FinancialTransaction>(doc));
};

// ========== Product (Inventory) Functions ==========

export const addProductFS = async (
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking addProductFS operation.');
    const mockId = `mock_product_${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id: mockId,
      ...productData,
      costPrice: productData.costPrice ? String(productData.costPrice).replace(',', '.') : undefined,
      sellingPrice: productData.sellingPrice ? String(productData.sellingPrice).replace(',', '.') : undefined,
      lastRestockDate: productData.lastRestockDate || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }
  const dataToSave = {
    ...productData,
    stock: Number(productData.stock) || 0,
    lowStockThreshold: Number(productData.lowStockThreshold) || 0,
    costPrice: productData.costPrice ? String(productData.costPrice).replace(',', '.') : null,
    sellingPrice: productData.sellingPrice ? String(productData.sellingPrice).replace(',', '.') : null,
    lastRestockDate: productData.lastRestockDate ? productData.lastRestockDate : null, // Ensure it's string or null
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'products'), dataToSave);
  const docSnap = await getDoc(docRef);
  return fromFirestore<Product>(docSnap);
};

export const getProductsFS = async (): Promise<Product[]> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking getProductsFS operation, returning empty array.');
    return [];
  }
  const querySnapshot = await getDocs(collection(db, 'products'));
  return querySnapshot.docs.map((doc) => fromFirestore<Product>(doc));
};

export const updateProductFS = async (
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking updateProductFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const productDoc = doc(db, 'products', id);
  const dataToUpdate: any = { ...data, updatedAt: serverTimestamp() };

  if (data.hasOwnProperty('stock') && data.stock !== undefined) {
    dataToUpdate.stock = Number(data.stock);
  }
  if (data.hasOwnProperty('lowStockThreshold') && data.lowStockThreshold !== undefined) {
    dataToUpdate.lowStockThreshold = Number(data.lowStockThreshold);
  }
  if (data.costPrice) {
    dataToUpdate.costPrice = String(data.costPrice).replace(',', '.');
  }
  if (data.sellingPrice) {
    dataToUpdate.sellingPrice = String(data.sellingPrice).replace(',', '.');
  }
  if (data.lastRestockDate) { // Expecting "YYYY-MM-DD"
    dataToUpdate.lastRestockDate = data.lastRestockDate;
  }

  await updateDoc(productDoc, dataToUpdate);
};

export const deleteProductFS = async (id: string): Promise<void> => {
  if (!db) {
    console.warn(`Firestore not initialized. Mocking deleteProductFS operation for ID: ${id}.`);
    return Promise.resolve();
  }
  const productDoc = doc(db, 'products', id);
  await deleteDoc(productDoc);
};

export const clearAllFinancialTransactionsFS = async (): Promise<{ success: boolean, deletedCount: number, error?: string }> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking clearAllFinancialTransactionsFS operation.');
    return { success: true, deletedCount: 0, error: "Firestore not initialized (mocked operation)" };
  }
  try {
    console.log('Attempting to clear all financial transactions...');
    const transactionsCollectionRef = collection(db, 'financialTransactions');
    const querySnapshot = await getDocs(transactionsCollectionRef);
    let deletedCount = 0;
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, 'financialTransactions', docSnapshot.id)));
      deletedCount++;
    });
    await Promise.all(deletePromises);
    console.log(`Successfully deleted ${deletedCount} financial transactions.`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('Error clearing financial transactions:', error);
    return { success: false, deletedCount: 0, error: error.message || "Unknown error" };
  }
};

export const clearAllAppointmentsFS = async (): Promise<{ success: boolean, deletedCount: number, error?: string }> => {
  if (!db) {
    console.warn('Firestore not initialized. Mocking clearAllAppointmentsFS operation.');
    return { success: true, deletedCount: 0, error: "Firestore not initialized (mocked operation)" };
  }
  try {
    console.log('Attempting to clear all appointments...');
    const appointmentsCollectionRef = collection(db, 'appointments');
    const querySnapshot = await getDocs(appointmentsCollectionRef);
    let deletedCount = 0;
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, 'appointments', docSnapshot.id)));
      deletedCount++;
    });
    await Promise.all(deletePromises);
    console.log(`Successfully deleted ${deletedCount} appointments.`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('Error clearing appointments:', error);
    return { success: false, deletedCount: 0, error: error.message || "Unknown error" };
  }
};


// Keep Expense type for backward compatibility if needed, or gradually phase out.
// For now, we'll focus on using FinancialTransaction.
// export type Expense = FinancialTransaction & { type: 'expense' };
// export type Income = FinancialTransaction & { type: 'income' };

    
