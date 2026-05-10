const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL}${cleanPath}`;
};

export default API_BASE_URL;
