export function Footer() {
  return (
    <footer className="py-12 border-t border-white/5 text-center">
      <p className="text-slate-500 text-sm font-medium tracking-tight">
        © {new Date().getFullYear()} Uptime. Crafting reliability with ❤️.
      </p>
    </footer>
  );
}
