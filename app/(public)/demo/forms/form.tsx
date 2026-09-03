"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect } from "react";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  useForm,
} from "react-hook-form";
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { DemoFormValues } from "@/lib/validation/demo";
import { demoFormSchema } from "@/lib/validation/demo";
import { messages } from "@/messages/da";
import { type DemoFormState, submitDemoForm } from "./actions";

const initialState: DemoFormState = { status: "idle" };

interface FieldRender<K extends keyof DemoFormValues> {
  field: ControllerRenderProps<DemoFormValues, K>;
  fieldState: ControllerFieldState;
}

function NameField({ field, fieldState }: FieldRender<"name">) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="demo-name">{messages.demo.fields.name}</FieldLabel>
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        autoComplete="name"
        id="demo-name"
        name={field.name}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

function EmailField({ field, fieldState }: FieldRender<"email">) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="demo-email">{messages.demo.fields.email}</FieldLabel>
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        autoComplete="email"
        id="demo-email"
        name={field.name}
        type="email"
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

function MessageField({ field, fieldState }: FieldRender<"message">) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="demo-message">
        {messages.demo.fields.message}
      </FieldLabel>
      <Textarea
        {...field}
        aria-invalid={fieldState.invalid}
        id="demo-message"
        name={field.name}
        placeholder={messages.demo.fields.messagePlaceholder}
        rows={4}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

export function DemoForm() {
  const [state, formAction, pending] = useActionState(
    submitDemoForm,
    initialState
  );
  const form = useForm<DemoFormValues>({
    defaultValues: { email: "", message: "", name: "" },
    resolver: zodResolver(demoFormSchema),
  });
  const handleSubmit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );

  useEffect(() => {
    if (state.status === "success") {
      form.reset();
      toast.add({ title: messages.demo.toastSuccess, type: "success" });
    }
    if (state.status === "error") {
      // The toast never names a field; field errors go through the field API (DESIGN.md).
      toast.add({ title: messages.demo.toastError, type: "error" });
      for (const [key, errs] of Object.entries(state.fieldErrors ?? {})) {
        if (errs?.length) {
          form.setError(key as keyof DemoFormValues, { message: errs[0] });
        }
      }
    }
  }, [state, form]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{messages.demo.title}</CardTitle>
        <CardDescription>{messages.demo.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "success" ? (
          <p className="text-muted-foreground text-sm">
            {messages.demo.successTitle} {messages.demo.successDescription}
          </p>
        ) : (
          <form id="demo-form" onSubmit={handleSubmit}>
            <FieldGroup>
              <Controller
                control={form.control}
                name="name"
                render={NameField}
              />
              <Controller
                control={form.control}
                name="email"
                render={EmailField}
              />
              <Controller
                control={form.control}
                name="message"
                render={MessageField}
              />
            </FieldGroup>
          </form>
        )}
      </CardContent>
      {state.status === "success" ? null : (
        <CardFooter>
          <Button disabled={pending} form="demo-form" type="submit">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? messages.demo.submitting : messages.demo.submit}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
