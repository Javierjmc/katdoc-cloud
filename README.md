# 🐾 VetCare Pro — Sistema de Historias Clínicas Veterinarias

> Aplicación web mobile-first para la gestión de historias clínicas veterinarias, construida con **Next.js 14 (App Router)**, **Tailwind CSS** y **Supabase**.

---

## 📋 Índice

1. [Requisitos previos](#requisitos-previos)
2. [Configuración de Supabase](#configuración-de-supabase)
3. [Configuración del entorno local](#configuración-del-entorno-local)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Guía de despliegue en Vercel](#guía-de-despliegue-en-vercel)
6. [Cómo extender la aplicación](#cómo-extender-la-aplicación)

---

## Requisitos previos

- Node.js 18.17 o superior
- Una cuenta gratuita en [supabase.com](https://supabase.com)
- Una cuenta en [vercel.com](https://vercel.com) (para despliegue)
- Git

---

## 1. Configuración de Supabase

### 1.1 Crear el proyecto

1. Entra a [app.supabase.com](https://app.supabase.com) e inicia sesión.
2. Haz clic en **"New Project"**.
3. Elige un nombre (ej: `vetcare-pro`), una contraseña de base de datos segura y la región más cercana (ej: `South America - São Paulo`).
4. Espera ~2 minutos a que el proyecto se inicialice.

### 1.2 Ejecutar el esquema SQL

1. En el menú lateral, ve a **SQL Editor**.
2. Haz clic en **"New Query"**.
3. Copia y pega el contenido completo del archivo `supabase_schema.sql` (en la raíz del proyecto).
4. Haz clic en **"Run"** (▶).
5. Verifica que no haya errores. Deberías ver mensajes de éxito para cada tabla e índice.

**¿Qué crea el esquema?**
- Tabla `tutors` (propietarios)
- Tabla `patients` (mascotas) con FK a `tutors`
- Tabla `medical_records` (historias clínicas) con FK a `patients`
- Una vista `dashboard_search` para consultas optimizadas del dashboard
- Una función `generate_numero_historia()` para números correlativos
- Índices de rendimiento en todos los campos de búsqueda frecuente

### 1.3 Crear los Buckets de Storage

1. En el menú lateral, ve a **Storage**.
2. Haz clic en **"New Bucket"**.

**Bucket 1: `pet-photos`**
- Name: `pet-photos`
- Marca: ✅ Public bucket
- Haz clic en **Save**.

**Bucket 2: `medical-documents`**
- Name: `medical-documents`
- Marca: ✅ Public bucket
- Haz clic en **Save**.

### 1.4 Configurar políticas de Storage (RLS)

Para cada bucket, agrega las siguientes políticas:

1. Ve a **Storage** → selecciona el bucket → pestaña **Policies**.
2. Haz clic en **"Add policy"** → selecciona **"Custom policy"**.

**Para `pet-photos`:**

```sql
-- Política 1: Lectura pública
CREATE POLICY "Public read pet photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pet-photos' );

-- Política 2: Inserción desde cliente
CREATE POLICY "Client insert pet photos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'pet-photos' );

-- Política 3: Actualización (para reemplazar fotos)
CREATE POLICY "Client update pet photos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'pet-photos' );
```

**Para `medical-documents`:**

```sql
-- Política 1: Lectura pública
CREATE POLICY "Public read medical docs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'medical-documents' );

-- Política 2: Inserción desde cliente
CREATE POLICY "Client insert medical docs"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'medical-documents' );
```

> **Nota de seguridad:** Estas políticas permiten acceso público de lectura. Para un entorno de producción con múltiples clínicas independientes, se recomienda implementar Supabase Auth y políticas RLS basadas en el `user_id`.

### 1.5 Obtener las claves de API

1. Ve a **Settings** (engranaje) → **API**.
2. Copia los siguientes valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Configuración del Entorno Local

### 2.1 Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/vetcare-pro.git
cd vetcare-pro
```

### 2.2 Instalar dependencias

```bash
npm install
```

### 2.3 Crear el archivo de variables de entorno

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.local.example .env.local
```

Abre `.env.local` y rellena los valores:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# PIN de acceso (4 dígitos)
NEXT_PUBLIC_APP_PIN=1234
```

> ⚠️ **Importante:** Nunca subas `.env.local` a Git. Está en `.gitignore` por defecto.

### 2.4 Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Serás redirigido a `/login`.

### 2.5 Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Compila la aplicación para producción |
| `npm run start` | Inicia el servidor de producción local |
| `npm run lint` | Ejecuta ESLint para detectar errores de código |

---

## 3. Estructura del Proyecto

```
vetcare-pro/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout raíz con metadatos PWA
│   ├── globals.css               # Estilos globales + Tailwind
│   ├── login/
│   │   └── page.tsx              # 🔐 Pantalla de PIN
│   ├── dashboard/
│   │   └── page.tsx              # 📊 Dashboard con búsqueda
│   ├── patients/
│   │   ├── new/page.tsx          # ➕ Crear nuevo paciente
│   │   └── [id]/page.tsx         # 👤 Perfil del paciente
│   └── records/
│       ├── new/page.tsx          # ➕ Nueva historia clínica
│       └── [id]/page.tsx         # 📋 Ver/editar historia
│
├── components/                   # Componentes reutilizables
│   ├── MedicalRecordForm.tsx     # 📝 Formulario principal (CLAVE)
│   ├── PatientForm.tsx           # Formulario de paciente
│   └── ui/                       # Componentes UI primitivos
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Badge.tsx
│
├── lib/
│   └── supabase.ts               # Cliente Supabase + helpers de Storage
│
├── types/
│   └── index.ts                  # Tipos TypeScript + SISTEMAS_CONFIG
│
├── hooks/                        # Custom React Hooks
│   ├── usePatients.ts
│   └── useMedicalRecords.ts
│
├── middleware.ts                 # Protección de rutas
├── supabase_schema.sql           # Esquema completo de BD
├── .env.local.example            # Plantilla de variables de entorno
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 4. Guía de Despliegue en Vercel

### 4.1 Subir el código a GitHub

```bash
git init
git add .
git commit -m "feat: initial VetCare Pro setup"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/vetcare-pro.git
git push -u origin main
```

### 4.2 Importar el proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** → **"Project"**.
3. Busca y selecciona el repositorio `vetcare-pro`.
4. Haz clic en **"Import"**.

### 4.3 Configurar variables de entorno en Vercel

**Este es el paso más crítico.** En la pantalla de configuración del proyecto, antes de hacer clic en "Deploy":

1. Despliega la sección **"Environment Variables"**.
2. Agrega cada variable una por una:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://TU_PROJECT_ID.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu clave anon de Supabase |
| `NEXT_PUBLIC_APP_PIN` | Tu PIN de 4 dígitos (ej: `5678`) |

3. Asegúrate de que el **Environment** esté marcado como `Production`, `Preview` y `Development`.

### 4.4 Desplegar

1. Haz clic en **"Deploy"**.
2. Vercel compilará y desplegará tu aplicación automáticamente.
3. En ~2 minutos, recibirás una URL como `vetcare-pro.vercel.app`.

### 4.5 Despliegues automáticos (CI/CD)

Desde este momento, cada vez que hagas `git push` a la rama `main`, Vercel **re-desplegará automáticamente** tu aplicación. Los pushes a otras ramas crean **Preview Deployments** con URLs únicas para pruebas.

### 4.6 Dominio personalizado (opcional)

1. Ve a tu proyecto en Vercel → **Settings** → **Domains**.
2. Agrega tu dominio (ej: `historias.tuvet.com`).
3. Configura los registros DNS según las instrucciones de Vercel.

---

## 5. Cómo Extender la Aplicación

### Añadir un nuevo sistema clínico al checklist

**Solo necesitas editar un archivo:**

```typescript
// types/index.ts — Agrega al array SISTEMAS_CONFIG:
{ key: 'endocrino', label: 'Sistema Endocrino', icon: '⚗️' },
```

El formulario, el JSONB y la UI se actualizan automáticamente. No se necesita migración SQL.

### Añadir un nuevo campo a una historia clínica

1. **SQL:** Agrega la columna en Supabase → SQL Editor:
   ```sql
   ALTER TABLE medical_records ADD COLUMN nuevo_campo TEXT;
   ```
2. **Tipo:** Añade `nuevo_campo?: string` a la interfaz `MedicalRecord` en `types/index.ts`.
3. **Formulario:** Añade un `<Field>` + `<Input>` en `MedicalRecordForm.tsx` dentro de la sección correspondiente.

### Cambiar el PIN de acceso

1. En Vercel → tu proyecto → **Settings** → **Environment Variables**.
2. Edita `NEXT_PUBLIC_APP_PIN` con el nuevo valor.
3. Vercel re-desplegará automáticamente.

---

## Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|---|---|---|
| Next.js | 14.x | Framework full-stack, App Router |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 3.x | Estilos utility-first + dark mode |
| Supabase | 2.x | Base de datos PostgreSQL + Storage |
| @supabase/supabase-js | 2.x | SDK cliente de Supabase |

---

## Licencia

MIT — Uso libre para clínicas veterinarias.
