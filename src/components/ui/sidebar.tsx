"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { NotificationBell } from "@/components/ui/notification-bell";
import {
  Users,
  Calendar as CalendarIcon,
  DollarSign,
  BookOpen,
  FileCheck,
  Target,
  LayoutDashboard,
  UserCircle,
  GraduationCap,
  FileClock,
  Layout,
  MessagesSquare,
  LogOut,
  ChevronsUpDown,
  Plus,
  UserCog,
  Blocks,
  AlertTriangle,
  ClipboardList,
  Trophy,
  Menu,
  X,
  Bell
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "3.05rem",
  },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.01, delayChildren: 0.01 },
  },
};


import { useAuth } from "@/components/providers/auth-provider";

export function SessionNavBar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, userData } = useAuth();
  const role = userData?.role || "student";
  const pathname = usePathname();

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/students", label: "Students", icon: UserCircle },
    { href: "/admin/groups", label: "Groups", icon: Users },
    { href: "/admin/calendar", label: "Calendar", icon: CalendarIcon },
    { href: "/admin/at-risk", label: "At-Risk", icon: AlertTriangle },
    { href: "/admin/homework", label: "Homework", icon: ClipboardList },
    { href: "/admin/lessons", label: "Lessons", icon: GraduationCap },
    { href: "/admin/quizzes", label: "Quizzes", icon: FileClock },
    { href: "/admin/materials", label: "Materials", icon: Layout },
    { href: "/admin/finance", label: "Finance", icon: DollarSign },
    { href: "/admin/submissions", label: "Submissions", icon: MessagesSquare },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
  ];

  const studentLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/homework", label: "Homework", icon: ClipboardList },
    { href: "/materials", label: "Materials", icon: BookOpen },
    { href: "/practice", label: "Practice", icon: Target },
    { href: "/results", label: "Results", icon: FileCheck },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const links = role === "admin" ? adminLinks : studentLinks;

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "sidebar fixed left-0 z-40 h-full shrink-0 border-r bg-white dark:bg-black transition-transform lg:translate-x-0",
          !isMobileOpen && "-translate-x-full lg:translate-x-0"
        )}
        initial={false}
        animate={isCollapsed ? "closed" : "open"}
        variants={sidebarVariants}
        transition={transitionProps}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
      <motion.div
        className={`relative z-40 flex text-muted-foreground h-full shrink-0 flex-col bg-white dark:bg-black transition-all`}
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            <div className="flex h-[54px] w-full shrink-0 border-b p-2">
              <div className="mt-[1.5px] flex w-full items-center justify-between">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-fit" asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex w-fit items-center gap-2  px-2" 
                    >
                      <Avatar className='rounded size-4'>
                        <AvatarFallback>O</AvatarFallback>
                      </Avatar>
                      <motion.span
                        variants={variants}
                        className="flex w-fit items-center gap-2"
                      >
                        {!isCollapsed && (
                          <>
                            <p className="text-sm font-medium  ">
                              {"Organization"}
                            </p>
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                          </>
                        )}
                      </motion.span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link href="/settings/members">
                        <UserCog className="h-4 w-4" /> Manage members
                      </Link>
                    </DropdownMenuItem>{" "}
                    <DropdownMenuItem
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link href="/settings/integrations">
                        <Blocks className="h-4 w-4" /> Integrations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/select-org"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create or join an organization
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {!isCollapsed && <NotificationBell />}
              </div>
            </div>

            <div className=" flex h-full w-full flex-col">
              <div className="flex grow flex-col gap-4">
                <ScrollArea className="h-16 grow p-2">
                  <div className={cn("flex w-full flex-col gap-1")}>
                    {links.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "group relative flex h-10 w-full flex-row items-center rounded-xl px-3 py-2 transition-all duration-300",
                            isActive 
                              ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                              : "text-muted-foreground hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {isActive && (
                            <motion.div 
                              layoutId="active-nav-indicator"
                              className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                          )}
                          <link.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                          <motion.span variants={variants} className="flex items-center">
                            {!isCollapsed && (
                              <p className="ml-3 text-sm font-medium">{link.label}</p>
                            )}
                          </motion.span>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col p-2">
                <div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5  transition hover:bg-muted hover:text-primary">
                        <Avatar className="size-4">
                          <AvatarFallback>
                            A
                          </AvatarFallback>
                        </Avatar>
                        <motion.span
                          variants={variants}
                          className="flex w-full items-center gap-2"
                        >
                          {!isCollapsed && (
                            <>
                            <p className="text-sm font-medium">{userData?.name || (role === "admin" ? "Admin" : "Student")}</p>
                              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50" />
                            </>
                          )}
                        </motion.span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5}>
                      <div className="flex flex-row items-center gap-2 p-2">
                        <Avatar className="size-6">
                          <AvatarFallback>
                            {(userData?.name?.[0] || role?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium">
                            {userData?.name || (role === "admin" ? "Admin User" : "Student User")}
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {user?.email || "user@app.com"}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="flex items-center gap-2"
                        onClick={() => {
                           import("@/lib/firebase").then(({ auth }) => auth.signOut());
                        }}
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
    </>
  );
}
