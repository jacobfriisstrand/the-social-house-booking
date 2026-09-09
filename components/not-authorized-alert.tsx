import { Ban } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { messages } from "@/messages/da";

export const NotAuthorizedAlert = () => (
  <Alert className="w-fit" variant="info">
    <Ban />
    <AlertTitle>{messages.common.unauthorizedTitle}</AlertTitle>
    <AlertDescription>{messages.common.unauthorized}</AlertDescription>
  </Alert>
);
