"use client";
import { useState, useEffect, useRef } from "react";
import { Paperclip, Send } from "lucide-react";
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

interface Comment {
  id: number;
  content: string;
  name?: string;
  image_url?: string;
  created_at: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Send className="w-5 h-5" />
    </Button>
  );
}

export function CommentsSection() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [userName, setUserNameState] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const checkUserName = async () => {
      const name = await getUserName();
      setUserNameState(name);
    };
    checkUserName();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/comments"
    );

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
          <Input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="flex-1"
          />
          <SubmitButton />
        </div>
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
              <img
                src={comment.image_url}
                alt="Comment attachment"
                className="max-w-sm rounded"
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
    </div>
  );
}
