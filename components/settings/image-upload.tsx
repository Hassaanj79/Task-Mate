"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Uploads an image to a public bucket and reports back the public URL.
export function ImageUpload({
  bucket,
  pathPrefix,
  currentUrl,
  fallback,
  shape = "square",
  tint,
  onChange,
  disabled,
}: {
  bucket: "org-logos" | "avatars";
  pathPrefix: string; // e.g. orgId or userId (first folder segment)
  currentUrl: string | null;
  fallback: string;
  shape?: "square" | "circle";
  tint?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(currentUrl);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${pathPrefix}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(data.publicUrl);
      onChange(data.publicUrl);
      toast.success("Image updated");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    setUrl(null);
    onChange(null);
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex size-16 items-center justify-center overflow-hidden text-xl font-bold text-white",
          shape === "circle" ? "rounded-full" : "rounded-2xl",
        )}
        style={{ backgroundColor: tint ?? "var(--primary)" }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          fallback
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload
          </Button>
          {url && !disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={remove}>
              Remove
            </Button>
          )}
        </div>
        <span className="text-[11.5px] text-muted-foreground">
          PNG or JPG, at least 256×256px.
        </span>
      </div>
    </div>
  );
}
