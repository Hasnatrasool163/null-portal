"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { applyFieldErrors } from "@/lib/api-client";
import {
  ITEM_STATUSES,
  STATUS_LABEL,
  itemInput,
  type Item,
  type ItemInput,
} from "@/shared/schemas/item";

/** Same zod schema as the API => identical rules on client and server. */
export function ItemForm({
  item,
  onSubmit,
  onCancel,
}: {
  item?: Item;
  onSubmit: (v: ItemInput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemInput),
    defaultValues: {
      title: item?.title ?? "",
      description: item?.description ?? "",
      status: item?.status ?? "todo",
      priority: item?.priority ?? 3,
      dueDate: item?.dueDate ?? null,
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        try {
          await onSubmit(v);
        } catch (e) {
          if (!applyFieldErrors(e, setError)) throw e;
        }
      })}
    >
      <Field label="Title" htmlFor="title" error={errors.title?.message}>
        <Input
          id="title"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
      </Field>
      <Field
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          aria-invalid={!!errors.description}
          {...register("description")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status" htmlFor="status" error={errors.status?.message}>
          <Select id="status" {...register("status")}>
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Priority"
          htmlFor="priority"
          error={errors.priority?.message}
        >
          <Select
            id="priority"
            {...register("priority", { valueAsNumber: true })}
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Due date"
          htmlFor="dueDate"
          error={errors.dueDate?.message}
        >
          <Input
            id="dueDate"
            type="date"
            {...register("dueDate", {
              setValueAs: (v) => (v === "" ? null : v),
            })}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {item ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
