import type { SubmissionStatus } from '../types';

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  PENDING:    { label: 'Pending',    className: 'bg-gray-100 text-gray-700' },
  PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  COMPLETED:  { label: 'Completed',  className: 'bg-green-100 text-green-700' },
  APPROVED:   { label: 'Approved',   className: 'bg-green-100 text-green-700' },
  REJECTED:   { label: 'Rejected',   className: 'bg-red-100 text-red-700' },
  EXCEPTION:  { label: 'Exception',  className: 'bg-amber-100 text-amber-700' },
  OVERRIDDEN: { label: 'Overridden', className: 'bg-purple-100 text-purple-700' },
  FAILED:     { label: 'Failed',     className: 'bg-red-100 text-red-700' },
  GREEN:      { label: 'Green',      className: 'bg-green-100 text-green-700' },
  AMBER:      { label: 'Amber',      className: 'bg-amber-100 text-amber-700' },
  RED:        { label: 'Red',        className: 'bg-red-100 text-red-700' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status as SubmissionStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
