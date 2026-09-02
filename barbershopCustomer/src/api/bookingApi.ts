import api from './axios';

export interface Service {
  id: number;
  name: string;
  duration: number;
  price: string | number;
}

export interface Kapster {
  id: number;
  name: string;
  phone?: string;
  role?: string;
  specialty?: string;
}

export interface CreateOrderPayload {
  customerId: number;
  kapsterId?: number | null;
  serviceIds: number[];
  checkInTime?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  id: number;
  customerId: number;
  kapsterId?: number;
  serviceStatus: string;
  paymentStatus: string;
  checkInTime?: string;
  notes?: string;
  totalPrice?: number | string;
}

// Fetch all available services from backend
export const getServices = async (): Promise<Service[]> => {
  const response = await api.get('/services');
  return response.data;
};

// Fetch kapsters (only returning Home Service kapsters)
export const getKapsters = async (role?: string): Promise<Kapster[]> => {
  const url = role ? `/kapsters?role=${encodeURIComponent(role)}` : '/kapsters';
  const response = await api.get(url);
  const data: Kapster[] = response.data;

  if (Array.isArray(data)) {
    return data.filter(k => {
      // 1. If backend provides role field
      if (k.role) {
        return k.role.toLowerCase().includes('home') && !k.role.toLowerCase().includes('onsite');
      }
      // 2. Fallback matching Home Service kapsters (Basyarudin, Gohan) and excluding Onsite (Wildan, Papang)
      const name = k.name?.toLowerCase() || '';
      if (name.includes('wildan') || name.includes('papang')) {
        return false;
      }
      return true;
    });
  }

  return data;
};

// Create a new booking / order in backend
export const createOrder = async (data: CreateOrderPayload): Promise<CreateOrderResponse> => {
  const response = await api.post('/orders', data);
  return response.data;
};
