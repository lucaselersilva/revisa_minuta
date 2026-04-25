type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
};

export function PageShell({ eyebrow, title, description, action, children, fullWidth = false }: PageShellProps) {
  return (
    <div className={fullWidth ? "w-full px-5 py-8 2xl:px-8" : "mx-auto w-full max-w-7xl px-5 py-8"}>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p> : null}
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
