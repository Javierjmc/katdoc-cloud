'use client';
// app/notifications/page.tsx
// Centro de notificaciones (S15 + S24): recordatorios pendientes por
// urgencia + pestaña de seguimiento para clientes que no respondieron.

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, EmptyState } from '@/components/ui/Badge';
import { useReminders, updateReminderEstado, runScanNow } from '@/hooks/useReminders';
import { useNotificationLog } from '@/hooks/useNotificationLog';
import { buildWhatsAppLink, buildMensajeRecordatorio, buildEmailRecordatorio } from '@/lib/notifications/messages';
import { logNotification } from '@/lib/notifications/log';
import { appPinHeader } from '@/lib/api-auth';
import type { Reminder } from '@/types';

type Tab = 'pendientes' | 'seguimiento';

export default function NotificationsPage() {
  const { reminders, loading, refetch } = useReminders('pendiente');
  const { reminders: seguimiento, loading: segLoading, refetch: refetchSeg } = useReminders('seguimiento');
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('pendientes');
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refreshAll = () => { refetch(); refetchSeg(); };

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
    refreshAll();
  };

  const setEstado = async (r: Reminder, estado: Reminder['estado'], canal?: 'whatsapp' | 'email') => {
    setBusyId(r.id);
    await updateReminderEstado(r.id, estado, canal);
    setBusyId(null);
    refreshAll();
  };

  const marcarEnviado = async (r: Reminder, canal: 'whatsapp' | 'email') => {
    await setEstado(r, 'enviado', canal);
    await logNotification({
      reminderId: r.id,
      canal,
      destino: canal === 'whatsapp' ? (r.tutor?.telefono ?? '') : (r.tutor?.email ?? ''),
      estado: 'enviado',
      detalle: `Marcado como enviado desde el centro de notificaciones (${canal})`,
    });
    toast('Marcado como enviado', 'success');
  };

  const marcarSinRespuesta = async (r: Reminder) => {
    await setEstado(r, 'seguimiento', r.canal as 'whatsapp' | 'email' | undefined);
    await logNotification({
      reminderId: r.id,
      canal: (r.canal as 'whatsapp' | 'email') ?? 'whatsapp',
      destino: (r.canal === 'email' ? r.tutor?.email : r.tutor?.telefono) ?? '',
      estado: 'sin_respuesta',
      detalle: 'Marcado como sin respuesta — se pasa a seguimiento',
    });
    toast('En seguimiento: re-contactar al cliente', 'info');
  };

  const volverPendiente = async (r: Reminder) => {
    await setEstado(r, 'pendiente');
    toast('De vuelta a pendientes', 'info');
  };

  const descartar = async (r: Reminder) => {
    await setEstado(r, 'descartado');
    toast('Recordatorio descartado', 'info');
  };

  const sendWhatsApp = (r: Reminder) => {
    const url = buildWhatsAppLink(r.tutor?.telefono, buildMensajeRecordatorio(r));
    if (!url) { toast('El tutor no tiene teléfono válido para WhatsApp', 'error'); return; }
    logNotification({
      reminderId: r.id,
      canal: 'whatsapp',
      destino: r.tutor?.telefono ?? '',
      estado: 'enviado',
      detalle: 'Enlace WhatsApp abierto (manual)',
    });
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
      headers: { 'Content-Type': 'application/json', ...appPinHeader() },
      body: JSON.stringify({ to: email, subject, body, html, reminderId: r.id }),
    });
    const json = (await res.json()) as { ok?: boolean; simulated?: boolean; error?: string };
    setBusyId(null);

    if (json.simulated) {
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

  const loadingTab = tab === 'pendientes' ? loading : segLoading;

  if (loadingTab) return <PageLoader />;

  return (
    <AppShell>
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-surface-800 dark:text-white">Notificaciones</h1>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            {tab === 'pendientes'
              ? `${reminders.length} pendiente${reminders.length !== 1 ? 's' : ''}`
              : `${seguimiento.length} en seguimiento`}
          </p>
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
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl p-1 w-fit">
          <TabButton active={tab === 'pendientes'} onClick={() => setTab('pendientes')} label={`Pendientes${reminders.length ? ` (${reminders.length})` : ''}`} />
          <TabButton active={tab === 'seguimiento'} onClick={() => setTab('seguimiento')} label={`Seguimiento${seguimiento.length ? ` (${seguimiento.length})` : ''}`} />
        </div>

        {tab === 'pendientes' ? (
          reminders.length === 0 ? (
            <EmptyState icon="🔕" title="Sin notificaciones pendientes"
              subtitle="Cuando se acerque una vacuna, un examen o una cita, aparecerá aquí para avisar al cliente." />
          ) : (
            <>
              {vencidos.length > 0 && (
                <Group title={`🔴 Vencidos (${vencidos.length})`}>
                  {vencidos.map(r => <ReminderCard key={r.id} r={r} busy={busyId === r.id}
                    onWhatsApp={() => sendWhatsApp(r)}
                    onEmail={() => sendEmail(r)}
                    onMarcar={() => marcarEnviado(r, 'whatsapp')}
                    onSinRespuesta={() => marcarSinRespuesta(r)}
                    onDescartar={() => descartar(r)} />)}
                </Group>
              )}
              {proximos.length > 0 && (
                <Group title={`🟠 Próximos (${proximos.length})`}>
                  {proximos.map(r => <ReminderCard key={r.id} r={r} busy={busyId === r.id}
                    onWhatsApp={() => sendWhatsApp(r)}
                    onEmail={() => sendEmail(r)}
                    onMarcar={() => marcarEnviado(r, 'whatsapp')}
                    onSinRespuesta={() => marcarSinRespuesta(r)}
                    onDescartar={() => descartar(r)} />)}
                </Group>
              )}
            </>
          )
        ) : seguimiento.length === 0 ? (
          <EmptyState icon="📞" title="Sin clientes en seguimiento"
            subtitle="Cuando marques un recordatorio como 'Sin respuesta', aparecerá aquí para re-contactarlo." />
        ) : (
          <div className="space-y-2">
            {seguimiento.map(r => (
              <SeguimientoCard key={r.id} r={r} busy={busyId === r.id}
                onWhatsApp={() => sendWhatsApp(r)}
                onEmail={() => sendEmail(r)}
                onMarcar={() => marcarEnviado(r, 'whatsapp')}
                onVolver={() => volverPendiente(r)}
                onDescartar={() => descartar(r)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${active ? 'bg-white dark:bg-surface-800 text-surface-800 dark:text-white shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'}`}
    >
      {label}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-black text-surface-700 dark:text-surface-200 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 font-bold uppercase">
      {tipo}
    </span>
  );
}

function ReminderCard({ r, busy, onWhatsApp, onEmail, onMarcar, onSinRespuesta, onDescartar }: {
  r: Reminder;
  busy: boolean;
  onWhatsApp: () => void;
  onEmail: () => void;
  onMarcar: () => void;
  onSinRespuesta: () => void;
  onDescartar: () => void;
}) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm text-surface-800 dark:text-white">{r.titulo}</p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            🐾 {r.patient?.nombre} · 👤 {r.tutor?.nombre}
          </p>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            📅 {new Date(r.fecha_evento).toLocaleDateString('es-VE')}
            {r.descripcion && <span className="block">{r.descripcion}</span>}
          </p>
        </div>
        <TipoBadge tipo={r.tipo} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={onWhatsApp} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors disabled:opacity-50">
          📲 WhatsApp
        </button>
        <button onClick={onEmail} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold transition-colors disabled:opacity-50">
          ✉️ Email
        </button>
        <div className="flex-1" />
        <button onClick={onMarcar} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
          ✓ Enviado
        </button>
        <button onClick={onSinRespuesta} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-semibold transition-colors disabled:opacity-50">
          ⏰ Sin respuesta
        </button>
        <button onClick={onDescartar} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-colors disabled:opacity-50">
          Descartar
        </button>
      </div>
    </div>
  );
}

function SeguimientoCard({ r, busy, onWhatsApp, onEmail, onMarcar, onVolver, onDescartar }: {
  r: Reminder;
  busy: boolean;
  onWhatsApp: () => void;
  onEmail: () => void;
  onMarcar: () => void;
  onVolver: () => void;
  onDescartar: () => void;
}) {
  const dias = r.fecha_seguimiento
    ? Math.max(0, Math.floor((new Date().getTime() - new Date(r.fecha_seguimiento).getTime()) / 86400000))
    : 0;

  const { logs, loading: logsLoading, refetch: refetchLogs } = useNotificationLog(r.id);
  const [showHistorial, setShowHistorial] = useState(false);

  useEffect(() => {
    if (r.fecha_envio || r.fecha_seguimiento) refetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.fecha_envio, r.fecha_seguimiento, r.estado]);

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-yellow-200 shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm text-surface-800 dark:text-white">{r.titulo}</p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            🐾 {r.patient?.nombre} · 👤 {r.tutor?.nombre}
          </p>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            📅 {new Date(r.fecha_evento).toLocaleDateString('es-VE')}
            {r.descripcion && <span className="block">{r.descripcion}</span>}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${dias >= 2 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
          {dias} día{dias !== 1 ? 's' : ''} sin respuesta
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={onWhatsApp} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors disabled:opacity-50">
          📲 Re-enviar WhatsApp
        </button>
        <button onClick={onEmail} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold transition-colors disabled:opacity-50">
          ✉️ Email
        </button>
        <div className="flex-1" />
        <button onClick={onMarcar} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
          ✓ Respondió
        </button>
        <button onClick={onVolver} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold transition-colors disabled:opacity-50">
          ↺ Pendiente
        </button>
        <button onClick={onDescartar} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-colors disabled:opacity-50">
          Descartar
        </button>
      </div>

      {/* Historial de intentos */}
      <div className="border-t border-surface-100 dark:border-surface-800 pt-2">
        <button
          onClick={() => setShowHistorial(h => !h)}
          className="text-xs font-bold text-surface-500 dark:text-surface-400 hover:text-brand-600 transition-colors flex items-center gap-1"
        >
          {showHistorial ? '▾' : '▸'} Historial de intentos ({logsLoading ? '…' : logs.length})
        </button>

        {showHistorial && (
          <div className="mt-2 space-y-1.5">
            {logs.length === 0 ? (
              <p className="text-xs text-surface-400 dark:text-surface-500 py-1">Sin intentos registrados.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${log.estado === 'enviado' ? 'bg-green-500' : log.estado === 'sin_respuesta' ? 'bg-yellow-500' : log.estado === 'error' ? 'bg-red-500' : 'bg-surface-300 dark:bg-surface-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-700 dark:text-surface-200 font-semibold capitalize">
                      {log.estado === 'sin_respuesta' ? 'Sin respuesta' : log.estado}
                      {log.canal && <span className="text-surface-400 dark:text-surface-500 font-normal"> · {log.canal === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>}
                    </p>
                    {log.detalle && <p className="text-surface-400 dark:text-surface-500">{log.detalle}</p>}
                  </div>
                  <span className="text-surface-400 dark:text-surface-500 shrink-0">
                    {new Date(log.created_at).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
