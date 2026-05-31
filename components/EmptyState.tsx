import Link from "next/link";

interface Props {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-4xl mb-3 select-none">{icon}</p>
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
