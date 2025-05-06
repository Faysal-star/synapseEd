"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  LucideIcon,
  BarChart3,
  Menu,
  ChevronLeft,
  ChevronRight,
  Layers,
  Users,
  PenBox,
  BookOpenCheck,
  Cog,
  SpeechIcon,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import ChatBot from "@/components/navigation-chatbot";
import { UserProvider, useUser } from "@/hooks/use-user";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  title: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

const NavItem = ({
  href,
  icon: Icon,
  title,
  isActive,
  isCollapsed,
}: NavItemProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ease-in-out",
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        isCollapsed ? "justify-center" : ""
      )}
    >
      <Icon size={20} className={cn(isCollapsed ? "mx-auto" : "")} />
      {!isCollapsed && <span>{title}</span>}
    </Link>
  );
};

const teacherNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, title: "Dashboard" },
  {
    href: "/dashboard/resource-management",
    icon: BookOpen,
    title: "Resource Management",
  },
  { href: "/dashboard/ai-agents", icon: Brain, title: "AI Agents" },
  {
    href: "/dashboard/student-analytics",
    icon: BarChart3,
    title: "Student Analytics",
  },
  { href: "/dashboard/whiteboard", icon: PenBox, title: "Whiteboard" },
  { href: "/dashboard/viva", icon: SpeechIcon, title: "Viva Trainer" },
  { href: "/dashboard/settings", icon: Cog, title: "Settings" },
];

const studentNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, title: "Dashboard" },
  {
    href: "/dashboard/resource-management",
    icon: BookOpen,
    title: "Class Resources",
  },
  { href: "/dashboard/ai-agents", icon: Brain, title: "AI Agents" },
  { href: "/dashboard/exams", icon: BookOpenCheck, title: "Exams" },
  { href: "/dashboard/viva", icon: SpeechIcon, title: "Viva Trainer" },
  { href: "/dashboard/ai-counselor", icon: Users, title: "AI Counselor" },
  { href: "/dashboard/whiteboard", icon: PenBox, title: "Whiteboard" },
  { href: "/dashboard/settings", icon: Cog, title: "Settings" },
];

const DashboardLayoutContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { role, isLoading, user } = useUser();

  // Effect for handling responsiveness
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCollapsed(window.innerWidth > 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // Select navigation items based on user role
  const navItems = role === "teacher" ? teacherNavItems : studentNavItems;

  // User display name
  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col gap-1">
      <div className={cn("flex items-center gap-2 px-3 py-2", isCollapsed ? "flex-col" : "")}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
                <span className="text-sm font-bold text-white">S</span>
              </div>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              SynapseED
            </span>
          </Link>
        )}
        {isCollapsed && (
          <div className="relative h-8 w-8 mx-auto">
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
              <span className="text-sm font-bold text-white">S</span>
            </div>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </Button>
        )}
      </div>

      <Separator />

      <div
        className={cn(
          "flex-1 space-y-2 px-2",
          isCollapsed ? "items-center" : ""
        )}
      >
        <p
          className={cn(
            "text-muted-foreground text-xs font-medium",
            isCollapsed ? "sr-only" : "px-2"
          )}
        >
          Navigation
        </p>
        <nav className="grid gap-1 py-2">
          {navItems.map((item, index) => (
            <NavItem
              key={index}
              href={item.href}
              icon={item.icon}
              title={item.title}
              isActive={pathname === item.href}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </div>

      <Separator />

      <div
        className={cn(
          "px-3 py-2",
          isCollapsed ? "flex flex-col items-center gap-2" : ""
        )}
      >
        <div className={cn("flex items-center ", isCollapsed ? "" : "pl-4 gap-3")}>
          {!isCollapsed && (
            <>
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full" />
                <div className="absolute inset-[1px] bg-background rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">{userInitials}</span>
                </div>
              </div>
              <div className="grid gap-0.5">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {role === "teacher" ? "Teacher" : "Student"}
                </p>
              </div>
            </>
          )}
          <ModeToggle className={cn(isCollapsed ? "ml-0 mb-2" : "ml-auto")} />
        </div>

        {/* Logout link */}
        <Link
          href="/api/logout"
          className={cn(
            "flex items-center mt-2 p-4 rounded-lg transition-all duration-300 hover:bg-accent",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LogOut
                size={isCollapsed ? 16 : 18}
                className="text-background"
              />
            </div>
          </div>
          {!isCollapsed && (
            <span className="ml-2 text-sm font-medium">Logout</span>
          )}
        </Link>
      </div>
    </div>
  );

  if (isLoading) {
    // Show a simple loading state for the sidebar
    return (
      <div className="flex min-h-screen">
        <div className="sticky top-0 h-screen border-r bg-background z-30 w-[80px] flex items-center justify-center">
          <div className="animate-pulse h-8 w-8 rounded-full bg-muted"></div>
        </div>
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      {!isMobile && (
        <AnimatePresence initial={false}>
          <motion.div
            key="sidebar"
            initial={{ width: isCollapsed ? 80 : 240 }}
            animate={{ width: isCollapsed ? 80 : 240 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="sticky top-0 h-screen border-r bg-background z-30"
          >
            {sidebarContent}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-4 z-40"
            >
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <div className={"flex-1 "}>{children}</div>

      <ChatBot />
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </UserProvider>
  );
}
