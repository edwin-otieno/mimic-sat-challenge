const Footer = () => (
  <footer className="bg-[#eaf4fd] border-t border-blue-200 mt-12" style={{borderRadius: "25px"}}>
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-8">
      <a href="/" className="flex flex-col items-center md:items-start mb-8 md:mb-0">
        <img src="/lovable-uploads/da648167-8058-4204-9622-df6b335e4da0.png" alt="Tutors Across America Logo" className="h-16 mb-2 md:mb-0" />
      </a>
      <nav className="flex flex-col md:flex-row gap-4 text-[#1a3c7c] font-semibold text-base items-center md:items-start md:mb-0 mb-4">
        <a href="/" className="hover:underline">Sat Tests</a>
        <a href="#" className="hover:underline">ACT Tests</a>
        <a href="https://taatesting.com/#contact-form/" className="hover:underline">Contact Us</a>
        <a href="https://tutorsacrossamerica.com/faqs/faq-students/" target="_blank" className="hover:underline">FAQ's</a>
      </nav>
      <span className="flex items-center text-[#1a3c7c] text-base font-medium"><img src="/icons/phone.png" alt="Phone" className="w-4 h-4 inline-block mr-1" /><a href="tel:702-818-5444">(702) 818-5444</a></span>
      <span className="flex items-center text-[#1a3c7c] text-base font-medium"><img src="/icons/email.png" alt="Email" className="w-4 h-4 inline-block mr-1" /><a href="mailto:staff@tutorsacrossamerica.com">Staff@TutorsAcrossAmerica.com</a></span>
    </div>
  </footer>
);

export default Footer; 