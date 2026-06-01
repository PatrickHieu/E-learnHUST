"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { downloadCertificatePdf } from "@/lib/certificate";

type Props = {
  courseTitle: string;
};

function CertificateButton({ courseTitle }: Props) {
  const { user } = useUser();

  const handleClick = () => {
    const name =
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress ||
      "Anonymous Learner";
    downloadCertificatePdf(name, courseTitle);
  };

  return (
    <Button
      variant="pixel"
      size="lg"
      className="font-game text-xl w-full gap-2 mt-2"
      onClick={handleClick}
    >
      <Award className="w-5 h-5" />
      Download Certificate
    </Button>
  );
}

export default CertificateButton;
