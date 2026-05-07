interface Props {
  title: string;
}

export default function ComingSoonSection({ title }: Props) {
  return (
    <main className="flex-1 bg-page-bg flex items-center justify-center">
      <div className="text-center py-32">
        <p className="text-base font-bold uppercase tracking-wider text-brand">Coming Soon</p>
        <h1 className="mt-2 text-3xl font-extrabold text-text-primary tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          곧 서비스될 예정입니다.
        </p>
      </div>
    </main>
  );
}
