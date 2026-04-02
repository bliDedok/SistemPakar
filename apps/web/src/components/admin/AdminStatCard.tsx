type AdminStatCardProps = {
  label: string;
  value: number;
  helperText?: string;
};

export function AdminStatCard({
  label,
  value,
  helperText,
}: AdminStatCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-2 text-3xl font-bold">{value}</h3>
      {helperText ? (
        <p className="mt-2 text-sm text-gray-600">{helperText}</p>
      ) : null}
    </div>
  );
}