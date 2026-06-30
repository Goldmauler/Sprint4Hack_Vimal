"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Workspaces", href: "/", icon: "list_alt" },
  { label: "Archives", href: "/archives", icon: "inventory_2" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarContent?: React.ReactNode;
}

export function AppShell({ children, showSidebar = true, sidebarContent }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9ff]">
      {/* Header */}
      <header className="h-16 border-b border-[#c7c4d7] bg-[#f8f9ff] fixed top-0 w-full z-50 flex items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4338ca] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">shield</span>
            </div>
            <span className="font-bold text-xl text-[#2a14b4] tracking-tight font-['Inter']">
              LexRedact
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-[#2a14b4] font-semibold bg-[#e3dfff]"
                      : "text-[#464554] hover:bg-[#e5eeff]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-[#dce9ff] rounded-full transition-colors text-[#464554]">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button className="p-2 hover:bg-[#dce9ff] rounded-full transition-colors text-[#464554]">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#4338ca] flex items-center justify-center text-white text-xs font-bold">
            SM
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        {showSidebar && (
          <aside className="w-[260px] bg-[#eff4ff] border-r border-[#c7c4d7] flex-col p-4 overflow-y-auto shrink-0 hidden md:flex">
            {sidebarContent || <DefaultSidebar pathname={pathname} />}
          </aside>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function DefaultSidebar({ pathname }: { pathname: string }) {
  const sidebarLinks = [
    { label: "Queue", href: "/", icon: "list_alt" },
    { label: "Documents", href: "/documents", icon: "description" },
    { label: "Templates", href: "/templates", icon: "layers" },
    { label: "Compliance", href: "/audit-log", icon: "security" },
    { label: "Team", href: "/team", icon: "group" },
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-5 p-2">
        <div className="w-9 h-9 rounded-lg bg-[#4338ca] flex items-center justify-center text-white text-xs font-bold">
          LR
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#0b1c30]">Current Workspace</h3>
          <p className="text-[11px] text-[#464554]">Legal Review Alpha</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "bg-[#e3dfff] text-[#2a14b4] font-semibold"
                  : "text-[#464554] hover:bg-[#dce9ff]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-[#c7c4d7] pt-4">
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#464554] hover:bg-[#dce9ff] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">support_agent</span>
          Support
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#464554] hover:bg-[#dce9ff] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign Out
        </Link>
      </div>
    </>
  );
}
