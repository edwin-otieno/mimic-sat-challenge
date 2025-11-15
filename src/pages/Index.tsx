import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const contactFormRef = useRef<HTMLFormElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If user is logged in, redirect to dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(loginEmail, loginPassword);
    setIsLoading(false);
  };

  // Contact form handler
  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value || '';
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value || '';
    const phone = (form.elements.namedItem('phone') as HTMLInputElement)?.value || '';
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value || '';
    const subject = encodeURIComponent('Contact Form Submission');
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
    );
    window.location.href = `mailto:staff@tutorsacrossamerica.com?subject=${subject}&body=${body}`;
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
          <a href="#contact-form" className="hover:underline">Contact Us</a>
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
            <a href="#contact-form" className="py-2 px-3 text-[#1a3c7c] hover:underline" onClick={() => setMenuOpen(false)}>Contact Us</a>
            <a href="https://tutorsacrossamerica.com/faqs/faq-students/" target="_blank" className="py-2 px-3 text-[#1a3c7c] hover:underline" onClick={() => setMenuOpen(false)}>FAQ's</a>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={() => navigate("/register")} className="bg-[#e74c3c] text-white font-semibold rounded-full px-6 py-2 text-base shadow hover:bg-[#c0392b] transition">Create An Account</button>
          <button onClick={() => navigate("/login")} className="bg-[#1a3c7c] text-white font-semibold rounded-full px-6 py-2 text-base shadow hover:bg-[#17407c] transition">Login</button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center flex-1 w-full px-2 py-8 gap-10">
        {/* Blue login/register section */}
        <section className="w-full max-w-4xl bg-[#DCEDFD] rounded-2xl shadow p-8 flex flex-col md:block relative overflow-visible" style={{maxWidth: "70rem"}}>
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Left: Image + H2 + Text */}
            <div className="md:w-1/2 flex flex-col items-start md:pr-8" style={{paddingRight: "0rem"}}>
              <div className="relative w-full flex flex-col items-start">
                <h2 className="text-2xl md:text-2xl font-bold text-[#1a3c7c] mb-2">Are you a student in our bootcamps ready to take your practice tests? Welcome!</h2>
                <div className="flex flex-col md:flex-row w-full md:items-start items-start">
                  <img src="/lovable-uploads/bootcamp-students.jpg" alt="Students" className="rounded-xl w-full md:w-80 h-48 md:h-60 object-cover shadow-md mb-4 md:mb-0 md:-ml-16 md:z-10" style={{ marginTop: 0 }} />
                  <p className="text-gray-700 mb-4 text-base w-full md:w-1/2 md:pl-4" style={{fontSize: "20px"}}>This is where you'll create an account (or sign in to your existing account) to take your tests. Your instructor will give you an access code you'll need to create your account.</p>
                </div>
              </div>
          </div>
            {/* Right: Form */}
            <div className="md:w-1/2 flex flex-col gap-3 w-full max-w-md md:w-96 md:ml-auto justify-center">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Username / email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" 
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" 
                />
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#1a3c7c] text-white font-semibold rounded-full px-6 py-3 text-lg shadow hover:bg-[#17407c] transition w-full mt-2"
                >
                  {isLoading ? "Signing In..." : "Login"}
                </button>
              </form>
              <button 
                onClick={() => navigate("/register")}
                className="bg-[#e74c3c] text-white font-normal rounded-full px-6 py-3 text-lg shadow hover:bg-[#c0392b] transition w-full" 
                style={{width: "60%", marginLeft: "auto", marginRight: "auto"}}
              >
                Create an Account
              </button>
            </div>
          </div>
        </section>

        {/* Pink contact section */}
        <section className="w-full max-w-4xl bg-[#FFEEEF] rounded-2xl shadow p-8 flex flex-col md:block relative overflow-visible" style={{maxWidth: "70rem"}}>
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Left: Image + H2 + Text */}
            <div className="md:w-1/2 flex flex-col items-start md:pr-8" style={{paddingRight: "0rem"}}>
              <div className="relative w-full flex flex-col items-start">
                <h2 className="text-2xl font-bold text-[#1a3c7c] mb-2">Contact Us</h2>
                <div className="flex flex-col md:flex-row w-full md:items-start items-start">
                  <img src="/lovable-uploads/contact-students.jpg" alt="Contact" className="rounded-xl w-full md:w-80 h-48 md:h-60 object-cover shadow-md mb-4 md:mb-0 md:-ml-16 md:z-10" style={{ marginTop: 0 }} />
                  <div className="w-full md:w-1/2 md:pl-4">
                    <p className="text-gray-700 text-base mb-2" style={{fontSize: "20px"}}>We're here to help! If you're looking for our main page, visit us at: <span className="font-bold"><a href="https://tutorsacrossamerica.com" target="_blank" rel="noopener noreferrer">TutorsAcrossAmerica.com</a></span></p>
                    <p className="text-gray-700 text-base mb-2" style={{fontSize: "20px"}}>If you need help with taking your practice tests, ask your teacher/TA, or reach out to us at: <span className="font-bold"><a href="tel:702-818-5444">702-818-5444</a>, <a href="mailto:staff@tutorsacrossamerica.com">staff@TutorsAcrossAmerica.com</a></span>, or by using the Contact form here. Thanks!</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: Form */}
            <div className="md:w-1/2 flex flex-col gap-3 w-full max-w-md md:w-96 md:ml-auto justify-center" id="contact-form">
              <form className="flex flex-col gap-3 mt-2 w-full" ref={contactFormRef} onSubmit={handleContactSubmit}>
                <input name="name" type="text" placeholder="Name:" className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" />
                <input name="email" type="email" placeholder="Email:" className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" />
                <input name="phone" type="text" placeholder="Phone Number:" className="rounded-full border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c]" />
                <textarea name="message" placeholder="Message:" className="rounded-2xl border border-gray-300 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3c7c] min-h-[80px]" />
                <button type="submit" className="bg-[#1a3c7c] text-white font-semibold rounded-full px-6 py-3 text-lg shadow hover:bg-[#17407c] transition w-full mt-2">Send</button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
