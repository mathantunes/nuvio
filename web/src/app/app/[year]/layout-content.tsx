"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "./mobile-nav";

type LayoutContentProps = {
  children: React.ReactNode;
  budgetYear: number;
};

export function LayoutContent({ children, budgetYear }: LayoutContentProps) {
  const pathname = usePathname();

  return (
    <>
      <MobileNav year={budgetYear} currentPath={pathname} />
      {children}
    </>
  );
}
