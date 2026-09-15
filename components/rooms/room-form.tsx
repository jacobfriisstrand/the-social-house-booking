"use client";

import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GripVerticalIcon,
  ImageIcon,
  ImagePlusIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Control, useController, useForm } from "react-hook-form";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { formatKroner } from "@/lib/format";
import { type RoomFormState, saveRoom } from "@/lib/rooms/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  extensionOf,
  ROOM_IMAGE_BUCKET,
  ROOM_IMAGE_MAX_BYTES,
  ROOM_IMAGE_MAX_FILES,
  type RoomFormValues,
  type RoomImageUpload,
  roomFormSchema,
} from "@/lib/validation/rooms";
import { messages } from "@/messages/da";
import { OpeningHoursCard } from "./opening-hours-field";

// Acceptable image types, mirroring the picker input and storage bucket.
const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface AddonOption {
  addonId: string;
  name: string;
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

export interface RoomFormInitial {
  addonIds: string[];
  capacity: number;
  description: string;
  hourlyPriceOre: number;
  isActive: boolean;
  location: string;
  name: string;
  openingHours: RoomFormValues["openingHours"];
  practicalNotes: string;
  roomId: string;
}

interface RoomFormProps {
  addons: AddonOption[];
  // Pre-filled room in edit mode; absent in create mode.
  initial: RoomFormInitial | null;
  onRemoveImage?: (roomImageId: string) => Promise<void>;
  // Persists the display order of saved images after a drag; resolves
  // false when the server rejects it (the hosting sheet toasts).
  onReorderImages?: (orderedRoomImageIds: string[]) => Promise<boolean>;
  // Called after a successful save (the hosting sheet closes itself).
  onSaved?: () => void;
  // Saved photos (edit mode), shown in the same sortable list as the
  // picked files. Handlers come from the hosting sheet.
  savedImages?: Array<{
    fileName: string;
    fileSizeBytes: number;
    roomImageId: string;
    url: string;
  }>;
}

// Weekly defaults for a new room: weekdays 08:00-18:00, Sunday closed.
function defaultOpeningHours(): RoomFormValues["openingHours"] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    closes: "18:00",
    dayOfWeek,
    isClosed: dayOfWeek === 6,
    opens: "08:00",
  }));
}

// "House Service (500,00 kr)" / "Lunch (225,00 kr / person)".
function addonPriceLabel(addon: AddonOption): string {
  return addon.pricingModel === "per_participant"
    ? `${formatKroner(addon.priceOre)} ${messages.rooms.perParticipantSuffix}`
    : formatKroner(addon.priceOre);
}

interface AddonRowProps {
  addon: AddonOption;
  control: Control<RoomFormValues>;
}

// One add-on with its price as a hint; switch on = added to the room.
function AddonRow({ addon, control }: AddonRowProps) {
  const { field } = useController({ control, name: "addonIds" });
  const checked = field.value.includes(addon.addonId);

  const handleCheckedChange = useCallback(
    (isChecked: boolean): void => {
      field.onChange(
        isChecked
          ? [...field.value, addon.addonId]
          : field.value.filter((id) => id !== addon.addonId)
      );
    },
    [addon.addonId, field]
  );

  return (
    <Field orientation="horizontal">
      <Switch
        checked={checked}
        id={`room-addon-${addon.addonId}`}
        onCheckedChange={handleCheckedChange}
      />
      <FieldLabel
        className="font-normal"
        htmlFor={`room-addon-${addon.addonId}`}
      >
        {addon.name}
        <span className="text-muted-foreground text-xs">
          {addonPriceLabel(addon)}
        </span>
      </FieldLabel>
    </Field>
  );
}

interface PickedFile {
  file: File;
  id: string;
  previewUrl: string;
}

// One image in the sortable Billeder list: an already saved photo (edit
// mode, persisted by room image id) or a locally picked file (uploaded on
// submit). The id doubles as the dnd-kit sortable id.
type RoomImageItem =
  | {
      fileName: string;
      fileSizeBytes: number;
      id: string;
      kind: "picked";
      previewUrl: string;
    }
  | {
      fileName: string;
      fileSizeBytes: number;
      id: string;
      kind: "saved";
      url: string;
    };

// Best-effort cleanup of storage paths after a failed save/upload; errors
// are swallowed (the orphaned bytes are harmless, the dangling path is not).
function removeStoragePaths(paths: string[]): void {
  if (paths.length === 0) {
    return;
  }
  createClient()
    .storage.from(ROOM_IMAGE_BUCKET)
    .remove(paths)
    .catch(() => undefined);
}

// Upload a batch of picked images to storage, one per path under the room,
// carrying the original name and size for the room_images rows. Any failure
// returns the paths uploaded so far with ok=false so the caller can roll
// back; the bucket enforces mime + size.
async function uploadPickedImages(
  roomId: string,
  files: PickedFile[]
): Promise<{ images: RoomImageUpload[]; ok: boolean; paths: string[] }> {
  const supabase = createClient();
  const uploads = files.map(async (entry) => {
    const path = `rooms/${roomId}/${crypto.randomUUID()}.${extensionOf(entry.file.type)}`;
    const { error } = await supabase.storage
      .from(ROOM_IMAGE_BUCKET)
      .upload(path, entry.file);
    return error
      ? null
      : {
          fileName: entry.file.name,
          path,
          sizeBytes: entry.file.size,
        };
  });
  const uploaded = await Promise.all(uploads);
  const images = uploaded.filter(
    (image): image is RoomImageUpload => image !== null
  );
  return {
    images,
    ok: images.length === uploaded.length,
    paths: images.map((image) => image.path),
  };
}

// "320 KB" / "1,2 MB" — size line under the file name.
function fileSizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replaceAll(".", ",")} MB`;
}

interface SortableRoomImageProps {
  index: number;
  item: RoomImageItem;
  onRemovePicked: (pickedId: string) => void;
  onRemoveSaved?: (roomImageId: string) => Promise<void>;
  roomName?: string;
}

// One draggable image row: a grip handle (the only drag activator, so the
// delete button and the rest of the row stay untouched) plus a delete
// action, full-width in the vertical list. Both saved photos and picked
// files show name and size; picked previews use a local object URL, so the
// image optimizer is skipped for them.
function SortableRoomImage({
  index,
  item,
  onRemovePicked,
  onRemoveSaved,
  roomName,
}: SortableRoomImageProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const sortable = useSortable({
    id: item.id,
    index,
    modifiers: [RestrictToVerticalAxis],
  });

  const handleRemove = useCallback((): void => {
    if (item.kind === "picked") {
      onRemovePicked(item.id);
      return;
    }
    if (!onRemoveSaved) {
      return;
    }
    setIsRemoving(true);
    // Errors and toasts live in the hosting sheet; the row disappears on
    // the refresh that follows a successful delete.
    onRemoveSaved(item.id)
      .catch(() => undefined)
      .finally(() => {
        setIsRemoving(false);
      });
  }, [item, onRemovePicked, onRemoveSaved]);

  return (
    <Attachment
      className={cn("w-full", sortable.isDragging && "opacity-50")}
      orientation="horizontal"
      ref={sortable.ref}
      size="sm"
    >
      <AttachmentMedia variant="image">
        {item.kind === "picked" ? (
          // Local object URL — the optimizer cannot fetch blob:, so skip it.
          <Image
            alt={item.fileName}
            className="object-cover"
            height={96}
            src={item.previewUrl}
            unoptimized
            width={96}
          />
        ) : (
          <Image
            alt={messages.rooms.imageAlt.replace("{name}", roomName ?? "")}
            height={96}
            src={item.url}
            width={96}
          />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{item.fileName}</AttachmentTitle>
        <AttachmentDescription>
          {fileSizeLabel(item.fileSizeBytes)}
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction
          aria-label={messages.rooms.imageDragHandle}
          className="cursor-grab active:cursor-grabbing"
          ref={sortable.handleRef}
        >
          <GripVerticalIcon aria-hidden="true" />
        </AttachmentAction>
        <AttachmentAction
          aria-label={messages.rooms.imageDelete}
          onClick={handleRemove}
          pending={isRemoving}
        >
          {isRemoving ? null : <XIcon aria-hidden="true" />}
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

interface ActiveFieldProps {
  control: Control<RoomFormValues>;
}

// Active toggle (edit mode): switch on = the room is bookable; off =
// deactivated rooms keep their booking and invoicing history (#3).
function ActiveField({ control }: ActiveFieldProps) {
  const { field } = useController({ control, name: "isActive" });

  return (
    <Field orientation="horizontal">
      <Switch
        checked={field.value}
        id="room-is-active"
        onCheckedChange={field.onChange}
      />
      <FieldLabel className="font-normal" htmlFor="room-is-active">
        {messages.rooms.activeLabel}
      </FieldLabel>
    </Field>
  );
}

interface ImagesCardProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageError?: string | null;
  onImageDragEnd: (event: DragEndEvent) => Promise<void>;
  onImagesDropped: (files: File[]) => void;
  onImagesPicked: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPicker: () => void;
  onRemovePicked: (pickedId: string) => void;
  onRemoveSaved?: (roomImageId: string) => Promise<void>;
  orderedItems: RoomImageItem[];
  roomName?: string;
}

// The Billeder card: the add-image trigger on its own — a click target and
// a drop target for files dragged in from outside the browser — above the
// sortable vertical list of image attachments (saved photos in edit mode
// plus picked files). Rejected files surface as a field error under the
// list (data-invalid + FieldError), not as a toast. Saved photos persist
// through onRemoveSaved and the list's drag handler; picked files upload on
// submit in their display order.
function ImagesCard({
  fileInputRef,
  imageError,
  onImageDragEnd,
  onImagesDropped,
  onImagesPicked,
  onOpenPicker,
  onRemovePicked,
  onRemoveSaved,
  orderedItems,
  roomName,
}: ImagesCardProps) {
  const [isFileOver, setIsFileOver] = useState(false);
  const handleFileDragOver = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    setIsFileOver(true);
  }, []);
  const handleFileDragLeave = useCallback((): void => {
    setIsFileOver(false);
  }, []);
  const handleFileDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      setIsFileOver(false);
      onImagesDropped(Array.from(event.dataTransfer.files));
    },
    [onImagesDropped]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.rooms.imagesSection}</CardTitle>
      </CardHeader>
      <CardContent>
        <Field className="gap-3" data-invalid={Boolean(imageError)}>
          <Attachment
            className={cn(
              "h-40 min-w-full items-center justify-center",
              isFileOver && "border-ring bg-muted/50"
            )}
            onDragLeave={handleFileDragLeave}
            onDragOver={handleFileDragOver}
            onDrop={handleFileDrop}
            orientation="vertical"
            size="sm"
            state="idle"
          >
            <AttachmentMedia variant="icon">
              <ImagePlusIcon aria-hidden="true" />
            </AttachmentMedia>
            <AttachmentContent className="max-h-fit text-center">
              <AttachmentTitle className="font-normal">
                {messages.rooms.imageUploadLabel}
              </AttachmentTitle>
            </AttachmentContent>
            <AttachmentTrigger
              aria-label={messages.rooms.imageUploadLabel}
              onClick={onOpenPicker}
            />
          </Attachment>
          {orderedItems.length > 0 ? (
            <DragDropProvider onDragEnd={onImageDragEnd}>
              <div className="flex flex-col gap-2">
                {orderedItems.map((item, index) => (
                  <SortableRoomImage
                    index={index}
                    item={item}
                    key={item.id}
                    onRemovePicked={onRemovePicked}
                    onRemoveSaved={onRemoveSaved}
                    roomName={roomName}
                  />
                ))}
              </div>
            </DragDropProvider>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ImageIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{messages.rooms.imageEmpty}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          {imageError ? (
            <FieldError errors={[{ message: imageError }]} />
          ) : (
            <FieldDescription>
              {messages.rooms.imagesHints.map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </FieldDescription>
          )}
          <input
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            multiple
            onChange={onImagesPicked}
            ref={fileInputRef}
            type="file"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

// The admin room form (issue #3): all room fields — basic info, price and
// capacity, weekly opening hours, add-on selection, and image picking.
// Files upload straight to storage on submit; the room action records them.
export function RoomForm({
  addons,
  initial,
  onSaved,
  savedImages,
  onReorderImages,
  onRemoveImage,
}: RoomFormProps) {
  const [state, formAction, pending] = useActionState(saveRoom, {
    status: "idle",
  } satisfies RoomFormState);
  const form = useForm<RoomFormValues>({
    defaultValues: {
      addonIds: initial?.addonIds ?? [],
      capacity: initial?.capacity ?? 10,
      description: initial?.description ?? "",
      hourlyPriceKroner: initial ? initial.hourlyPriceOre / 100 : 0,
      isActive: initial?.isActive ?? true,
      location: initial?.location ?? "",
      name: initial?.name ?? "",
      openingHours: initial?.openingHours ?? defaultOpeningHours(),
      practicalNotes: initial?.practicalNotes ?? "",
      roomId: initial?.roomId,
    },
    resolver: zodResolver(roomFormSchema),
  });
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  // Strip order after the latest drag (item ids); null until the first
  // drag, so the default saved-then-picked order applies.
  const [imageOrder, setImageOrder] = useState<string[] | null>(null);
  // Inline validation error for the images field (size, type, count); a
  // later pick that passes clears it.
  const [imageError, setImageError] = useState<string | null>(null);
  // Mirror for callbacks that must read the current list without becoming a
  // dependency (object-URL bookkeeping runs there, not in state updaters).
  const pickedRef = useRef<PickedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Storage paths from the running submit, so a failed save can be rolled
  // back (uploaded bytes would otherwise orphan).
  const uploadedPathsRef = useRef<string[]>([]);
  useEffect(() => {
    pickedRef.current = pickedFiles;
  }, [pickedFiles]);
  useEffect(
    () => () => {
      for (const entry of pickedRef.current) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    },
    []
  );

  // Roll back uploaded bytes when content entry fails at the action.
  const rollbackUploaded = useCallback((): void => {
    const paths = uploadedPathsRef.current;
    if (paths.length === 0) {
      return;
    }
    uploadedPathsRef.current = [];
    removeStoragePaths(paths);
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      toast.add({ title: messages.rooms.savedToast, type: "success" });
      onSaved?.();
    }
    if (state.status === "error") {
      rollbackUploaded();
      toast.add({
        title: state.error ?? messages.rooms.saveFailed,
        type: "error",
      });
      for (const [key, errs] of Object.entries(state.fieldErrors ?? {})) {
        if ((errs as string[]).length > 0) {
          form.setError(key as keyof RoomFormValues, { message: errs[0] });
        }
      }
    }
  }, [state, form, onSaved, rollbackUploaded]);

  // Strip contents: saved photos first, then picked files. The last drag
  // result (imageOrder) overrides that default; ids unknown to it (new
  // picks, refreshed rows) fall back to their natural position.
  const { orderedItems, pickedInOrder } = useMemo(() => {
    const imageItems: RoomImageItem[] = [
      ...(savedImages ?? []).map(
        (image): RoomImageItem => ({
          fileName: image.fileName,
          fileSizeBytes: image.fileSizeBytes,
          id: image.roomImageId,
          kind: "saved",
          url: image.url,
        })
      ),
      ...pickedFiles.map(
        (picked): RoomImageItem => ({
          fileName: picked.file.name,
          fileSizeBytes: picked.file.size,
          id: picked.id,
          kind: "picked",
          previewUrl: picked.previewUrl,
        })
      ),
    ];
    const itemById = new Map(imageItems.map((item) => [item.id, item]));
    const orderedIds = imageOrder ?? imageItems.map((item) => item.id);
    const orderedSet = new Set(orderedIds);
    const ordered = [
      ...orderedIds.flatMap((id) => {
        const item = itemById.get(id);
        return item ? [item] : [];
      }),
      ...imageItems.filter((item) => !orderedSet.has(item.id)),
    ];
    // Picked files upload in their display order, so new images land on
    // the server where the list shows them (after the saved photos).
    const pickedById = new Map(pickedFiles.map((file) => [file.id, file]));
    const pickedFilesInOrder = ordered.flatMap((item) => {
      const picked = item.kind === "picked" ? pickedById.get(item.id) : null;
      return picked ? [picked] : [];
    });
    return { orderedItems: ordered, pickedInOrder: pickedFilesInOrder };
  }, [imageOrder, pickedFiles, savedImages]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const roomId = initial?.roomId ?? crypto.randomUUID();
    setUploading(true);
    const uploaded = await uploadPickedImages(roomId, pickedInOrder);
    if (!uploaded.ok) {
      removeStoragePaths(uploaded.paths);
      toast.add({
        title: messages.rooms.imageActionFailed,
        type: "error",
      });
      setUploading(false);
      return;
    }
    uploadedPathsRef.current = uploaded.paths;
    setUploading(false);
    startTransition(() => {
      formAction({
        images: uploaded.images,
        isNew: !initial,
        // Create mode: the client-chosen id is the storage path room too;
        // the action inserts the row with it (see saveCreateRoomRow).
        values: { ...values, roomId },
      });
    });
  });

  // Add picked files (file picker or drop) within the room's image cap —
  // saved photos count too, because the picked files are saved on top of
  // them. Oversized or non-image files are rejected with an inline field
  // error — a toast would hide behind the sheet, the Billeder field does
  // not. Object URLs are revoked on remove and unmount.
  const addPickedFiles = useCallback(
    (files: File[]): void => {
      if (files.length === 0) {
        return;
      }
      const oversized = files.some((file) => file.size > ROOM_IMAGE_MAX_BYTES);
      const unsupported = files.some(
        (file) => !IMAGE_MIME_TYPES.has(file.type)
      );
      const valid = files.filter(
        (file) =>
          file.size <= ROOM_IMAGE_MAX_BYTES && IMAGE_MIME_TYPES.has(file.type)
      );
      const slots = Math.max(
        0,
        ROOM_IMAGE_MAX_FILES -
          (savedImages?.length ?? 0) -
          pickedRef.current.length
      );
      if (oversized) {
        setImageError(messages.rooms.errors.imageMaxSize);
      } else if (unsupported) {
        setImageError(messages.rooms.errors.imageMimeType);
      } else if (valid.length > slots) {
        // Say how many were dropped: the files that fit are still added.
        setImageError(
          messages.rooms.errors.imageMaxCountAdded.replace(
            "{count}",
            String(valid.length - slots)
          )
        );
      } else {
        setImageError(null);
      }
      const created = valid.slice(0, slots).map((file) => ({
        file,
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
      }));
      setPickedFiles((current) => [...current, ...created]);
    },
    [savedImages]
  );

  const handleImagesPicked = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      addPickedFiles(Array.from(event.target.files ?? []));
      event.target.value = "";
    },
    [addPickedFiles]
  );

  const removePicked = useCallback((id: string): void => {
    const removed = pickedRef.current.find((entry) => entry.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    setPickedFiles((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const openImagePicker = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  // Drag end: remember the new strip order locally, then persist the saved
  // subset; a rejected reorder snaps the strip back to the previous order.
  const handleImageDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const reordered = move(orderedItems, event);
      const ids = reordered.map((item) => item.id);
      if (ids.every((id, index) => id === orderedItems[index]?.id)) {
        return;
      }
      const previousOrder = imageOrder;
      setImageOrder(ids);
      const savedIds = reordered.flatMap((item) =>
        item.kind === "saved" ? [item.id] : []
      );
      if (!onReorderImages || savedIds.length === 0) {
        return;
      }
      const persisted = await onReorderImages(savedIds);
      if (!persisted) {
        setImageOrder(previousOrder);
      }
    },
    [orderedItems, imageOrder, onReorderImages]
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{messages.rooms.basicSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="room-name">
              {messages.rooms.fields.name}
            </FieldLabel>
            <Input id="room-name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <FieldError errors={[form.formState.errors.name]} />
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="room-description">
              {messages.rooms.fields.description}
            </FieldLabel>
            <Textarea
              id="room-description"
              rows={4}
              {...form.register("description")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="room-location">
              {messages.rooms.fields.location}
            </FieldLabel>
            <Input
              id="room-location"
              placeholder="1. sal"
              {...form.register("location")}
            />
          </Field>
          {initial ? <ActiveField control={form.control} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.rooms.pricesSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            data-invalid={Boolean(form.formState.errors.hourlyPriceKroner)}
          >
            <FieldLabel htmlFor="room-price">
              {messages.rooms.fields.price}
            </FieldLabel>
            <Input
              id="room-price"
              inputMode="numeric"
              type="number"
              {...form.register("hourlyPriceKroner", { valueAsNumber: true })}
            />
            {form.formState.errors.hourlyPriceKroner ? (
              <FieldError errors={[form.formState.errors.hourlyPriceKroner]} />
            ) : null}
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.capacity)}>
            <FieldLabel htmlFor="room-capacity">
              {messages.rooms.fields.capacity}
            </FieldLabel>
            <FieldDescription>
              {messages.rooms.fields.capacityHint}
            </FieldDescription>
            <Input
              id="room-capacity"
              type="number"
              {...form.register("capacity", { valueAsNumber: true })}
            />
            {form.formState.errors.capacity ? (
              <FieldError errors={[form.formState.errors.capacity]} />
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="room-practical-notes">
              {messages.rooms.fields.practicalNotes}
            </FieldLabel>
            <Textarea
              id="room-practical-notes"
              placeholder={messages.rooms.fields.practicalNotesPlaceholder}
              rows={3}
              {...form.register("practicalNotes")}
            />
          </Field>
        </CardContent>
      </Card>

      <OpeningHoursCard form={form} />

      <Card>
        <CardHeader>
          <CardTitle>{messages.rooms.addonsSection}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {addons.map((addon) => (
              <AddonRow
                addon={addon}
                control={form.control}
                key={addon.addonId}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <ImagesCard
        fileInputRef={fileInputRef}
        imageError={imageError}
        onImageDragEnd={handleImageDragEnd}
        onImagesDropped={addPickedFiles}
        onImagesPicked={handleImagesPicked}
        onOpenPicker={openImagePicker}
        onRemovePicked={removePicked}
        onRemoveSaved={onRemoveImage}
        orderedItems={orderedItems}
        roomName={initial?.name}
      />

      <div className="flex justify-end">
        <Button pending={pending || uploading} type="submit">
          {pending || uploading ? messages.rooms.saving : messages.rooms.save}
        </Button>
      </div>
    </form>
  );
}
