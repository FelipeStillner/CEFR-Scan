"use client";

import { useRouter } from "next/navigation";
import { clearWorkflowSession } from "@/app/helpers/workflowSession";
import { scanRoutes } from "@/app/helpers/scanRoutes";

export function useScanSessionReset() {
  const router = useRouter();
  return () => {
    clearWorkflowSession();
    router.push(scanRoutes.home);
  };
}
