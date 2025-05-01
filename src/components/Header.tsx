
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import MobileNav from "./MobileNav";

interface HeaderProps {
  showLogout?: boolean;
}

const Header = ({ showLogout = true }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTestPage = location.pathname.includes('/test');
  const { user, signOut, isAdmin, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // This ensures we have the latest profile data after component mounts
    setMounted(true);
    console.log("Header mounted, isAdmin:", isAdmin, "profile:", profile);
  }, [isAdmin, profile]);
  
  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm py-4 px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {user && !isTestPage && <MobileNav />}
          <h1 
            className="text-2xl font-bold text-primary cursor-pointer" 
            onClick={() => navigate(user ? "/dashboard" : "/")}
          >
            SAT Practice
          </h1>
        </div>
        
        {user && !isTestPage && (
          <div className="flex items-center gap-4">
            {/* Display user info */}
            <div className="text-sm text-gray-600">
              {profile?.first_name && (
                <span>
                  {profile.first_name} {profile.last_name} 
                  {isAdmin ? " (Admin)" : ""}
                </span>
              )}
            </div>
            
            {/* Navigation for admin and student */}
            <div className="hidden sm:flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/dashboard")}
                className={location.pathname === "/dashboard" ? "bg-accent" : ""}
              >
                Dashboard
              </Button>
              
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/admin")}
                  className={location.pathname === "/admin" ? "bg-accent" : ""}
                >
                  Admin Panel
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                onClick={() => navigate("/results")}
                className={location.pathname === "/results" ? "bg-accent" : ""}
              >
                Results
              </Button>
            </div>
            
            {showLogout && (
              <Button variant="outline" onClick={handleLogout}>
                Log Out
              </Button>
            )}
          </div>
        )}
        
        {!user && !isTestPage && (
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
