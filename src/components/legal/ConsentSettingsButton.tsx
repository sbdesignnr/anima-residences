"use client";

import { openConsentSettings } from "@/lib/consent";

/** Opens the cookie settings panel from anywhere (footer link, cookie page). */
export default function ConsentSettingsButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={openConsentSettings}>
      {children}
    </button>
  );
}
