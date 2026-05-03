"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Bell, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  message: string;
  type: "homework" | "result" | "reminder";
  read: boolean;
  createdAt: import("firebase/firestore").Timestamp;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }, (error) => {
      console.error("Firestore index required for notifications:", error);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "homework": return <Clock className="w-4 h-4 text-blue-400" />;
      case "result": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "reminder": return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-black"
              />
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-[#0c1220] border-white/10 text-white p-0 overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="font-bold">Notifications</h3>
          {unreadCount > 0 && <span className="text-[10px] bg-red-500 px-1.5 py-0.5 rounded-full">{unreadCount} New</span>}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-4 cursor-pointer border-b border-white/5 last:border-0 flex gap-3 items-start transition-colors ${!n.read ? 'bg-primary/5' : 'opacity-60'}`}
                >
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex flex-col gap-1">
                    <p className={`text-sm leading-tight ${!n.read ? 'text-white font-medium' : 'text-white/70'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {n.createdAt?.toDate().toLocaleString()}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="bg-white/5 m-0" />
        <div className="p-2 text-center">
           <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white w-full">View All</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
