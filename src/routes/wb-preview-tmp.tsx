import { createFileRoute } from "@tanstack/react-router";
import { WorkboardView } from "@/components/workboard/WorkboardView";
export const Route = createFileRoute("/wb-preview-tmp")({ ssr: false, component: WorkboardView });
