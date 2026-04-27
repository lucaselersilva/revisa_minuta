"use client";

import { Download, Printer } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

type ProfessionalMarkdownReportProps = {
  title: string;
  subtitle: string;
  markdown: string | null;
  exportFileName: string;
  generatedAt?: string | null;
  generatedBy?: string | null;
  promptVersion?: string | null;
  modelName?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("pt-BR");
}

function convertMarkdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;
  let currentListItem: string[] = [];
  let inParagraph = false;
  let paragraphParts: string[] = [];

  function closeParagraph() {
    if (!inParagraph || !paragraphParts.length) {
      inParagraph = false;
      paragraphParts = [];
      return;
    }

    html.push(`<p>${paragraphParts.join(" ")}</p>`);
    inParagraph = false;
    paragraphParts = [];
  }

  function closeListItem() {
    if (!currentListItem.length) {
      return;
    }

    html.push(`<li>${currentListItem.join("")}</li>`);
    currentListItem = [];
  }

  function closeList() {
    if (!inList) {
      return;
    }

    closeListItem();
    html.push("</ul>");
    inList = false;
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      closeParagraph();
      closeList();
      html.push(`<h1>${escapeHtml(trimmed.slice(2).trim())}</h1>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeParagraph();
      closeList();
      html.push(`<h2>${escapeHtml(trimmed.slice(3).trim())}</h2>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      closeParagraph();
      closeList();
      html.push(`<h3>${escapeHtml(trimmed.slice(4).trim())}</h3>`);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      closeParagraph();
      closeList();
      html.push(`<h2>${escapeHtml(trimmed)}</h2>`);
      continue;
    }

    if (/^\d+\.\d+\s/.test(trimmed)) {
      closeParagraph();
      closeList();
      html.push(`<h3>${escapeHtml(trimmed)}</h3>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      closeParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      } else {
        closeListItem();
      }

      currentListItem = [`<span>${escapeHtml(trimmed.slice(2).trim())}</span>`];
      continue;
    }

    if (inList) {
      currentListItem.push(`<div class="report-list-detail">${escapeHtml(trimmed)}</div>`);
      continue;
    }

    inParagraph = true;
    paragraphParts.push(escapeHtml(trimmed));
  }

  closeParagraph();
  closeList();

  return html.join("\n");
}

function buildReportDocument({
  title,
  subtitle,
  markdown,
  generatedAt,
  generatedBy,
  promptVersion,
  modelName
}: Omit<ProfessionalMarkdownReportProps, "exportFileName">) {
  const body = markdown ? convertMarkdownToHtml(markdown) : "<p>Relatorio indisponivel.</p>";
  const metaItems = [
    generatedAt ? `Gerado em ${escapeHtml(generatedAt)}` : null,
    generatedBy ? `Responsavel: ${escapeHtml(generatedBy)}` : null,
    promptVersion ? `Prompt: ${escapeHtml(promptVersion)}` : null,
    modelName ? `Modelo: ${escapeHtml(modelName)}` : null
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #dbe4ee;
        --soft: #f8fafc;
        --panel: #ffffff;
        --accent: #8b1e2d;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(139, 30, 45, 0.08), transparent 32%),
          linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
        color: var(--ink);
        font-family: Georgia, "Times New Roman", serif;
      }

      .page {
        width: min(960px, calc(100vw - 48px));
        margin: 32px auto;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }

      .cover {
        padding: 44px 48px 28px;
        background: linear-gradient(135deg, #fff 0%, #f8fafc 60%, #eef2f7 100%);
        border-bottom: 1px solid var(--line);
      }

      .eyebrow {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(139, 30, 45, 0.08);
        color: var(--accent);
        font: 600 12px/1.2 Arial, Helvetica, sans-serif;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 18px 0 10px;
        font-size: 34px;
        line-height: 1.15;
      }

      .subtitle {
        margin: 0;
        color: var(--muted);
        font: 400 16px/1.7 Arial, Helvetica, sans-serif;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 22px;
      }

      .meta span {
        border: 1px solid var(--line);
        background: #fff;
        border-radius: 999px;
        padding: 8px 12px;
        color: var(--muted);
        font: 500 12px/1.4 Arial, Helvetica, sans-serif;
      }

      .notice {
        margin-top: 22px;
        padding: 14px 16px;
        border-left: 4px solid var(--accent);
        background: rgba(139, 30, 45, 0.06);
        color: #5b1520;
        font: 600 13px/1.6 Arial, Helvetica, sans-serif;
      }

      .content {
        padding: 34px 48px 44px;
      }

      .content h1,
      .content h2,
      .content h3 {
        page-break-after: avoid;
      }

      .content h1 {
        font-size: 28px;
        margin: 0 0 20px;
      }

      .content h2 {
        margin: 32px 0 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--line);
        font-size: 21px;
      }

      .content h3 {
        margin: 20px 0 10px;
        font-size: 16px;
        color: var(--accent);
      }

      .content p {
        margin: 0 0 12px;
        font-size: 15px;
        line-height: 1.8;
      }

      .content ul {
        margin: 0 0 16px;
        padding-left: 22px;
      }

      .content li {
        margin: 0 0 10px;
        line-height: 1.75;
      }

      .report-list-detail {
        margin-top: 4px;
        color: var(--muted);
        font: 400 14px/1.7 Arial, Helvetica, sans-serif;
      }

      @page {
        size: A4;
        margin: 14mm;
      }

      @media print {
        body {
          background: #fff;
        }

        .page {
          width: 100%;
          margin: 0;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .cover,
        .content {
          padding-left: 0;
          padding-right: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <span class="eyebrow">Uso interno</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        ${metaItems.length ? `<div class="meta">${metaItems.map((item) => `<span>${item}</span>`).join("")}</div>` : ""}
        <div class="notice">Documento interno de trabalho. Uso restrito a equipe juridica e operacional do escritorio.</div>
      </section>
      <section class="content">${body}</section>
    </main>
  </body>
</html>`;
}

export function ProfessionalMarkdownReport(props: ProfessionalMarkdownReportProps) {
  const formattedGeneratedAt = formatDateTime(props.generatedAt);
  const documentHtml = useMemo(
    () =>
      buildReportDocument({
        ...props,
        generatedAt: formattedGeneratedAt
      }),
    [formattedGeneratedAt, props]
  );

  const renderedHtml = useMemo(
    () => (props.markdown ? convertMarkdownToHtml(props.markdown) : ""),
    [props.markdown]
  );

  function handleDownloadHtml() {
    const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyFileName(props.exportFileName) || "relatorio"}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  if (!props.markdown) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-sm text-slate-500">
        Nao ha markdown persistido para esta versao.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900">{props.title}</p>
          <p className="mt-1 text-sm text-slate-500">{props.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleDownloadHtml}>
            <Download className="h-4 w-4" />
            Exportar HTML
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir ou PDF
          </Button>
        </div>
      </div>

      <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] shadow-sm">
        <header className="border-b border-slate-200 px-6 py-6">
          <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-900">
            Uso interno
          </span>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-slate-950">{props.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{props.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {formattedGeneratedAt ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                Gerado em {formattedGeneratedAt}
              </span>
            ) : null}
            {props.generatedBy ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                Responsavel: {props.generatedBy}
              </span>
            ) : null}
            {props.promptVersion ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                Prompt {props.promptVersion}
              </span>
            ) : null}
            {props.modelName ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                {props.modelName}
              </span>
            ) : null}
          </div>
        </header>

        <div className="border-b border-slate-200 bg-rose-50/60 px-6 py-3 text-sm font-medium text-rose-900">
          Documento interno de trabalho. Compartilhamento restrito a equipe autorizada.
        </div>

        <div
          className="report-html px-6 py-8 font-serif text-[15px] leading-8 text-slate-800"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </article>

      <style jsx>{`
        .report-html :global(h1) {
          margin: 0 0 1.25rem;
          font-size: 1.75rem;
          line-height: 1.2;
          color: #0f172a;
        }

        .report-html :global(h2) {
          margin: 2rem 0 0.8rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #dbe4ee;
          font-size: 1.25rem;
          line-height: 1.35;
          color: #0f172a;
        }

        .report-html :global(h3) {
          margin: 1.2rem 0 0.7rem;
          font-size: 1rem;
          line-height: 1.5;
          color: #8b1e2d;
        }

        .report-html :global(p) {
          margin: 0 0 0.9rem;
        }

        .report-html :global(ul) {
          margin: 0 0 1rem;
          padding-left: 1.25rem;
        }

        .report-html :global(li) {
          margin: 0 0 0.65rem;
        }

        .report-html :global(.report-list-detail) {
          margin-top: 0.2rem;
          color: #475569;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          line-height: 1.65;
        }
      `}</style>
    </div>
  );
}
