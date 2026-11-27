"use client";
import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ItemForm } from "@/components/item-form";
import { api } from "@/lib/api-client";
import {
  ITEM_STATUSES,
  STATUS_LABEL,
  type Item,
  type ItemInput,
  type ItemStatus,
} from "@/shared/schemas/item";

type SortKey = "created_at" | "title" | "priority" | "due_date" | "status";
type ListResponse = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
};

function SortHead({
  k,
  sort,
  order,
  onSort,
  children,
}: {
  k: SortKey;
  sort: SortKey;
  order: "asc" | "desc";
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <TH>
      <button
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => onSort(k)}
      >
        {children}
        {sort === k &&
          (order === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </TH>
  );
}

export function ItemsManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search, 300);
  const [status, setStatus] = useState<ItemStatus | "">("");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const pageSize = 8;

  const params = new URLSearchParams({
    sort,
    order,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  const list = useQuery({
    queryKey: ["items", q, status, sort, order, page],
    queryFn: () => api<ListResponse>(`/api/items?${params}`),
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: (v: ItemInput) =>
      editing && editing !== "new"
        ? api<Item>(`/api/items/${editing.id}`, { method: "PATCH", body: v })
        : api<Item>("/api/items", { method: "POST", body: v }),
    onSuccess: () => {
      toast.success(editing === "new" ? "Item created" : "Item updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Item deleted");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (e) => toast.error(e.message),
  });

  function toggleSort(key: SortKey) {
    if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setOrder("asc");
    }
    setPage(1);
  }

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Items"
        subtitle="Example CRUD module: rename it to your domain entity."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            New item
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search title or description..."
          aria-label="Search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          className="w-44"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ItemStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState
          title="Could not load items"
          text={list.error.message}
          action={<Button onClick={() => list.refetch()}>Try again</Button>}
        />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={q || status ? "No items match your filters" : "No items yet"}
          text={
            q || status
              ? "Try a different search."
              : "Create your first item to get started."
          }
          action={
            !q && !status ? (
              <Button onClick={() => setEditing("new")}>New item</Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <SortHead k="title" sort={sort} order={order} onSort={toggleSort}>
                Title
              </SortHead>
              <SortHead
                k="status"
                sort={sort}
                order={order}
                onSort={toggleSort}
              >
                Status
              </SortHead>
              <SortHead
                k="priority"
                sort={sort}
                order={order}
                onSort={toggleSort}
              >
                Priority
              </SortHead>
              <SortHead
                k="due_date"
                sort={sort}
                order={order}
                onSort={toggleSort}
              >
                Due
              </SortHead>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {list.data.items.map((it) => (
              <TR key={it.id}>
                <TD>
                  <p className="font-medium">{it.title}</p>
                  {it.description && (
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {it.description}
                    </p>
                  )}
                </TD>
                <TD>
                  <Badge>{STATUS_LABEL[it.status]}</Badge>
                </TD>
                <TD>{it.priority}</TD>
                <TD>{it.dueDate ?? "-"}</TD>
                <TD className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${it.title}`}
                    onClick={() => setEditing(it)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${it.title}`}
                    onClick={() => setDeleting(it)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pages} ({total} items)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent title={editing === "new" ? "New item" : "Edit item"}>
          {editing && (
            <ItemForm
              item={editing === "new" ? undefined : editing}
              onSubmit={async (v) => {
                await save.mutateAsync(v);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent
          title="Delete item?"
          description={`"${deleting?.title}" will be permanently removed.`}
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
