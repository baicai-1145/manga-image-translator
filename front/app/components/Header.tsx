import { Disclosure } from "@headlessui/react";
import React from "react";
import { useI18n, type SupportedLanguage } from "@/i18n";

type Props = {
  userId: string;
  onUserIdChange: (value: string) => void;
};

export const Header: React.FC<Props> = ({ userId, onUserIdChange }) => {
  const { t, language, setLanguage, languages } = useI18n();

  return (
    <Disclosure as="nav" className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex flex-col gap-2 sm:flex-row sm:h-16 sm:items-center sm:justify-between py-3 sm:py-0">
          <div className="flex flex-1 items-center justify-between sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center text-teal-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-8 w-auto text-teal-500"
              >
                <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
              </svg>
            </div>
            <div className="sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="/"
                className="inline-flex items-center px-1 pt-1 font-medium text-gray-900"
              >
                {t("app.title")}
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="language" className="text-sm text-gray-600">
                {t("header.language")}
              </label>
              <select
                id="language"
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as SupportedLanguage)
                }
              >
                {languages.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="userId" className="text-sm text-gray-600">
                {t("header.userId")}
              </label>
              <input
                id="userId"
                value={userId}
                onChange={(event) => onUserIdChange(event.target.value)}
                placeholder={t("header.userIdPlaceholder")}
                className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </Disclosure>
  );
};
