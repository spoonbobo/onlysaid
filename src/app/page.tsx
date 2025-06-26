"use client";

import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("DashboardPage");
  return (
    <div>
      <h1>{t("dashboard")}</h1>
    </div>
  );
}
