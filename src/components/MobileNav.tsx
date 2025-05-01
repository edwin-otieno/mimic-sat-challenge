
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  
  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:hidden">
        <nav className="flex flex-col gap-4 mt-8">
          <Button 
            variant="ghost" 
            onClick={() => handleNavigation("/dashboard")}
            className={location.pathname === "/dashboard" ? "bg-accent justify-start" : "justify-start"}
          >
            Dashboard
          </Button>
          
          {isAdmin && (
            <Button 
              variant="ghost" 
              onClick={() => handleNavigation("/admin")}
              className={location.pathname === "/admin" ? "bg-accent justify-start" : "justify-start"}
            >
              Admin Panel
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            onClick={() => handleNavigation("/results")}
            className={location.pathname === "/results" ? "bg-accent justify-start" : "justify-start"}
          >
            Results
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
