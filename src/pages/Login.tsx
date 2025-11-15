import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";

const Login = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(email, password);
    const cat = (searchParams.get('category') || '').toUpperCase();
    const suffix = cat === 'SAT' || cat === 'ACT' ? `?category=${cat}` : '';
    navigate(`/dashboard${suffix}`);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex justify-between items-center py-6 px-8 relative">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}> 
          <img src="/lovable-uploads/da648167-8058-4204-9622-df6b335e4da0.png" style={{height: "70px"}} alt="Tutors Across America Logo" className="h-14" />
        </div>
        {/* Desktop Nav */}
        <nav className="hidden md:flex flex-row gap-4 text-[#1a3c7c] font-semibold text-base">
          <a href="/login?category=SAT" className="hover:underline">SAT Tests</a>
          <a href="/login?category=ACT" className="hover:underline">ACT Tests</a>
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
          <h2 className="text-2xl font-bold text-[#1a3c7c] mb-2">Login</h2>
          <form className="flex flex-col gap-4 w-full" onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" />
            <button type="submit" disabled={isLoading} className="bg-[#1a3c7c] text-white font-semibold rounded-full px-6 py-3 text-lg shadow hover:bg-[#17407c] transition w-full mt-2">{isLoading ? "Signing In..." : "Login"}</button>
          </form>
          <div className="text-center mt-2">
            <span className="text-gray-700">Don't have an account? </span>
            <button className="text-[#e74c3c] font-semibold hover:underline" onClick={() => navigate("/register")}>Create an Account</button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Login; 