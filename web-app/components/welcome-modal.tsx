"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setUserName, skipNameEntry, checkHasVisited } from "@/app/actions";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if this is the first visit
    const checkVisitStatus = async () => {
      try {
        const hasVisited = await checkHasVisited();
        if (!hasVisited) {
          setOpen(true);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error checking visit status:", error);
        setLoading(false);
      }
    };

    checkVisitStatus();
  }, []);

  const handleSubmit = async () => {
    try {
      await setUserName(name);
      setOpen(false);
      // Reload the page to apply the cookie changes
      window.location.reload();
    } catch (error) {
      console.error("Error setting user name:", error);
    }
  };

  const handleSkip = async () => {
    try {
      await skipNameEntry();
      setOpen(false);
      // Reload the page to apply the cookie changes
      window.location.reload();
    } catch (error) {
      console.error("Error skipping name entry:", error);
    }
  };

  // Don't render anything while checking cookie status
  if (loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Carten Tracker!</DialogTitle>
          <DialogDescription>
            Tell us your name to personalize your experience. This is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              placeholder="Enter your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmit}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
