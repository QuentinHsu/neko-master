"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";
import type { AppLocale } from "@/i18n/routing";

type Messages = Record<string, unknown>;
type TranslationValues = Record<string, string | number>;
type Translator = ((key: string, values?: TranslationValues) => string) & {
  rich: (key: string, values?: TranslationValues) => string;
  markup: (key: string, values?: TranslationValues) => string;
  raw: (key: string) => unknown;
  has: (key: string) => boolean;
};

interface IntlContextValue {
  locale: AppLocale;
  messages: Messages;
}

const ALL_MESSAGES = {
  en: enMessages,
  zh: zhMessages,
} satisfies Record<AppLocale, Messages>;

const IntlContext = createContext<IntlContextValue | null>(null);

function resolvePath(messages: Messages, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, messages);
}

function formatMessage(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function getContext(): IntlContextValue {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error("next-intl compatibility provider is missing");
  }
  return context;
}

export function getMessages(locale: AppLocale): Messages {
  return ALL_MESSAGES[locale];
}

export function NextIntlClientProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: AppLocale;
  messages: Messages;
}) {
  const value = useMemo(
    () => ({
      locale,
      messages,
    }),
    [locale, messages],
  );

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useLocale(): AppLocale {
  return getContext().locale;
}

export function useTranslations(namespace?: string): Translator {
  const { messages } = getContext();

  return useMemo(() => {
    const getMessage = (key: string): unknown =>
      resolvePath(messages, namespace ? `${namespace}.${key}` : key);

    const translate = ((key: string, values?: TranslationValues) => {
      const message = getMessage(key);
      if (typeof message === "string") {
        return formatMessage(message, values);
      }
      return namespace ? `${namespace}.${key}` : key;
    }) as Translator;

    translate.rich = translate;
    translate.markup = translate;
    translate.raw = (key: string) => getMessage(key);
    translate.has = (key: string) => typeof getMessage(key) === "string";

    return translate;
  }, [messages, namespace]);
}
