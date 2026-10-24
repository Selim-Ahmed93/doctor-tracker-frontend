import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: {
    default: "Doctor Tracker",
    template: "%s | Doctor Tracker",
  },
  description:
    "Admin console for tracking doctors, patients, and patient assignments.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
