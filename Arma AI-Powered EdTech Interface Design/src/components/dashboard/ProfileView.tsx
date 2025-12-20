import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Bell, Moon, LogOut, ChevronRight, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileView() {
  const [activeTab, setActiveTab] = useState('Account');

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F] relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
         <h1 className="text-3xl font-medium text-white tracking-tight mb-8">Settings</h1>

         <div className="grid md:grid-cols-[240px_1fr] gap-8">
            {/* Sidebar */}
            <div className="space-y-1">
               {['Account', 'Notifications', 'Privacy & Security', 'Appearance'].map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
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
               {activeTab === 'Privacy & Security' && <PrivacySettings />}
               {activeTab === 'Notifications' && <NotificationSettings />}
               {activeTab === 'Appearance' && <AppearanceSettings />}
            </div>
         </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="space-y-6">
       <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <h2 className="text-lg font-medium text-white mb-6">Profile Details</h2>
          <div className="flex items-center gap-6 mb-8">
             <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xl font-medium text-white">JD</div>
             <div>
                <button className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors mb-2">Change Avatar</button>
                <p className="text-xs text-white/30">JPG or PNG. Max 1MB.</p>
             </div>
          </div>
          
          <div className="grid gap-4">
             <div className="grid grid-cols-2 gap-4">
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
       <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
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
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 py-20">
         <Bell size={40} className="mx-auto mb-4 opacity-20" />
         <p>Notification settings coming soon</p>
      </div>
   )
}

function AppearanceSettings() {
   return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 py-20">
         <Moon size={40} className="mx-auto mb-4 opacity-20" />
         <p>Only Dark Mode is available in this prototype.</p>
      </div>
   )
}
