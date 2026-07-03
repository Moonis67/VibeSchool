import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Sparkles, 
  Mic, 
  GraduationCap, 
  BrainCircuit, 
  X,
  Settings
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

export const Sidebar = ({ isOpen, toggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Sparkles, label: "AI Tutor", path: "/transform" },
    { icon: Mic, label: "Classroom", path: "/classroom" },
    { icon: GraduationCap, label: "Subjects", path: "/subjects" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024 && isOpen) toggle();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={toggle} 
      />
      
      <aside className={`
        fixed top-0 left-0 h-full bg-card border-r z-50 transition-all duration-300 flex flex-col
        ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64 group'}
      `}>
        
        {/* Logo */}
        <div className="p-4 border-b h-16 flex items-center justify-between lg:justify-center lg:group-hover:justify-start shrink-0">
           <div className="flex items-center gap-3 font-bold text-xl text-primary overflow-hidden cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity whitespace-nowrap">LearnAI</span>
           </div>
           <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggle}><X className="w-5 h-5"/></Button>
        </div>

        <ScrollArea className="flex-1 overflow-x-hidden">
          <nav className="py-6 flex flex-col gap-2 p-3">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Button 
                  key={idx} 
                  variant={isActive ? "secondary" : "ghost"} 
                  className={`justify-start gap-4 h-12 w-full ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t bg-muted/20 shrink-0">
            <Button
              variant={location.pathname === "/profile" ? "secondary" : "ghost"}
              className={`justify-start gap-4 h-12 w-full ${location.pathname === "/profile" ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
              onClick={() => handleNavigation("/profile")}
            >
                <Settings className="w-5 h-5 shrink-0" />
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity whitespace-nowrap">Settings</span>
            </Button>
        </div>
      </aside>
    </>
  );
};
