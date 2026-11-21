'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  CheckSquare,
  FileText,
  Factory,
  Boxes,
  BarChart3,
  Flame,
  LayoutDashboard,
  UserCheck,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export type UserRole = 'ALL' | 'SALESMAN' | 'ADMIN' | 'SUPERVISOR' | 'ACCOUNTANT' | 'OWNER';

export const ROLES = [
  { id: 'OWNER', label: 'Factory Owner', name: 'Sundaram (Proprietor)', badge: 'bg-purple-100 text-purple-800' },
  { id: 'ADMIN', label: 'Factory Admin', name: 'Ramanathan (Billing Desk)', badge: 'bg-blue-100 text-blue-800' },
  { id: 'SALESMAN', label: 'Salesman A (TN)', name: 'Field Salesman', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'SUPERVISOR', label: 'Production Supervisor', name: 'Murugan (Floor)', badge: 'bg-amber-100 text-amber-800' },
  { id: 'ACCOUNTANT', label: 'Accountant / Auditor', name: 'Sankaran (Read-Only)', badge: 'bg-slate-100 text-slate-800' },
];

export function Navigation() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('activeRole') as UserRole;
    if (saved) setCurrentRole(saved);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('activeRole', role);
  };

  const navLinks = [
    { href: '/', label: 'Overview', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
    { href: '/benchmark', label: 'Benchmark Runner', icon: Flame, roles: ['OWNER', 'ADMIN', 'SUPERVISOR', 'ACCOUNTANT', 'SALESMAN'] },
    { href: '/salesman/orders', label: 'Field Orders', icon: ShoppingCart, roles: ['OWNER', 'SALESMAN', 'ADMIN'] },
    { href: '/admin/orders', label: 'Verify Orders', icon: CheckSquare, roles: ['OWNER', 'ADMIN'] },
    { href: '/admin/invoices', label: 'GST Invoices', icon: FileText, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
    { href: '/production/runs', label: 'Production Runs', icon: Factory, roles: ['OWNER', 'SUPERVISOR', 'ADMIN'] },
    { href: '/inventory/stock', label: 'Stock Ledger', icon: Boxes, roles: ['OWNER', 'ADMIN', 'SUPERVISOR', 'ACCOUNTANT'] },
    { href: '/reports', label: 'Audit Reports', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
  ];

  const filteredLinks = navLinks.filter(
    (link) => currentRole === 'OWNER' || link.roles.includes(currentRole)
  );

  const activePersona = ROLES.find((r) => r.id === currentRole) || ROLES[0];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                CDI
              </span>
              <div>
                <span className="font-extrabold text-slate-900 tracking-tight text-lg block leading-tight">
                  Order-to-Audit System
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:block">
                  Packaged Food Manufacturing • NIT Tiruchirappalli
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {filteredLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Active Role Persona Switcher */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-all">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none">
                    Active Persona
                  </div>
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {activePersona.label}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 hidden group-hover:block z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100">
                  Switch Role Persona (RBAC Simulation)
                </div>
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role.id as UserRole)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      currentRole === role.id ? 'bg-emerald-50 font-bold text-emerald-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{role.label}</div>
                      <div className="text-[11px] text-slate-500">{role.name}</div>
                    </div>
                    {currentRole === role.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-1">
            {filteredLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
