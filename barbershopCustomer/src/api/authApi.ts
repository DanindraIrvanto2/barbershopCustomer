import api from "./axios";

export const loginbyemail = async (userData: any) => {
  const response = await api.post("/auth/login", userData);
  return response.data;
};

export const loginbyphone = async (userData: { phone: string; password?: string }) => {
  const response = await api.post("/auth/loginbyphone", userData);
  return response.data;
};

export const registerCustomer = async (userData: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
}) => {
  const response = await api.post("/customers", userData);
  return response.data;
};