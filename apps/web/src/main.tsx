import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import DashboardPage from "@/app/[locale]/dashboard/page";
import "@/app/globals.css";
import { ServiceWorkerRegister } from "@/components/common";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { AuthGuard } from "@/components/features/auth/auth-guard";
import {
  NextIntlClientProvider,
  getMessages,
} from "@/compat/next-intl";
import {
  defaultLocale,
  isLocale,
  type AppLocale,
} from "@/i18n/routing";

function getInitialLocale(): AppLocale {
  if (typeof navigator === "undefined") {
    return defaultLocale;
  }

  const preferred = navigator.language.toLowerCase();
  return preferred.startsWith("zh") ? "zh" : "en";
}

function LocaleApp({ locale }: { locale: AppLocale }) {
  return (
    <NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryProvider>
          <AuthProvider>
            <AuthGuard />
            <DashboardPage />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
      <ServiceWorkerRegister />
      <Toaster position="top-center" />
    </NextIntlClientProvider>
  );
}

function LocaleRoute() {
  const { locale } = useParams();

  if (!isLocale(locale)) {
    return <Navigate to={`/${defaultLocale}/dashboard`} replace />;
  }

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = "Neko Master";
  }, [locale]);

  return <LocaleApp locale={locale} />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={`/${getInitialLocale()}/dashboard`} replace />}
        />
        <Route
          path="/:locale"
          element={<LocaleIndexRedirect />}
        />
        <Route path="/:locale/dashboard" element={<LocaleRoute />} />
        <Route
          path="*"
          element={<Navigate to={`/${defaultLocale}/dashboard`} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

function LocaleIndexRedirect() {
  const { locale } = useParams();
  return (
    <Navigate
      to={
        isLocale(locale) ? `/${locale}/dashboard` : `/${defaultLocale}/dashboard`
      }
      replace
    />
  );
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing root element");
}

createRoot(container).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
