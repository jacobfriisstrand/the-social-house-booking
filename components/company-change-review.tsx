"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approveCompanyChange,
  type CompanyChangeReview as CompanyChangeReviewData,
} from "@/lib/companies/change-actions";
import { messages } from "@/messages/da";

const fields = Object.keys(messages.companyChangeReview.fields) as Array<
  keyof typeof messages.companyChangeReview.fields
>;

function ResultMessages({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-sm">{message}</p> : null}
    </>
  );
}

function ChangeTable({
  after,
  before,
}: {
  after: CompanyChangeReviewData["after"];
  before: CompanyChangeReviewData["before"];
}) {
  const changedFields = fields.filter(
    (field) => before[field] !== after[field]
  );
  if (changedFields.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {messages.companyChangeReview.noChanges}
      </p>
    );
  }
  return (
    <>
      <div className="grid grid-cols-3 gap-3 text-muted-foreground text-xs uppercase tracking-wider">
        <span />
        <span>{messages.companyChangeReview.before}</span>
        <span>{messages.companyChangeReview.after}</span>
      </div>
      {changedFields.map((field) => (
        <div
          className="grid grid-cols-3 gap-3 border-b pb-3 text-sm"
          key={field}
        >
          <span className="font-medium">
            {messages.companyChangeReview.fields[field]}
          </span>
          <span className="text-muted-foreground">{before[field] || "-"}</span>
          <span>{after[field] || "-"}</span>
        </div>
      ))}
    </>
  );
}

export function CompanyChangeReview({
  review,
  token,
}: {
  review: CompanyChangeReviewData;
  token: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const approve = useCallback(() => {
    startTransition(async () => {
      const result = await approveCompanyChange(review.requestId, token);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(
        result.email
          ? messages.companyChangeReview.emailChangeSent(result.email)
          : messages.companyChangeReview.success
      );
    });
  }, [review.requestId, token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.companyChangeReview.title}</CardTitle>
        <CardDescription>
          {messages.companyChangeReview.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChangeTable after={review.after} before={review.before} />
        <ResultMessages error={error} message={message} />
      </CardContent>
      <CardFooter>
        <Button
          disabled={pending || Boolean(message)}
          onClick={approve}
          type="button"
        >
          {pending
            ? messages.companyChangeReview.approving
            : messages.companyChangeReview.approve}
        </Button>
      </CardFooter>
    </Card>
  );
}
