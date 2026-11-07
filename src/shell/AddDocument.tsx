import { Camera, CircleAlert, FileText, FileUp, Sparkles, X } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { REGION_LIST, REGIONS, REGION_IDS, type RegionId } from "../../shared/regions.ts";
import type { Transcription } from "../../shared/types.ts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CaseDoc } from "../case/useCases.ts";
import { hashText } from "../format.ts";
import { apiPost, asApiError } from "../ui/index.ts";

const MIN_TEXT = 20;
const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2000;
const REGION_KEY = "readout:region";

type Mode = "file" | "text";

interface Picked {
  file: File;
  kind: "image" | "pdf";
  /** Object URL for the thumbnail and, later, the side-by-side check against the original. */
  url: string;
}

const readRegion = (): RegionId => {
  try {
    const v = localStorage.getItem(REGION_KEY);
    return (REGION_IDS as readonly string[]).includes(v ?? "") ? (v as RegionId) : "uk";
  } catch {
    return "uk";
  }
};

const kb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(blob);
  });
}

/** Photos are shrunk in the browser first: phone cameras produce 10 MB files, and the text stays readable at 2000 px. */
async function prepare(picked: Picked): Promise<{ media_type: "image/jpeg" | "application/pdf"; data: string }> {
  if (picked.kind === "pdf") return { media_type: "application/pdf", data: await toBase64(picked.file) };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(picked.file);
  } catch {
    throw new Error("Couldn't open this image. Use a JPG, PNG or WebP photo.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare this image.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("Couldn't prepare this image.");
  return { media_type: "image/jpeg", data: await toBase64(blob) };
}

/** Adds a document to the worklist: a photo or PDF, or pasted text, read with the template for the report's country. */
export function AddDocumentDialog({ open, onOpenChange, onOpen }: { open: boolean; onOpenChange: (open: boolean) => void; onOpen: (doc: CaseDoc) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      {/* The form mounts only while open, so each visit starts clean. */}
      <DialogContent
        className="tw max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => busy && e.preventDefault()}
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
      >
        <AddDocumentForm busy={busy} setBusy={setBusy} onOpen={onOpen} />
      </DialogContent>
    </Dialog>
  );
}

function AddDocumentForm({ busy, setBusy, onOpen }: { busy: boolean; setBusy: (busy: boolean) => void; onOpen: (doc: CaseDoc) => void }) {
  const [mode, setMode] = useState<Mode>("file");
  const [region, setRegion] = useState<RegionId>(readRegion);
  const [picked, setPicked] = useState<Picked>();
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const choose = (r: RegionId) => {
    setRegion(r);
    try {
      localStorage.setItem(REGION_KEY, r);
    } catch {
      /* private mode: the choice lasts for this visit */
    }
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf && !file.type.startsWith("image/")) return setError("Add a photo (JPG, PNG, WebP) or a PDF.");
    if (isPdf && file.size > MAX_PDF_BYTES) return setError(`This PDF is ${kb(file.size)}. PDFs can be up to ${kb(MAX_PDF_BYTES)}: try a photo of the page instead.`);
    setMode("file");
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked({ file, kind: isPdf ? "pdf" : "image", url: URL.createObjectURL(file) });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  };

  // A screenshot or copied picture can be pasted straight in.
  const onPaste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      pick(file);
    }
  };

  const ready = mode === "file" ? Boolean(picked) : text.trim().length >= MIN_TEXT;

  const submit = async () => {
    setError(undefined);
    setBusy(true);
    try {
      if (mode === "text") {
        const firstLine = text.trim().split("\n")[0]?.trim().slice(0, 60);
        onOpen({ id: `pasted-${hashText(text)}`, title: "Pasted document", description: firstLine, text, region });
        setText("");
        return;
      }
      if (!picked) return;
      const file = await prepare(picked);
      const read = await apiPost<Transcription>("/api/transcribe", { ...file, region });
      onOpen({
        id: `scan-${hashText(read.text)}`,
        title: picked.kind === "pdf" ? picked.file.name.replace(/\.pdf$/i, "") : "Photographed report",
        description: `${picked.kind === "pdf" ? "PDF" : "Photo"} · ${REGIONS[region].name}`,
        text: read.text,
        region,
        // The URL now belongs to the open case (it is never revoked here), so it outlives this form.
        source: { kind: picked.kind, url: picked.url, name: picked.file.name },
      });
      setPicked(undefined);
    } catch (err) {
      setError(asApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const clearPicked = () => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(undefined);
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
  };

  return (
    <div className="contents" onPaste={onPaste}>
      <DialogHeader className="gap-1.5">
        <DialogTitle className="font-heading text-xl font-bold tracking-tight">Add a document</DialogTitle>
        <DialogDescription>Photograph or upload a lab report, or paste its text. Readout reads it, standardises it and puts critical results first.</DialogDescription>
      </DialogHeader>

      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void submit();
          }}
          noValidate
        >
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="region">Where is the report from?</FieldLabel>
              <Select value={region} onValueChange={(v) => choose(v as RegionId)} disabled={busy}>
                <SelectTrigger id="region" className="w-full">
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {REGION_LIST.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{REGIONS[region].summary}. Readout uses this to read units, decimals and dates the way they are printed.</FieldDescription>
            </Field>

            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" disabled={busy}>
                  Photo or PDF
                </TabsTrigger>
                <TabsTrigger value="text" disabled={busy}>
                  Paste text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-4">
                <input ref={fileInput} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
                <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
                {picked ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                    {picked.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picked.url} alt="" className="size-14 shrink-0 rounded-md border bg-white object-cover" />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-white text-muted-foreground">
                        <FileText className="size-6" aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{picked.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {picked.kind === "pdf" ? "PDF" : "Photo"} · {kb(picked.file.size)}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={clearPicked} disabled={busy} aria-label="Remove file">
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => (e.preventDefault(), setDragging(true))}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
                      dragging ? "border-primary bg-primary/5" : "border-input bg-muted/30"
                    }`}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs">
                      <FileUp className="size-5" aria-hidden />
                    </span>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="rounded text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        Choose a photo or PDF
                      </button>
                      <p className="text-xs text-muted-foreground">or drag it here, or paste a screenshot. JPG, PNG, WebP or PDF up to 3 MB.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="sm:hidden" onClick={() => cameraInput.current?.click()}>
                      <Camera className="size-4" aria-hidden /> Take a photo
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-4">
                <Field>
                  <FieldLabel htmlFor="paste-input" className="sr-only">
                    Document text
                  </FieldLabel>
                  <Textarea
                    ref={textRef}
                    id="paste-input"
                    rows={9}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste a lab report, a lab-system export or a clinic letter…"
                    className="resize-y font-mono text-[0.78rem] leading-relaxed"
                    disabled={busy}
                  />
                  {text.length > 0 && text.trim().length < MIN_TEXT && <FieldDescription>At least {MIN_TEXT} characters.</FieldDescription>}
                </Field>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" role="alert">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6 flex-col items-stretch gap-2 sm:flex-col">
            <Button type="submit" size="lg" className="h-11 w-full" disabled={!ready || busy} style={{ background: "var(--ai-fill)" }}>
              {busy ? <Spinner /> : <Sparkles aria-hidden />}
              {busy ? (mode === "file" ? "Reading the document…" : "Analysing…") : "Analyse document"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Every value is checked against the original before it is shown.</p>
          </DialogFooter>
        </form>
      </div>
    </div>
  );
}
