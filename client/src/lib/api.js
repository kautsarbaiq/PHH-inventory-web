// ============================================================
// PHH Inventory — API Client (Axios)
// ============================================================

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
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
  deletePermanent: (id) => api.delete(`/sheets/${id}/permanent`),
  // Mother-Son
  createSon: (parentId, data) => api.post(`/sheets/${parentId}/son`, data),
  createSonFromCutting: (sheetId, cuttingId, customName) => api.post(`/sheets/${sheetId}/cuttings/${cuttingId}/make-son`, { customName }),
  getGenealogy: (id) => api.get(`/sheets/${id}/genealogy`),
  getGenealogyBatch: (sheetIds) => api.post('/sheets/genealogy-batch', { sheetIds }),
};

// ---- Cutting API ----

export const cuttingApi = {
  list: (sheetId) => api.get(`/sheets/${sheetId}/cuttings`),
  create: (sheetId, data) => api.post(`/sheets/${sheetId}/cuttings`, data),
  updatePosition: (sheetId, cuttingId, data) =>
    api.patch(`/sheets/${sheetId}/cuttings/${cuttingId}/position`, data),
  update: (sheetId, cuttingId, data) =>
    api.patch(`/sheets/${sheetId}/cuttings/${cuttingId}`, data),
  remove: (sheetId, cuttingId) =>
    api.delete(`/sheets/${sheetId}/cuttings/${cuttingId}`),
};

// ---- Group API ----

export const groupApi = {
  list: () => api.get("/groups"),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post("/groups", data),
  update: (id, data) => api.patch(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
};

export default api;
