import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { AICore } from '../components/shared/AICore';
import { hasLandingIntent } from '../utils/landingIntent';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });
      toast.success('Account created. Welcome!');
      navigate(hasLandingIntent() ? '/dashboard?source=landing' : '/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Sign up failed. Try another email.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-10 sm:py-14 overflow-hidden"
      style={{ background: '#0C0C0F' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,138,61,0.12)_0%,rgba(12,12,15,0)_50%)]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
        <AICore size="xl" />
      </div>

      <Card className="w-full max-w-lg relative z-10 rounded-2xl border-white/12 bg-[linear-gradient(140deg,rgba(22,22,27,0.82),rgba(33,23,16,0.62),rgba(18,18,24,0.8))] backdrop-blur-[20px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <CardHeader className="text-center px-6 sm:px-7 pt-7 pb-2 space-y-3 mt-2">
          <Link
            to="/"
            className="mx-auto inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/85 hover:text-white hover:border-primary/40 transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/35 text-primary flex items-center justify-center">
              <Brain className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm tracking-wide font-medium">arma</span>
          </Link>
          <CardTitle className="text-[30px] font-semibold text-white tracking-[0.01em]">Create account</CardTitle>
          <CardDescription className="text-white/60 text-sm leading-relaxed">
            Build your profile and start learning with AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-7 pb-7 mb-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="full_name" className="text-white/80 text-sm">
                Full name
              </Label>
              <div className="relative">
                <UserRound className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Alex Morgan"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 bg-white/5 border-white/12 text-white placeholder:text-white/48 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-white/80 text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 bg-white/5 border-white/12 text-white placeholder:text-white/48 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-white/80 text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 bg-white/5 border-white/12 text-white placeholder:text-white/48 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="confirmPassword" className="text-white/80 text-sm">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 bg-white/5 border-white/12 text-white placeholder:text-white/48 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 mt-2 rounded-xl text-white font-semibold transition-shadow"
              style={{ background: '#FF8A3D', boxShadow: '0 0 22px rgba(255,138,61,0.25)' }}
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <p className="text-center text-sm text-white/60 pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-[#FF8A3D] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
