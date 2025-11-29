import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getMaterials } from '@/app/actions/materials';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get materials
  const materials = await getMaterials();

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email} />
      <DashboardContent materials={materials} />
    </div>
  );
}

