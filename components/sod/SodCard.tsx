import Link from "next/link";
import { Sod } from "@/lib/sod";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SodCardProps {
  sod: Sod;
  holdsClaimBadge?: boolean;
}

export function SodCard({ sod, holdsClaimBadge = false }: SodCardProps) {
  return (
    <div className="rounded-xl border border-[#E5E5E2] bg-white p-5 shadow-sm hover:border-black/20 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <Badge status={sod.status} />
          {holdsClaimBadge && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F7A4D] bg-[#1F7A4D]/10 border border-[#1F7A4D]/20 px-2 py-0.5 rounded-md"
              title="You hold the claim badge for this payment link"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Claim Badge
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-[#111111] line-clamp-1 mb-1">
          {sod.description || "Untitled Sod"}
        </h3>

        <div className="text-sm font-semibold text-[#0B1D33] mb-4">
          {sod.amount ? `${sod.amount} TARI` : "Open amount"}
        </div>

        <div className="space-y-1 text-xs text-[#5C5C5C] font-mono border-t border-[#E5E5E2] pt-3">
          <div className="truncate">
            <span className="text-slate-400 font-sans">ID: </span>
            {sod.id}
          </div>
          {sod.createdAt && (
            <div className="font-sans text-slate-400">
              Created {new Date(sod.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-[#E5E5E2] flex items-center justify-between gap-2">
        <Link href={`/pay/${sod.id}`} className="text-xs font-semibold text-[#5C5C5C] hover:text-[#111111]">
          Pay Link →
        </Link>
        <Link href={`/app/s/${sod.id}`}>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </Link>
      </div>
    </div>
  );
}
