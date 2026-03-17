export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS_PUBLIC: NavItem[] = [
  { href: "/about", label: "소개" },
  { href: "/reviews", label: "후기" },
  { href: "/pricing", label: "구매" },
];

export const NAV_ITEMS_AUTH: NavItem[] = [
  { href: "/teacher", label: "선생님 모드" },
  { href: "/community", label: "커뮤니티" },
  { href: "/pricing", label: "구매" },
];
