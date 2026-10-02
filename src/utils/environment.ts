export const isMockMode = import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true';
export const sessionStorageKey = `xuexizhitu.session.${isMockMode ? 'mock' : 'real'}`;
