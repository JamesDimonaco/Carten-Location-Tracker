"use client";
import { genUploader } from "uploadthing/client";
import { toast } from "sonner";

import { useState, useEffect, useRef } from "react";
import { PaperclipIcon, Send, Loader2 } from "lucide-react";
import { getUserName, submitComment } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setUserName } from "@/app/actions";
import { useFormStatus } from "react-dom";
import Image from "next/image";

interface Comment {
  id: number;
  content: string;
  name?: string;
  image_url?: string;
  created_at: string;
}

function SubmitButton({ imageReady }: { imageReady: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !imageReady}>
      <Send className="w-5 h-5" />
    </Button>
  );
}

export function CommentsSection() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [userName, setUserNameState] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const checkUserName = async () => {
      const name = await getUserName();
      setUserNameState(name);
    };
    checkUserName();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/comments`);

    ws.onmessage = (event) => {
      const comment = JSON.parse(event.data);
      setComments((prev) => [comment, ...prev]);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  async function handleSubmit(formData: FormData) {
    if (!userName) {
      setShowNameModal(true);
      return;
    }

    formData.append("name", userName);
    formData.append("imageUrl", imageUrl);
    console.log(formData);

    const result = await submitComment(formData);
    if (result?.success) {
      setImageUrl("");
    }
  }

  const handleNameSubmit = async () => {
    if (tempName.trim()) {
      await setUserName(tempName);
      setUserNameState(tempName);
      setShowNameModal(false);
      setTempName("");
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto w-full">
      <form action={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            name="content"
            placeholder="Write a comment..."
            className="flex-1"
          />
          <PaperclipIcon
            onClick={() => {
              if (!imageReady) return;
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  genUploader()
                    .createUpload("imageUploader", { files: [file] })
                    .then((res) => {
                      setImageReady(false);
                      res.done().then((res) => {
                        setImageUrl(res[0].ufsUrl);
                        setImageReady(true);
                        toast.success("Image uploaded");
                        // Play sonar sound
                        const audio = new Audio("/sonar.mp3");
                        audio.play().catch(() => {});
                      });
                    });
                }
              };
              input.click();
            }}
            className={`w-5 h-5 cursor-pointer my-auto transition-opacity ${
              !imageReady ? "opacity-50" : "hover:opacity-80"
            }`}
          />
          {!imageReady && <Loader2 className="w-5 h-5 animate-spin my-auto" />}
          <SubmitButton imageReady={imageReady} />
        </div>
        {imageUrl && (
          <div className="relative mt-2 inline-block">
            <Image
              src={imageUrl}
              alt="Uploaded image"
              width={100}
              height={100}
              className="rounded"
            />
            <div className="absolute inset-0 animate-sonar rounded" />
          </div>
        )}
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border rounded p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">
                {comment.name || "Anonymous"}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mb-2">{comment.content}</p>
            {comment.image_url && (
              <Image
                src={comment.image_url}
                alt="Comment attachment"
                className="max-w-sm rounded cursor-pointer hover:opacity-90 transition-opacity"
                width={100}
                height={100}
                onClick={() =>
                  comment.image_url && setSelectedImage(comment.image_url)
                }
              />
            )}
          </div>
        ))}
      </div>

      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Name Required</DialogTitle>
            <DialogDescription>
              Please enter your name to post a comment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleNameSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <Image
              src={selectedImage}
              alt="Full size image"
              className="w-full h-auto"
              width={1200}
              height={1200}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
