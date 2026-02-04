import { en } from "./messages/en";

export type SupportedLocale = "en";

const messagesByLocale = {
  en,
} as const;

export const getMessages = (locale: SupportedLocale = "en") => {
  return messagesByLocale[locale];
};

