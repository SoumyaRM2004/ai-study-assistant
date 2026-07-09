import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../lib/api';
import { GraduationCap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await authAPI.login({
        email: data.email,
        password: data.password,
      });

      // TODO: In production, access_token should be stored in memory and refresh_token
      // should be handled via HTTP-only secure cookies to guard against XSS vulnerabilities.
      login(res.user, res.access_token, res.refresh_token);
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/10">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-2xl bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent leading-none">
            StudyAI
          </h1>
          <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase">
            Intelligence Platform
          </span>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-1.5">Sign In</h2>
          <p className="text-sm text-slate-400">Welcome back! Please enter your details below.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail className="w-5 h-5" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className={`input-field pl-12 ${errors.email ? 'border-red-500 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address',
                  },
                })}
              />
            </div>
            {errors.email && (
              <span className="text-xs text-red-400 font-medium mt-0.5">{errors.email.message}</span>
            )}
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className={`input-field pl-12 ${errors.password ? 'border-red-500 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters long',
                  },
                })}
              />
            </div>
            {errors.password && (
              <span className="text-xs text-red-400 font-medium mt-0.5">{errors.password.message}</span>
            )}
          </div>

          {/* Submit button */}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-slate-850">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
