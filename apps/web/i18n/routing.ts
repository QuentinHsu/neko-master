import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

export const locales = ["en", "zh"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "zh";

export const routing = {
  locales,
  defaultLocale,
};

export function isLocale(value: string | undefined): value is AppLocale {
  return !!value && locales.includes(value as AppLocale);
}

export function getMessages(locale: AppLocale) {
  return locale === "zh" ? zhMessages : enMessages;
}
