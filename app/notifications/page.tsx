'use client';
// app/notifications/page.tsx
// Centro de notificaciones (S15): recordatorios pendientes por
// urgencia, con envío por WhatsApp (wa.me) y email (Resend/mailto).

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, EmptyState } from '@/components/ui/Badge';
import { useReminders, updateReminderEstado, runScanNow } from '@/hooks/useReminders';
import { buildWhatsAppLink, buildMensajeRecordatorio, buildEmailRecordatorio } from '@/lib/notifications/messages';
import { logNotification } from '@/lib/notifications/log';
import type { Reminder } from '@/types';

export default function NotificationsPage() {
  const { reminders, loading, refetch } = useReminders('pendiente');
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    const result = await runScanNow();
    setScanning(false);
    if (result.error) toast(result.error, 'error');
    else {
      toast(result.creados > 0
        ? `Se encontraron ${result.creados} recordatorio${result.creados !== 1 ? 's' : ''} nuevo${result.creados !== 1 ? 's' : ''}`
        : 'Sin recordatorios nuevos', 'success');
    }
    refetch();
  };

  const marcarEnviado = async (r: Reminder, canal: 'whatsapp' | 'email') => {
    setBusyId(r.id);
    await updateReminderEstado(r.id, 'enviado', canal);
    await logNotification({
      reminderId: r.id,
      canal,
      destino: canal === 'whatsapp' ? (r.tutor?.telefono ?? '') : (r.tutor?.email ?? ''),
      estado: 'enviado',
      detalle: `Marcado como enviado desde el centro de notificaciones (${canal})`,
    });
    setBusyId(null);
    toast('Marcado como enviado', 'success');
    refetch();
  };

  const descartar = async (r: Reminder) => {
    setBusyId(r.id);
    await updateReminderEstado(r.id, 'descartado');
    setBusyId(null);
    toast('Recordatorio descartado', 'info');
    refetch();
  };

  const sendWhatsApp = (r: Reminder) => {
    const url = buildWhatsAppLink(r.tutor?.telefono, buildMensajeRecordatorio(r));
    if (!url) { toast('El tutor no tiene teléfono válido para WhatsApp', 'error'); return; }
    window.open(url, '_blank');
  };

  const sendEmail = async (r: Reminder) => {
    const email = r.tutor?.email;
    if (!email) { toast('El tutor no tiene email registrado', 'error'); return; }

    const { subject, html } = buildEmailRecordatorio(r);
    const body = buildMensajeRecordatorio(r);

    setBusyId(r.id);
    const res = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, body, html, reminderId: r.id }),
    });
    const json = (await res.json()) as { ok?: boolean; simulated?: boolean; error?: string };
    setBusyId(null);

    if (json.simulated) {
      // Sin Resend configurado → mailto:
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast('Abriendo el correo (Resend no configurado)', 'info');
    } else if (json.ok) {
      await logNotification({ reminderId: r.id, canal: 'email', destino: email, estado: 'enviado', detalle: 'Enviado vía Resend' });
      toast('Email enviado', 'success');
    } else {
      toast(json.error ?? 'Error al enviar el email', 'error');
    }
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencidos = reminders.filter(r => new Date(r.fecha_evento).getTime() < hoy.getTime());
  const proximos = reminders.filter(r => new Date(r.fecha_evento).getTime() >= hoy.getTime());

  if (loading) return <PageLoader />;

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-surface-800">Notificaciones</h1>
          <p className="text-xs text-surface-400">{reminders.length} pendiente{reminders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-bold transition-colors shadow-md shadow-brand-500/20"
        >
          {scanning ? '⏳ Escaneando...' : '🔍 Chequear ahora'}
        </button>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto space-y-6">
        {reminders.length === 0 ? (
          <EmptyState icon="🔕" title="Sin notificaciones pendientes"
            subtitle="Cuando se acerque una vacuna o un examen, aparecerá aquí para avisar al cliente." />
        ) : (
          <>
            {vencidos.length > 0 && (
              <Group title={`🔴 Vencidos (${vencidos.length})`}>
                {vencidos.map(r => <ReminderCard key={r.id} r={r} busy={busyId === r.id}
                  onWhatsApp={() => sendWhatsApp(r)}
                  onEmail={() => sendEmail(r)}
                  onMarcar={() => marcarEnviado(r, 'whatsapp')}
                  onDescartar={() => descartar(r)} />)}
              </Group>
            )}
            {proximos.length > 0 && (
              <Group title={`🟠 Próximos (${proximos.length})`}>
                {proximos.map(r => <ReminderCard key={r.id} r={r} busy={busyId === r.id}
                  onWhatsApp={() => sendWhatsApp(r)}
                  onEmail={() => sendEmail(r)}
                  onMarcar={() => marcarEnviado(r, 'whatsapp')}
                  onDescartar={() => descartar(r)} />)}
              </Group>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-black text-surface-700 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReminderCard({ r, busy, onWhatsApp, onEmail, onMarcar, onDescartar }: {
  r: Reminder;
  busy: boolean;
  onWhatsApp: () => void;
  onEmail: () => void;
  onMarcar: () => void;
  onDescartar: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm text-surface-800">{r.titulo}</p>
          <p className="text-xs text-surface-500">
            🐾 {r.patient?.nombre} · 👤 {r.tutor?.nombre}
          </p>
          <p className="text-xs text-surface-400">
            📅 {new Date(r.fecha_evento).toLocaleDateString('es-VE')}
            {r.descripcion && <span className="block">{r.descripcion}</span>}
          </p>
        </div>
        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 font-bold uppercase">
          {r.tipo}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={onWhatsApp} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors disabled:opacity-50">
          📲 WhatsApp
        </button>
        <button onClick={onEmail} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs font-semibold transition-colors disabled:opacity-50">
          ✉️ Email
        </button>
        <div className="flex-1" />
        <button onClick={onMarcar} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
          ✓ Marcar enviado
        </button>
        <button onClick={onDescartar} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-colors disabled:opacity-50">
          Descartar
        </button>
      </div>
    </div>
  );
}
