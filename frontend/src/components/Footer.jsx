export default function Footer() {
  return (
    <footer className="mt-16 py-8 border-t border-white/5 text-center text-sm text-gray-500">
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <span>&copy; {new Date().getFullYear()} CapPace</span>
        <span className="hidden md:inline text-gray-700">&bull;</span>
        <a 
          href="mailto:support@cappace.me" 
          className="hover:text-white transition-colors"
        >
          Support: support@cappace.me
        </a>
      </div>
    </footer>
  );
}
