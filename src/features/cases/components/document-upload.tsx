"use client";

import { FileUp, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  cleanupUploadedCaseFilesAction,
  registerUploadedCaseDocumentsAction,
  removeCaseDocumentAction
} from "@/features/cases/actions/case-actions";
import { buildCaseFilePath } from "@/features/cases/services/storage-path";
import { caseDocumentStages, caseDocumentTypes } from "@/lib/validations/cases";
import { createClient } from "@/lib/supabase/client";
import type { CaseDocument, CaseDocumentStage, CaseDocumentType } from "@/types/database";

const documentTypeLabels: Record<CaseDocumentType, string> = {
  initial_petition: "Peticao inicial",
  author_documents: "Documentos do autor",
  author_identity_document: "Documento de identidade do autor",
  author_address_proof: "Comprovante de endereco do autor",
  author_payment_proof: "Comprovante de pagamento",
  author_screen_capture: "Prints e capturas de tela",
  initial_amendment: "Emenda a inicial",
  initial_amendment_documents: "Documentos da emenda",
  defense: "Contestacao",
  defense_documents: "Documentos da defesa",
  other: "Outros"
};

const stageLabels: Record<CaseDocumentStage, string> = {
  initial: "Inicial",
  pre_analysis: "Pre-analise",
  defense: "Defesa",
  final_review: "Revisao final"
};

const acceptedTypes = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt";
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

type Props = {
  caseId: string;
  officeId: string;
  documents: CaseDocument[];
  allowedDocumentTypes?: CaseDocumentType[];
  allowedStages?: CaseDocumentStage[];
  defaultDocumentType?: CaseDocumentType;
  defaultStage?: CaseDocumentStage;
};

export function DocumentUpload({
  caseId,
  officeId,
  documents,
  allowedDocumentTypes = [...caseDocumentTypes],
  allowedStages = [...caseDocumentStages],
  defaultDocumentType,
  defaultStage
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<CaseDocumentType>(defaultDocumentType ?? allowedDocumentTypes[0] ?? "other");
  const [stage, setStage] = useState<CaseDocumentStage>(defaultStage ?? allowedStages[0] ?? "initial");
  const [isPending, startTransition] = useTransition();
  const groupedDocuments = useMemo(() => {
    return documents.reduce<Record<string, CaseDocument[]>>((acc, document) => {
      const key = `${document.stage}:${document.document_type}`;
      acc[key] = [...(acc[key] ?? []), document];
      return acc;
    }, {});
  }, [documents]);

  function appendFiles(nextFiles: FileList | File[]) {
    const incoming = Array.from(nextFiles);
    setFiles((current) => [...current, ...incoming]);
  }

  function submitUpload() {
    const invalidFile = files.find((file) => !allowedMimeTypes.has(file.type));

    if (invalidFile) {
      toast.error(`Tipo de arquivo nao permitido: ${invalidFile.name}`);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const uploadedFiles: Array<{
        file_path: string;
        file_name: string;
        file_size: number;
        mime_type: string;
      }> = [];

      for (const file of files) {
        const filePath = buildCaseFilePath({
          officeId,
          caseId,
          stage,
          documentType,
          fileName: file.name
        });

        const { error: uploadError } = await supabase.storage.from("aa-case-files").upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

        if (uploadError) {
          if (uploadedFiles.length > 0) {
            await cleanupUploadedCaseFilesAction(uploadedFiles.map((item) => item.file_path));
          }

          toast.error(`Nao foi possivel enviar ${file.name}.`);
          return;
        }

        uploadedFiles.push({
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });
      }

      const result = await registerUploadedCaseDocumentsAction({
        case_id: caseId,
        document_type: documentType,
        stage,
        files: uploadedFiles
      });

      if (result.ok) {
        toast.success(result.message);
        setFiles([]);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function removeDocument(document: CaseDocument) {
    startTransition(async () => {
      const result = await removeCaseDocumentAction(document.id, document.case_id, document.file_path);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border bg-white p-4 shadow-subtle md:grid-cols-[0.8fr_0.8fr_1.2fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Tipo</p>
          <Select value={documentType} onValueChange={(value) => setDocumentType(value as CaseDocumentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedDocumentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {documentTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Etapa</p>
          <Select value={stage} onValueChange={(value) => setStage(value as CaseDocumentStage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedStages.map((item) => (
                <SelectItem key={item} value={item}>
                  {stageLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/35 p-4 text-center transition-colors hover:bg-muted/60"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            appendFiles(event.dataTransfer.files);
          }}
        >
          <UploadCloud className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF pesquisavel, TXT, imagens, DOC ou DOCX</p>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            multiple
            accept={acceptedTypes}
            onChange={(event) => {
              if (event.target.files) {
                appendFiles(event.target.files);
              }
            }}
          />
        </div>
        <Button type="button" disabled={files.length === 0 || isPending} onClick={submitUpload}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Enviar
        </Button>
      </div>

      {files.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <p className="mb-3 text-sm font-semibold">Fila de upload</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-muted/45 px-3 py-2 text-sm">
                <span className="truncate">{file.name}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(groupedDocuments).map(([key, items]) => {
          const [groupStage, groupType] = key.split(":") as [CaseDocumentStage, CaseDocumentType];
          return (
            <div key={key} className="rounded-lg border bg-white p-4 shadow-subtle">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{documentTypeLabels[groupType]}</p>
                  <p className="text-xs text-muted-foreground">{stageLabels[groupStage]}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{document.file_name}</p>
                      <p className="text-xs text-muted-foreground">{document.file_path}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Remover documento"
                      disabled={isPending}
                      onClick={() => removeDocument(document)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { documentTypeLabels, stageLabels };
