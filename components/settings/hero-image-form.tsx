"use client";

// Admin edit of the public split-screen hero image (#89): pick a PNG, JPEG
// or WebP up to 5 MB; Gem uploads it into the site-images bucket (client
// strategy, like the room photos) and swaps the site_images pointer through
// the server action. A failure after the upload removes the orphaned bytes
// best-effort — the pointer is authoritative.
import Image from "next/image";
import {
  type ChangeEvent,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  type PublicHeroState,
  updatePublicHeroImage,
} from "@/lib/settings/actions";
import { createClient } from "@/lib/supabase/client";
import { idleFormState } from "@/lib/validation/form-state";
import {
  type PublicHeroImageValues,
  SITE_IMAGE_BUCKET,
  SITE_IMAGE_MAX_BYTES,
} from "@/lib/validation/settings";
import { messages } from "@/messages/da";

const labels = messages.settings;

const IS_IMAGE_MIME: Record<string, true> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function HeroImageForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, formAction, actionPending] = useActionState<
    PublicHeroState,
    PublicHeroImageValues
  >(updatePublicHeroImage, idleFormState);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // The path uploaded for the running save, so a failed save can roll
  // back (the bytes would otherwise orphan).
  const uploadedPathsRef = useRef<string[]>([]);

  const openImagePicker = useCallback((): void => {
    inputRef.current?.click();
  }, []);

  const pending = uploading || actionPending;

  // Roll back uploaded bytes when the save fails at the action.
  const rollbackUploaded = useCallback((): void => {
    const paths = uploadedPathsRef.current;
    if (paths.length === 0) {
      return;
    }
    uploadedPathsRef.current = [];
    // Errors swallowed — a failed cleanup leaves harmless bytes in the
    // bucket.
    createClient()
      .storage.from(SITE_IMAGE_BUCKET)
      .remove(paths)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      uploadedPathsRef.current = [];
      setFile(null);
      toast.add({ title: labels.saved, type: "success" });
    }
    if (state.status === "error") {
      toast.add({ title: state.error, type: "error" });
      rollbackUploaded();
    }
  }, [state, rollbackUploaded]);

  const onPicked = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    // Read before the reset below clears the selection.
    const picked = event.target.files?.[0] ?? null;
    // Reset here, from the event: picking the same file again must fire.
    event.target.value = "";
    setError(null);
    if (!picked) {
      return;
    }
    // The same bounds the bucket enforces, said before the upload costs a
    // round trip.
    if (!IS_IMAGE_MIME[picked.type]) {
      setError(labels.errors.imageMimeType);
      return;
    }
    if (picked.size > SITE_IMAGE_MAX_BYTES) {
      setError(labels.errors.imageMaxSize);
      return;
    }
    setFile(picked);
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!file) {
      return;
    }
    const path = `hero/${crypto.randomUUID().replaceAll("-", "")}.${EXTENSIONS[file.type]}`;
    uploadedPathsRef.current = [path];
    setUploading(true);
    const { error: uploadError } = await createClient()
      .storage.from(SITE_IMAGE_BUCKET)
      .upload(path, file);
    setUploading(false);
    if (uploadError) {
      rollbackUploaded();
      toast.add({ title: labels.errors.saveFailed, type: "error" });
      return;
    }
    // Dispatch the save action in a transition (useActionState
    // requirement), as room-form does.
    startTransition(() =>
      formAction({ fileName: file.name, path, sizeBytes: file.size })
    );
  }, [file, formAction, rollbackUploaded]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-xs">
        {labels.heroImageDescription}
      </p>
      {currentUrl ? (
        <Image
          alt={labels.heroImageSection}
          className="h-40 w-full rounded-md border object-cover"
          height={160}
          src={currentUrl}
          width={320}
        />
      ) : null}
      <input
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPicked}
        ref={inputRef}
        type="file"
      />
      {file ? (
        <p className="text-muted-foreground text-xs">{file.name}</p>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={openImagePicker} type="button" variant="outline">
          {labels.pickImage}
        </Button>
        <Button
          disabled={!file}
          onClick={handleSave}
          pending={pending}
          type="button"
        >
          {pending ? labels.saving : labels.submit}
        </Button>
      </div>
    </div>
  );
}
