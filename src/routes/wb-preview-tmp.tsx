import { createFileRoute } from "@tanstack/react-router";
import { WorkboardContent } from "@/components/workboard/WorkboardContent";
export const Route = createFileRoute("/wb-preview-tmp")({ ssr: false, component: () => <div className="min-h-screen bg-wb-canvas"><WorkboardContent /></div> });
