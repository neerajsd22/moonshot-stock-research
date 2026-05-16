import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const portfolioApi = {
  list: () => axios.get(`${API}/portfolio`).then(r => r.data),
  summary: () => axios.get(`${API}/portfolio/summary`).then(r => r.data),
  add: (payload) => axios.post(`${API}/portfolio`, payload).then(r => r.data),
  update: (id, payload) => axios.put(`${API}/portfolio/${id}`, payload).then(r => r.data),
  remove: (id) => axios.delete(`${API}/portfolio/${id}`).then(r => r.data),
  importPreview: (text) => axios.post(`${API}/portfolio/import`, { text, confirm: false }).then(r => r.data),
  importConfirm: (text) => axios.post(`${API}/portfolio/import`, { text, confirm: true }).then(r => r.data),
};

export const fmtUSD = (n, opts = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const compact = opts.compact && abs >= 1000;
  if (compact && abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (compact && abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (compact && abs >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const fmtPct = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
};

export const fmtSigned = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${fmtUSD(Math.abs(n))}`;
};

export const colorClass = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return 'text-gray-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-gray-300';
};
