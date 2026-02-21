import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-37cad5a7`;

export async function fetchMaterials() {
  const response = await fetch(`${BASE_URL}/materials`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch materials');
  return response.json();
}

export async function createMaterial(data: { title: string; type: 'PDF' | 'YouTube' }) {
  const response = await fetch(`${BASE_URL}/materials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create material');
  return response.json();
}
