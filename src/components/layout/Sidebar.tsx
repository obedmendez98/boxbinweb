// components/layout/Sidebar.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  LogOut,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  PersonStandingIcon,
} from "lucide-react";
import { useState } from "react";
import { logoutUser } from "@/lib/firebase";
import LogoIcon from "@/assets/logo.png";
import { LanguageSelector } from "./LanguageSelector";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarItems = [
    {
      title: t('sidebar.dashboard'),
      href: "/home",
      icon: Home,
      badge: null,
    },
    {
      title: t('sidebar.locations'),
      href: "/locations",
      icon: MapPin,
      //badge: t('sidebar.new'),
    },
    {
      title: "Impersonate",
      href: "/impersonate",
      icon: PersonStandingIcon,
      badge: t('sidebar.new'),
    },
    {
      title: "Smart Labels",
      href: "/smart-labels",
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      badge: null,
    },
  ];

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('impersonatedUser');
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className={cn(
      "relative flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-72",
      className
    )}>
      {/* Header del Sidebar */}
      <div className="relative flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={LogoIcon}
                alt="Logo"
                className="w-8 h-8 rounded-lg shadow-sm"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('sidebar.dashboard')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                v2.0
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-6">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <div key={item.href} className="relative">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-11 rounded-xl transition-all duration-200 group relative overflow-hidden",
                    collapsed ? "px-3" : "px-4",
                    isActive 
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                  onClick={() => navigate(item.href)}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                  )}
                  
                  <Icon className={cn(
                    "h-5 w-5 transition-colors flex-shrink-0",
                    !collapsed && "mr-3",
                    isActive && "text-blue-600 dark:text-blue-400"
                  )} />
                  
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className="ml-2 h-5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  )}
                </Button>
                
                {/* Tooltip para modo colapsado */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.title}
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Language Selector */}
        <Separator className="my-6 bg-slate-200 dark:bg-slate-700" />
        <LanguageSelector collapsed={collapsed} />
      </ScrollArea>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Footer del Sidebar */}
      <div className="p-4 space-y-3 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
        {/* User Profile */}
        {!collapsed && currentUser && (
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {currentUser.displayName || t('sidebar.user')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentUser.email}
              </p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-11 rounded-xl transition-all duration-200 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 group",
            collapsed && "px-3"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span className="font-medium">{t('sidebar.logout')}</span>}
          
          {/* Tooltip para modo colapsado */}
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              {t('sidebar.logout')}
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}