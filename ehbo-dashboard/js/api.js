/* ------------------------------------------------------------------
   API-laag
   Zet USE_MOCK op false en vul API_BASE in zodra de backend klaar is.
   Verwachte endpoints (pas aan naar jullie backend):
     POST  {API_BASE}/login                 body: { username, password }  -> { token, naam, rol }
     GET   {API_BASE}/meldingen             -> [ melding, ... ]
     PATCH {API_BASE}/meldingen/{id}        body: { status }              -> melding
   Een melding heeft minimaal: id, type, beschrijving, lat, lon, gebruiker_id, status, aangemaakt_op
------------------------------------------------------------------ */
const API_CONFIG = {
  USE_MOCK: true,
  API_BASE: 'https://api.example.nl/api',
};

const Api = (() => {
  let token = null;
  let mockStore = MOCK_INCIDENTS.map((m) => ({ ...m }));

  async function request(path, options = {}) {
    const response = await fetch(API_CONFIG.API_BASE + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`API-fout ${response.status}`);
    return response.status === 204 ? null : response.json();
  }

  return {
    async login(username, password) {
      if (API_CONFIG.USE_MOCK) {
        token = 'mock-token';
        return { naam: 'Mees Jansen', rol: 'Coördinator', initialen: 'MJ' };
      }
      const result = await request('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      token = result.token;
      return result;
    },

    logout() {
      token = null;
    },

    async getIncidents() {
      if (API_CONFIG.USE_MOCK) return mockStore.map((m) => ({ ...m }));
      return request('/meldingen');
    },

    async updateStatus(id, status) {
      if (API_CONFIG.USE_MOCK) {
        mockStore = mockStore.map((m) => (m.id === id ? { ...m, status } : m));
        return mockStore.find((m) => m.id === id);
      }
      return request(`/meldingen/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    },
  };
})();
