import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import AccessCodeGuard from "@/components/AccessCodeGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Register = () => {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoadingSchools(true);
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('Error fetching schools:', error);
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    setIsLoading(true);
    await signUp(email, password, firstName, lastName, selectedSchool || undefined);
    setIsLoading(false);
  };

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
  }, []);

  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  }, []);

  return (
    <AccessCodeGuard accessCode={["#Tutors", "#tutors"]}>
      <div className="min-h-screen bg-white flex flex-col">
        <header className="flex justify-between items-center py-6 px-8 relative">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}> 
            <img src="/lovable-uploads/da648167-8058-4204-9622-df6b335e4da0.png" style={{height: "70px"}} alt="Tutors Across America Logo" className="h-14" />
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-row gap-4 text-[#1a3c7c] font-semibold text-base">
            <a href="/login" className="hover:underline">SAT Tests</a>
            <a href="/login" className="hover:underline">ACT Tests</a>
            <a href="/#contact-form" className="hover:underline">Contact Us</a>
            <a href="https://tutorsacrossamerica.com/faqs/faq-students/" target="_blank" className="hover:underline">FAQ's</a>
          </nav>
          {/* Hamburger for mobile */}
          <button className="md:hidden flex items-center px-2 py-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
            <svg className="w-7 h-7 text-[#1a3c7c]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 flex flex-col p-4 md:hidden animate-fade-in">
              <a href="/login?category=SAT" className="py-2 px-3 text-[#1a3c7c] hover:underline" onClick={() => setMenuOpen(false)}>SAT Tests</a>
              <a href="/login?category=ACT" className="py-2 px-3 text-[#1a3c7c] hover:underline" onClick={() => setMenuOpen(false)}>ACT Tests</a>
              <a href="/#contact-form" className="py-2 px-3 text-[#1a3c7c] hover:underline" onClick={() => setMenuOpen(false)}>Contact Us</a>
              <a href="https://tutorsacrossamerica.com/faqs/faq-students/" target="_blank" className="py-2 px-3 text-[#1a3c7c] hover:underline" onClick={() => setMenuOpen(false)}>FAQ's</a>
            </div>
          )}
          <div className="flex gap-2 sm:gap-4">
            <button onClick={() => navigate("/register")} className="bg-[#e74c3c] text-white font-semibold rounded-full px-3 sm:px-6 py-2 text-xs sm:text-base shadow hover:bg-[#c0392b] transition whitespace-nowrap">Create An Account</button>
            <button onClick={() => navigate("/login")} className="bg-[#1a3c7c] text-white font-semibold rounded-full px-3 sm:px-6 py-2 text-xs sm:text-base shadow hover:bg-[#17407c] transition whitespace-nowrap">Login</button>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-2 py-8">
          <section className="w-full max-w-md bg-[#eaf4fd] rounded-2xl shadow p-8 flex flex-col gap-6 items-center">
            <h2 className="text-2xl font-bold text-[#1a3c7c] mb-2">Create an Account</h2>
            <form className="flex flex-col gap-4 w-full" onSubmit={handleRegister}>
              <div className="flex gap-2">
                <input 
                  key="firstName"
                  type="text" 
                  placeholder="First Name" 
                  value={firstName} 
                  onChange={handleFirstNameChange} 
                  required 
                  className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c] w-1/2" 
                />
                <input 
                  key="lastName"
                  type="text" 
                  placeholder="Last Name" 
                  value={lastName} 
                  onChange={handleLastNameChange} 
                  required 
                  className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c] w-1/2" 
                />
              </div>
              <input 
                key="email"
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={handleEmailChange} 
                required 
                className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" 
              />
              <input 
                key="password"
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={handlePasswordChange} 
                required 
                className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" 
              />
              <input 
                key="confirmPassword"
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword} 
                onChange={handleConfirmPasswordChange} 
                required 
                className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" 
              />
              <div>
                <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
                  School (Optional)
                </label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]">
                    <SelectValue placeholder="Select your school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {loadingSchools ? (
                      <SelectItem value="" disabled>Loading schools...</SelectItem>
                    ) : schools.length === 0 ? (
                      <SelectItem value="" disabled>No schools available</SelectItem>
                    ) : (
                      schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <button type="submit" disabled={isLoading} className="bg-[#e74c3c] text-white font-semibold rounded-full px-6 py-3 text-lg shadow hover:bg-[#c0392b] transition w-full mt-2">{isLoading ? "Creating Account..." : "Create Account"}</button>
            </form>
            <div className="text-center mt-2">
              <span className="text-gray-700">Already have an account? </span>
              <button className="text-[#1a3c7c] font-semibold hover:underline" onClick={() => navigate("/login")}>Login</button>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </AccessCodeGuard>
  );
};

export default Register; 