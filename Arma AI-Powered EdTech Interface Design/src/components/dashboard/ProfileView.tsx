import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Bell, Moon, LogOut, ChevronRight, Shield, Key, CreditCard, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { billingApi } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { UsageSummary } from '../../types/api';

export function ProfileView() {
  const [activeTab, setActiveTab] = useState('Account');
  const [searchParams] = useSearchParams();
  const { refreshSubscription } = useAuth();

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      refreshSubscription();
      toast.success('Subscription activated!');
    }
  }, [searchParams, refreshSubscription]);

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F] relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
         <h1 className="text-2xl md:text-3xl font-medium text-white tracking-tight mb-8">Settings</h1>

         <div className="grid md:grid-cols-[240px_1fr] gap-4 md:gap-8">
            {/* Sidebar */}
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-hide">
               {['Account', 'Billing', 'Notifications', 'Privacy & Security', 'Appearance'].map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                     activeTab === tab
                       ? 'bg-white/10 text-white'
                       : 'text-white/40 hover:text-white hover:bg-white/5'
                   }`}
                 >
                   {tab}
                   {activeTab === tab && <ChevronRight size={14} />}
                 </button>
               ))}

               <div className="pt-4 mt-4 border-t border-white/5">
                 <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut size={16} />
                    Log Out
                 </button>
               </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
               {activeTab === 'Account' && <AccountSettings />}
               {activeTab === 'Billing' && <BillingSettings />}
               {activeTab === 'Privacy & Security' && <PrivacySettings />}
               {activeTab === 'Notifications' && <NotificationSettings />}
               {activeTab === 'Appearance' && <AppearanceSettings />}
            </div>
         </div>
      </div>
    </div>
  );
}

function BillingSettings() {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const planTier = subscription?.plan_tier || 'free';
  const planNames: Record<string, string> = { free: 'Free', student: 'Student', pro: 'Pro' };

  useEffect(() => {
    billingApi.getUsage().then(data => setUsage(data.usage)).catch(() => {});
  }, []);

  const handleManage = async () => {
    setLoadingPortal(true);
    try {
      const url = await billingApi.createPortal(window.location.href);
      window.location.href = url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  const resourceLabels: Record<string, string> = {
    material_upload: 'Materials',
    chat_message: 'Chat Messages',
    podcast_generation: 'Podcasts',
    presentation_generation: 'Presentations',
    storage_mb: 'Storage (MB)',
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white">Subscription</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            planTier === 'pro' ? 'bg-primary/20 text-primary' :
            planTier === 'student' ? 'bg-blue-500/20 text-blue-400' :
            'bg-white/10 text-white/60'
          }`}>
            {planNames[planTier]}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            planTier === 'pro' ? 'bg-primary/20 text-primary' :
            planTier === 'student' ? 'bg-blue-500/20 text-blue-400' :
            'bg-white/5 text-white/40'
          }`}>
            {planTier === 'free' ? <User size={20} /> : <Zap size={20} />}
          </div>
          <div>
            <p className="text-white font-medium">{planNames[planTier]} Plan</p>
            <p className="text-xs text-white/40">
              {subscription?.status === 'active' ? 'Active' :
               subscription?.status === 'past_due' ? 'Payment past due' :
               subscription?.cancel_at_period_end ? 'Cancels at period end' : 'Active'}
              {subscription?.current_period_end && ` · Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {planTier !== 'pro' && (
            <button
              onClick={() => navigate('/pricing')}
              className="px-5 py-2 bg-primary text-black rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Upgrade Plan
            </button>
          )}
          {planTier !== 'free' && (
            <button
              onClick={handleManage}
              disabled={loadingPortal}
              className="px-5 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
            >
              {loadingPortal ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-medium text-white mb-6">Usage This Month</h2>
        <div className="space-y-5">
          {usage.map((item) => {
            const label = resourceLabels[item.resource_type] || item.resource_type;
            const isUnlimited = item.limit === -1;
            const percentage = isUnlimited ? 0 : item.limit > 0 ? Math.min((item.used / item.limit) * 100, 100) : 0;
            const isNearLimit = !isUnlimited && percentage >= 80;

            return (
              <div key={item.resource_type}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/70">{label}</span>
                  <span className={`font-medium ${isNearLimit ? 'text-amber-400' : 'text-white/50'}`}>
                    {item.used} / {isUnlimited ? '∞' : item.limit}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isNearLimit ? 'bg-amber-400' : 'bg-primary/60'
                    }`}
                    style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {usage.length === 0 && (
            <p className="text-sm text-white/30 text-center py-4">No usage data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="space-y-6">
       <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <h2 className="text-lg font-medium text-white mb-6">Profile Details</h2>
          <div className="flex items-center gap-6 mb-8">
             <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xl font-medium text-white">JD</div>
             <div>
                <button className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors mb-2">Change Avatar</button>
                <p className="text-xs text-white/30">JPG or PNG. Max 1MB.</p>
             </div>
          </div>

          <div className="grid gap-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs text-white/40 uppercase tracking-wider">First Name</label>
                   <input type="text" defaultValue="John" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary/50 outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs text-white/40 uppercase tracking-wider">Last Name</label>
                   <input type="text" defaultValue="Doe" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary/50 outline-none transition-colors" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-wider">Email Address</label>
                <input type="email" defaultValue="john.doe@example.com" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary/50 outline-none transition-colors" />
             </div>
          </div>

          <div className="mt-6 flex justify-end">
             <button onClick={() => toast.success('Profile updated')} className="px-6 py-2 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors">Save Changes</button>
          </div>
       </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="space-y-6">
       <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <h2 className="text-lg font-medium text-white mb-6">Security</h2>
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group mb-4">
             <div className="flex items-center gap-4">
               <div className="p-2 rounded-lg bg-white/5 text-white/60"><Key size={20} /></div>
               <div className="text-left">
                  <div className="text-sm font-medium text-white">Change Password</div>
                  <div className="text-xs text-white/40">Last changed 3 months ago</div>
               </div>
             </div>
             <ChevronRight size={16} className="text-white/20 group-hover:text-white" />
          </button>
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
             <div className="flex items-center gap-4">
               <div className="p-2 rounded-lg bg-white/5 text-white/60"><Shield size={20} /></div>
               <div className="text-left">
                  <div className="text-sm font-medium text-white">Two-Factor Authentication</div>
                  <div className="text-xs text-white/40">Not enabled</div>
               </div>
             </div>
             <ChevronRight size={16} className="text-white/20 group-hover:text-white" />
          </button>
       </div>
    </div>
  );
}

function NotificationSettings() {
   return (
      <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 py-20">
         <Bell size={40} className="mx-auto mb-4 opacity-20" />
         <p>Notification settings coming soon</p>
      </div>
   )
}

function AppearanceSettings() {
   return (
      <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 py-20">
         <Moon size={40} className="mx-auto mb-4 opacity-20" />
         <p>Only Dark Mode is available now.</p>
      </div>
   )
}
