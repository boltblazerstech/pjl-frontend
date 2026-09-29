import type { SubmissionStatus } from '../types';

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; className: string; hint?: string }
> = {
  PENDING:          { label: 'Pending',             className: 'bg-gray-100 text-gray-700' },
  PROCESSING:       { label: 'Processing',          className: 'bg-blue-100 text-blue-700' },
  COMPLETED:        { label: 'Completed',           className: 'bg-green-100 text-green-700' },
  APPROVED:         { label: 'Approved',            className: 'bg-green-100 text-green-700' },
  REJECTED:         { label: 'Rejected',            className: 'bg-red-100 text-red-700' },
  EXCEPTION:        { label: 'Exception',           className: 'bg-amber-100 text-amber-700' },
  OVERRIDDEN:       { label: 'Overridden',          className: 'bg-purple-100 text-purple-700' },
  FAILED:           { label: 'Failed',              className: 'bg-red-100 text-red-700' },
  GREEN:            { label: 'Green',               className: 'bg-green-100 text-green-700' },
  AMBER:            { label: 'Amber',               className: 'bg-amber-100 text-amber-700' },
  RED:              { label: 'Red',                 className: 'bg-red-100 text-red-700' },
  AWAITING_PO_GRN:  { label: 'Waiting for PO/GRN', className: 'bg-indigo-100 text-indigo-700', hint: 'Will resolve automatically after the next Excel import.' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status as SubmissionStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  const badge = (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );

  if (cfg.hint) {
    return (
      <span className="relative group inline-flex">
        {badge}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded bg-gray-900 text-white text-xs px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center shadow-lg">
          {cfg.hint}
        </span>
      </span>
    );
  }

  return badge;
}
