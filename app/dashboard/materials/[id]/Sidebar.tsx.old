import { createClient } from '@/lib/supabase/server';
import { getMaterials } from '@/app/actions/materials';
import SidebarClient from './SidebarClient';

export default async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const materials = await getMaterials();
  
  return (
    <SidebarClient 
      userEmail={user?.email || 'your@account.com'} 
      materials={materials.slice(0, 10)}
    />
  );
}

