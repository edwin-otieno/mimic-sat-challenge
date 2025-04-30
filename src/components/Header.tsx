
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

interface HeaderProps {
  showLogout?: boolean;
}

const Header = ({ showLogout = true }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTestPage = location.pathname.includes('/test');
  
  const handleLogout = () => {
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm py-4 px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-primary">SAT Practice</h1>
        </div>
        {showLogout && !isTestPage && (
          <Button variant="outline" onClick={handleLogout}>
            Log Out
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
