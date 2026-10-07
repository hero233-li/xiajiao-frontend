import { Activity, BookOpen, GraduationCap, Languages, Layers } from 'lucide-react';
const icons: Record<string, typeof BookOpen> = {
  book: BookOpen,
  activity: Activity,
  graduation: GraduationCap,
  languages: Languages,
};
export function SpaceIcon({ icon, accent }: { icon: string; accent: string }) {
  const Icon = icons[icon] ?? Layers;
  return (
    <span className="space-icon" style={{ color: accent }}>
      <Icon size={22} aria-hidden="true" />
    </span>
  );
}
