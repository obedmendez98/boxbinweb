// components/layout/Sidebar.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { logoutUser } from "@/lib/firebase";
import LogoIcon from "@/assets/logo.png";


interface SidebarProps {
  className?: string;
}

const sidebarItems = [
  {
    title: "Home",
    href: "/home",
    icon: Home,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser()
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className={cn(
      "relative flex h-full flex-col border-r bg-background",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header del Sidebar */}
      <div className="relative flex h-20 items-center justify-end px-4 border-b">
        {!collapsed && (
          
          <img
            src={LogoIcon}
            alt="Logo"
            className="absolute left-1/2 -translate-x-1/2 w-15 h-15"
          />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed && "px-2",
                  isActive && "bg-accent"
                )}
                onClick={() => navigate(item.href)}
              >
                <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>{item.title}</span>}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Footer del Sidebar */}
      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
            collapsed && "px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && <span>Log out</span>}
        </Button>

        {!collapsed && currentUser && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground truncate">
              {currentUser.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
