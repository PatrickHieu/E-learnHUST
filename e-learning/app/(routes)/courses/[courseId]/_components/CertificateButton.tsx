"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Award, Loader2 } from "lucide-react";
import { downloadCertificatePdf } from "@/lib/certificate";

type Props = {
  courseTitle: string;
};

function CertificateButton({ courseTitle }: Props) {
  const { user } = useUser();
  const [generating, setGenerating] = useState(false);

  const handleClick = async () => {
    if (generating) return;
    const name =
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress ||
      "Anonymous Learner";
    setGenerating(true);
    try {
      await downloadCertificatePdf(name, courseTitle);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate certificate. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="pixel"
      size="lg"
      className="font-game text-xl w-full gap-2 mt-2"
      onClick={handleClick}
      disabled={generating}
    >
      {generating ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Award className="w-5 h-5" />
      )}
      {generating ? "Preparing…" : "Download Certificate"}
    </Button>
  );
}

export default CertificateButton;
