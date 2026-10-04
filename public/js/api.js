// Fetch wrapper. Every call sends the HTTP-only session cookie.
window.API = {
  async request(method, path, body) {
    const res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'request_failed');
      err.status = res.status;
      throw err;
    }
    return data;
  },
  get(p)     { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  patch(p, b){ return this.request('PATCH', p, b); },
  del(p)     { return this.request('DELETE', p); },
};
