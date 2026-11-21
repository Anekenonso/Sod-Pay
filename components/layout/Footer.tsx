import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E5E5E2] bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-1 text-lg font-bold tracking-tight">
            <span className="text-[#0B1D33]">Sod</span>
            <span className="text-[#111111]">Pay</span>
          </div>
          <p className="text-sm text-[#5C5C5C]">
            Private payment links on Tari Ootle.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-[#5C5C5C]">
          <Link href="/#how-it-works" className="hover:text-[#111111]">
            How it works
          </Link>
          <Link href="/#faq" className="hover:text-[#111111]">
            FAQ
          </Link>
          <Link href="/app" className="hover:text-[#111111]">
            My Sods
          </Link>
          <a
            href="https://github.com/Anekenonso/Sod-Pay"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#111111]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
