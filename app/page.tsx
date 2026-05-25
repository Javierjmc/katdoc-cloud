// app/page.tsx
// Redirige la raíz al dashboard
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
