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
  snapToken?: string;
  snap_token?: string;
  token?: string;
  redirectUrl?: string;
  redirect_url?: string;
  paymentUrl?: string;
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

// Ensure Midtrans Snap JS is loaded dynamically
export const ensureSnapLoaded = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).snap) {
      return resolve(true);
    }
    const existingScript = document.querySelector('script[src*="snap.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      if ((window as any).snap) return resolve(true);
      setTimeout(() => resolve(!!(window as any).snap), 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', 'Mid-client-EaA5SDLk69reqMkQ');
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

// Direct Midtrans Snap Token generator (via Vite proxy or direct fetch fallback)
export const getDirectSnapToken = async (orderId: number, grossAmount: number, customerName: string, phone: string): Promise<string | null> => {
  const payload = {
    transaction_details: {
      order_id: `HD-${orderId}-${Date.now()}`,
      gross_amount: Math.round(grossAmount) || 35000,
    },
    customer_details: {
      first_name: customerName || 'Customer Hair Dept',
      phone: phone || '08123456789',
    },
  };

  // 1. Try Vite proxy endpoint first (avoids browser CORS issues)
  try {
    const proxyRes = await fetch('/api/midtrans-snap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.token) return data.token;
    }
  } catch (proxyErr) {
    console.warn('Vite proxy snap token error, trying direct fetch...', proxyErr);
  }

  // Server keys must stay on the server; the proxy is the only supported path.
  return null;
};

export const getOrderById = async (id: number): Promise<any> => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

// Fetch all orders for current logged in customer
export const getCustomerOrders = async (customerId: number): Promise<any[]> => {
  const response = await api.get('/orders');
  if (Array.isArray(response.data)) {
    return response.data.filter((o: any) => Number(o.customerId) === Number(customerId));
  }
  return [];
};

// Fetch all system orders to check slot availability
export const getAllOrders = async (): Promise<any[]> => {
  const response = await api.get('/orders');
  return Array.isArray(response.data) ? response.data : [];
};

export const updateOrderStatus = async (id: number, data: { paymentStatus?: string; serviceStatus?: string; paymentMethod?: string; amountReceived?: number; changeAmount?: number }): Promise<any> => {
  const response = await api.patch(`/orders/${id}`, data);
  return response.data;
};
