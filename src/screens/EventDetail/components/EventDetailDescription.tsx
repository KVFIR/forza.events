type Props = {
  description: string;
};

export function EventDetailDescription({description}: Props) {
  if (!description.trim()) return null;

  return (
    <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-400">
      {description}
    </p>
  );
}
