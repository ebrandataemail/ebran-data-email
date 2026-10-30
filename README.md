# Ebran Data Email

Aku butuh Tools untuk Membantuku Mengelola Semua Aset hingg Akun Digital. Act as an Build a modern, responsive Dashboard UI using React, TypeScript, Tailwind CSS, Lucide Icons, and Shadcn UI components. The design must be in Light Mode, featuring a clean, enterprise-grade aesthetic with white backgrounds.

Since this UI will be powered by an AI backend (Lovable AI), include AI-themed visual cues (like sparkle icons, AI badges) in specific areas.

Use this exact layout and data structure:

1. GLOBAL LAYOUT
   Create a standard dashboard layout with a Left Sidebar (w-64, fixed) and a Right Main Content Area.

2. LEFT SIDEBAR

- Header: App Logo and Name "Ebran Aset Digital - Arsip Data Pribadi Aman".
- Global Search/Command Bar: Instead of a normal search, make it look like an AI Command Bar. Placeholder: "✨ Tanya AI atau Cari (Cmd+K)".
- Navigation Section 1: "PROYEK & CLIENT". List items: "Content Center Web Salute Malang", "SocioAPI Playground", "Sultan Barokah", "Internal / Pribadi".
- Navigation Section 2: "KATEGORI". List items: "Email (Core)", "Developer Tools", "Social Media", "Ads & Marketing". Use appropriate Lucide icons.
- Navigation Section 3: "TAGS". Show badge-style tags: "#Production", "#Banned", "#Urgent".

3. MAIN CONTENT AREA (Asset Detail View)
   Simulate viewing the detail page for "Instagram - Newton Badminton".

- Sticky Top Header:
  - Left: A large Avatar/Icon for Instagram, Title "Instagram - Newton Badminton", a green badge "Active", and a clickable Public URL "instagram.com/newtonbadminton".
  - Right: "Edit Aset" button.
  - Bottom of Header (Quick Actions): Username "greygandaw123" [Copy icon], Password "*********" [Show icon] [Copy icon], and a "Link Login" shortcut button.

- Content Tabs (Use Shadcn Tabs):
  Create 5 tabs: "Info Profil", "Keamanan & Recovery", "API & Developer", "Ops & Status", "Attachments".

- Tab 1: Info Profil
  - Role/Akses: Super Admin
  - Email Login: newton@gmail.com [Copy]
  - No. HP Terhubung: +62 812-3456-7890
  - WhatsApp Terhubung: +62 812-3456-7890 [Chat Icon]
  - Deskripsi / Note: A text area box. Above the box, add a small ghost button with a sparkle icon: "✨ AI Auto-Generate Notes". Inside the box: "Akun dipakai untuk posting jadwal mabar tiap Sabtu di GOR Galaxi."

- Tab 2: Keamanan & Recovery
  - Email Pemulihan: greygandaw@gmail.com
  - App Authenticator: Google Authenticator
  - Live 2FA Code: Make this look highly dynamic. Display "452 891" with a small circular countdown progress indicator next to it.
  - TOTP Secret Key: "*************" [Unmask icon]
  - Backup Codes: Render inside a monospace code block.
  - Add a secondary button at the bottom: "🛡️ Run AI Security Audit".

- Tab 3: API & Developer
  - Public API Key: "pk_live_12345..." [Copy icon]
  - Secret Token: "sk_live_********" [Unmask icon] [Copy icon]
  - Webhook URL: "https://socioapi.com/webhook"
  - Expiration Date: "12-Desember-2026" (with a yellow warning badge).
  - Big primary button at the bottom: "✨ AI Format & Copy as .env"

- Tab 4: Ops & Status
  - Status Akun: Active
  - IP / Proxy: 192.168.1.x (ID/Malang)
  - Billing Tag: Visa - 4242
  - Creation Date: 15 Agustus 2024

- Tab 5: Attachments (AI Document Scanner)
  - Include a dashed-border drag-and-drop zone. Add text: "Drag & Drop files here. ✨ AI will automatically extract data (OCR)."
  - Below it, list 2 dummy files ("invoice-newton.pdf", "ktp-verifikasi.jpg") with file icons, a "Processing ✨" badge on one of them, and view/delete action buttons.

Make sure the UI is pixel-perfect, uses nice subtle borders, hover states for buttons, and feels like a production-ready SaaS dashboard. Build the interactive frontend components (tabs, buttons, hover states) without actual backend logic yet.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ebran-data-email.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a5e3fe3-3edd-4d12-88a3-c9e8cf7dc58c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
