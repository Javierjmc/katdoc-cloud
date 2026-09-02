'use client';
// components/AppShell.tsx
// Layout principal: Sidebar en desktop/tablet, bottom nav en mobile

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { clearAuthenticated } from '@/lib/auth';
import { useReminderBadge } from '@/hooks/useReminderBadge';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pendingCount = useReminderBadge();

  const handleLogout = () => {
    clearAuthenticated();
    router.replace('/login');
  };

  // Rutas de página completa (formularios/consultas) donde la bottom nav
  // mobile taparía el footer fijo de "Guardar". La nav queda oculta ahí y
  // el header propio de cada página cubre la navegación (S24).
  const isFullScreenForm =
    pathname === '/patients/new' ||
    /^\/patients\/[^/]+\/edit$/.test(pathname) ||
    pathname === '/records/new' ||
    /^\/records\/[^/]+$/.test(pathname);

  return (
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-900">

      {/* ── SIDEBAR DESKTOP (lg+) ─────────────────────────── */}
      <aside className="
        hidden lg:flex flex-col
        w-64 shrink-0
        bg-surface-700 text-white
        fixed top-0 left-0 h-full z-30
      ">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-600">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-xl shadow-lg">
            🐾
          </div>
          <div>
            <p className="font-black text-base tracking-tight text-white">KATDOC</p>
            <p className="text-xs text-surface-300">Historias Clínicas</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <SidebarLink href="/dashboard"    icon="🏠" label="Dashboard"  active={pathname === '/dashboard'} />
          <SidebarLink href="/tutors"       icon="👥" label="Tutores"    active={pathname.startsWith('/tutors')} />
          <SidebarLink href="/patients"     icon="🐾" label="Pacientes"  active={pathname.startsWith('/patients') && !pathname.includes('/new')} />
          <SidebarLink href="/agenda"       icon="📅" label="Agenda"     active={pathname.startsWith('/agenda')} />
          <SidebarLink href="/notifications" icon="🔔" label="Avisos"    active={pathname.startsWith('/notifications')} badge={pendingCount} />
          <SidebarLink href="/config"       icon="⚙️" label="Ajustes"    active={pathname.startsWith('/config')} />
          <div className="pt-3 border-t border-surface-600 mt-3">
            <SidebarLink href="/patients/new" icon="➕" label="Nuevo Paciente" active={false} highlight />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-surface-600 space-y-1">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-surface-300 hover:text-white hover:bg-surface-600 transition-colors text-sm"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── SIDEBAR TABLET (md) — colapsable ─────────────── */}
      <aside className={`
        hidden md:flex lg:hidden flex-col
        ${sidebarOpen ? 'w-56' : 'w-16'} shrink-0
        bg-surface-700 text-white
        fixed top-0 left-0 h-full z-30
        transition-all duration-300
      `}>
        {/* Toggle + Logo */}
        <div className={`flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-5 border-b border-surface-600`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-xl shrink-0"
          >
            {sidebarOpen ? '◀' : '🐾'}
          </button>
          {sidebarOpen && (
            <div>
              <p className="font-black text-sm text-white">KATDOC</p>
              <p className="text-xs text-surface-300">Historias</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          <SidebarLink href="/dashboard"    icon="🏠" label="Dashboard"       active={pathname === '/dashboard'}                                    collapsed={!sidebarOpen} />
          <SidebarLink href="/tutors"       icon="👥" label="Tutores"         active={pathname.startsWith('/tutors')}                               collapsed={!sidebarOpen} />
          <SidebarLink href="/patients"     icon="🐾" label="Pacientes"       active={pathname.startsWith('/patients') && !pathname.includes('new')} collapsed={!sidebarOpen} />
          <SidebarLink href="/agenda"       icon="📅" label="Agenda"          active={pathname.startsWith('/agenda')}                               collapsed={!sidebarOpen} />
          <SidebarLink href="/notifications" icon="🔔" label="Avisos"         active={pathname.startsWith('/notifications')} badge={pendingCount}  collapsed={!sidebarOpen} />
          <SidebarLink href="/config"       icon="⚙️" label="Ajustes"         active={pathname.startsWith('/config')}                               collapsed={!sidebarOpen} />
          <SidebarLink href="/patients/new" icon="➕" label="Nuevo Paciente"  active={false} highlight                                              collapsed={!sidebarOpen} />
        </nav>

        <div className="px-2 py-4 border-t border-surface-600 space-y-1">
          <ThemeToggle collapsed={!sidebarOpen} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-surface-300 hover:text-white hover:bg-surface-600 transition-colors text-sm"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ───────────────────────────── */}
      <main className={`
        flex-1
        lg:ml-64
        md:ml-16
        ${isFullScreenForm ? 'pb-0' : 'pb-20 md:pb-0'}
        min-h-screen
      `}>
        {children}
      </main>

      {/* ── BOTTOM NAV MOBILE (< md) ──────────────────────── */}
      {!isFullScreenForm && (
        <nav className="
          md:hidden fixed bottom-0 left-0 right-0 z-40
          bg-surface-700 border-t border-surface-600
          flex items-center justify-around
          px-2 py-2 safe-bottom
        ">
          <MobileNavItem href="/dashboard"    icon="🏠" label="Inicio"    active={pathname === '/dashboard'} />
          <MobileNavItem href="/tutors"       icon="👥" label="Tutores"   active={pathname.startsWith('/tutors')} />
          <MobileNavItem href="/patients"     icon="🐾" label="Pacientes" active={pathname.startsWith('/patients') && !pathname.includes('new')} />
          <MobileNavItem href="/agenda"       icon="📅" label="Agenda"    active={pathname.startsWith('/agenda')} />
          <MobileNavItem href="/notifications" icon="🔔" label="Avisos"   active={pathname.startsWith('/notifications')} badge={pendingCount} />
          <MobileNavItem href="/patients/new" icon="➕" label="Nuevo"     active={false} highlight />
          <ThemeToggle onItem />
        </nav>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────

function SidebarLink({ href, icon, label, active, highlight, collapsed, badge }: {
  href: string; icon: string; label: string;
  active: boolean; highlight?: boolean; collapsed?: boolean; badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-3 rounded-xl transition-all duration-150
        ${collapsed ? 'justify-center p-3' : 'px-4 py-2.5'}
        ${highlight
          ? 'bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/30'
          : active
            ? 'bg-surface-600 text-white font-semibold'
            : 'text-surface-300 hover:text-white hover:bg-surface-600'
        }
        text-sm
      `}
      title={collapsed ? label : undefined}
    >
      <span className="text-lg shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {(badge ?? 0) > 0 && (
        <span className={`ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ${collapsed ? 'absolute top-1 right-1' : ''}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ href, icon, label, active, highlight, badge }: {
  href: string; icon: string; label: string; active: boolean; highlight?: boolean; badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`
        relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl
        transition-all duration-150 min-w-[56px]
        ${highlight
          ? 'text-brand-400'
          : active
            ? 'text-brand-400'
            : 'text-surface-400 dark:text-surface-500 hover:text-white'
        }
      `}
    >
      <span className={`text-xl ${active || highlight ? 'scale-110' : ''} transition-transform`}>{icon}</span>
      {(badge ?? 0) > 0 && (
        <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <span className="text-[10px] font-semibold">{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-brand-500" />}
    </Link>
  );
}
