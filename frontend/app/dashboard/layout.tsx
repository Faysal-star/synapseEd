'use client';

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Brain, LucideIcon, BarChart3, Menu, ChevronLeft, ChevronRight, Layers, Users, PenBox, BookOpenCheck, Cog, SpeechIcon } from "lucide-react";
import ChatBot from "@/components/navigation-chatbot";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  title: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

const NavItem = ({ href, icon: Icon, title, isActive, isCollapsed }: NavItemProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ease-in-out",
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
        isCollapsed ? "justify-center" : ""
      )}
    >
      <Icon size={20} className={cn(isCollapsed ? "mx-auto" : "")} />
      {!isCollapsed && <span>{title}</span>}
    </Link>
  );
};

const teacherNavItems = [
  { href: "/dashboard/resource-management", icon: BookOpen, title: "Resource Management" },
  { href: "/dashboard/ai-agents", icon: Brain, title: "AI Agents" },
  { href: "/dashboard/student-analytics", icon: BarChart3, title: "Student Analytics" },
  { href: "/dashboard/whiteboard", icon: PenBox, title: "Whiteboard" },
  { href: "/dashboard/settings", icon: Cog, title: "Settings" },
];

const studentNavItems = [
  { href: "/dashboard/class-resources", icon: BookOpen, title: "Class Resources" },
  { href: "/dashboard/ai-agents", icon: Brain, title: "AI Agents" },
  { href: "/dashboard/exams", icon: BookOpenCheck, title: "Exams" },
  { href: "/dashboard/viva", icon: SpeechIcon, title: "Viva Trainer" },
  { href: "/dashboard/viva", icon: SpeechIcon, title: "Viva Trainer" },
  { href: "/dashboard/ai-counselor", icon: Users, title: "AI Counselor" },
  { href: "/dashboard/whiteboard", icon: PenBox, title: "Whiteboard" },
  { href: "/dashboard/settings", icon: Cog, title: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userType, setUserType] = useState<"teacher" | "student">("teacher"); // Default to teacher, would be set from user session
  const pathname = usePathname();
  
  // Effect for handling responsiveness
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCollapsed(window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // Select navigation items based on user type
  const navItems = userType === "teacher" ? teacherNavItems : studentNavItems;
  
  const sidebarContent = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 px-3 py-2">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
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
            className="ml-auto rounded-full"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        )}
      </div>
      
      <Separator />
      
      <div className={cn("flex-1 space-y-2 px-2", isCollapsed ? "items-center" : "")}>
        <p className={cn("text-muted-foreground text-xs font-medium", isCollapsed ? "sr-only" : "px-2")}>
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
      
      <div className={cn("px-3 py-2", isCollapsed ? "flex justify-center" : "")}>
        <div className={cn("flex items-center", isCollapsed ? "" : "gap-3")}>
          {!isCollapsed && (
            <>
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full" />
                <div className="absolute inset-[1px] bg-background rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">JD</span>
                </div>
              </div>
              <div className="grid gap-0.5">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">
                  {userType === "teacher" ? "Science Teacher" : "Student"}
                </p>
              </div>
            </>
          )}
          <ModeToggle className={cn(isCollapsed ? "ml-0" : "ml-auto")} />
        </div>
      </div>
    </div>
  );
  
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
            <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-40">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}
      
      {/* Main content */}
      <div className="flex-1">{children}</div>

      <ChatBot />

    </div>
  );
}