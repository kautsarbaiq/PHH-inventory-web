// ============================================================
// PHH Inventory — API Client (Axios)
// ============================================================

import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- Sheet API ----

export const sheetApi = {
  list: (params = {}) => api.get("/sheets", { params }),
  getById: (id) => api.get(`/sheets/${id}`),
  create: (data) => api.post("/sheets", data),
  update: (id, data) => api.patch(`/sheets/${id}`, data),
  archive: (id) => api.delete(`/sheets/${id}`),
};

// ---- Cutting API ----

export const cuttingApi = {
  list: (sheetId) => api.get(`/sheets/${sheetId}/cuttings`),
  create: (sheetId, data) => api.post(`/sheets/${sheetId}/cuttings`, data),
  updatePosition: (sheetId, cuttingId, data) =>
    api.patch(`/sheets/${sheetId}/cuttings/${cuttingId}/position`, data),
  remove: (sheetId, cuttingId) =>
    api.delete(`/sheets/${sheetId}/cuttings/${cuttingId}`),
};

export default api;
