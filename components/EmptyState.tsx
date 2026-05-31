import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-10 h-10 text-gray-300 mb-3" strokeWidth={1.5} />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 text-xs font-medium text-orange-500 hover:text-orange-600 underline underline-offset-2 transition-colors"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
