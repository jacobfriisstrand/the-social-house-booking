import { CircleCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { messages } from "@/messages/da";

// The confirmation a newly signed-up company sees on Hjem after the
// invitation flow lands them logged in (?signup=1, app/(public)/set-password).
export const SignupCompleteAlert = () => (
  <Alert className="w-fit" variant="info">
    <CircleCheck />
    <AlertTitle>{messages.home.signupTitle}</AlertTitle>
    <AlertDescription>{messages.home.signupDescription}</AlertDescription>
  </Alert>
);
