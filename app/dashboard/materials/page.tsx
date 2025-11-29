import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getMaterials } from '@/app/actions/materials';
import Sidebar from '../Sidebar';
import MaterialsGrid from './MaterialsGrid';

export default async function MaterialsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get materials
    const materials = await getMaterials();

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar userEmail={user.email} />
            <div className="flex-1">
                <MaterialsGrid materials={materials} />
            </div>
        </div>
    );
}
