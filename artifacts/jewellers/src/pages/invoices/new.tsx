import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCreateInvoice, getListInvoicesUrl, listInvoices } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatIndianCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, ArrowLeft, Calculator, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const DRAFT_KEY = "ssj_invoice_draft";

function getSavedMakingPct(): number {
  try { return Number(localStorage.getItem("ssj_making_pct") || 0); } catch { return 0; }
}

const itemSchema = z.object({
  itemType: z.string().optional(),
  description: z.string().min(1, "Description required"),
  grossWeight: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().positive().optional()),
  netWeight: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().positive().optional()),
  sellingPricePerGram: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().positive().optional()),
  gemstonePrice: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(0).optional()),
  amount: z.preprocess((v) => Number(v), z.number().min(0)),
  makingChargePercent: z.preprocess((v) => Number(v), z.number().min(0).max(100)),
  makingChargeAmount: z.preprocess((v) => Number(v), z.number().min(0)),
  gstJewel: z.preprocess((v) => Number(v), z.number().min(0)),
  gstMaking: z.preprocess((v) => Number(v), z.number().min(0)),
  itemTotal: z.preprocess((v) => Number(v), z.number().min(0)),
  hsnCode: z.string().optional(),
});

const invoiceSchema = z.object({
  customerName: z.string().min(1, "Customer name required"),
  customerAddress: z.string().optional(),
  customerGstin: z
    .string()
    .optional()
    .refine((v) => !v || GSTIN_REGEX.test(v.toUpperCase()), {
      message: "Invalid GSTIN format (e.g. 07AABCS1429B1ZP)",
    }),
  invoiceDate: z.string().min(1, "Date required"),
  items: z.array(itemSchema).min(1, "At least one item required"),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;
type ItemForm = z.infer<typeof itemSchema>;

const defaultItem = (): ItemForm => ({
  itemType: "",
  description: "",
  grossWeight: undefined,
  netWeight: undefined,
  sellingPricePerGram: undefined,
  gemstonePrice: undefined,
  amount: 0,
  makingChargePercent: getSavedMakingPct(),
  makingChargeAmount: 0,
  gstJewel: 0,
  gstMaking: 0,
  itemTotal: 0,
  hsnCode: "7113",
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function InvoiceNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasDraft, setHasDraft] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout>>();
  const onSubmitRef = useRef<(data: InvoiceForm) => void>(() => {});

  // Fetch past invoices for customer name autocomplete
  const { data: allInvoices } = useQuery({
    queryKey: [getListInvoicesUrl(), "autocomplete"],
    queryFn: () => listInvoices(),
    staleTime: 60_000,
  });
  const customerSuggestions = [...new Set((allInvoices ?? []).map((inv) => inv.customerName))].sort();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
      customerGstin: "",
      invoiceDate: today(),
      items: [defaultItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });

  // Check for saved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as InvoiceForm;
        if (parsed?.customerName || (parsed?.items?.length ?? 0) > 1) {
          setHasDraft(true);
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Auto-save draft (debounced 1.5s)
  const formValues = watch();
  useEffect(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formValues));
    }, 1500);
    return () => clearTimeout(draftTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)]);

  // Keyboard shortcut: Ctrl+Enter = submit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(onSubmitRef.current)();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSubmit]);

  // Auto-recalculate derived fields when inputs change
  useEffect(() => {
    items.forEach((item, idx) => {
      const netWeight = Number(item.netWeight) || 0;
      const sellingPricePerGram = Number(item.sellingPricePerGram) || 0;
      const gemstonePrice = Number(item.gemstonePrice) || 0;
      const makingChargePercent = Number(item.makingChargePercent) || 0;

      // Metal cost = Net Weight x Rate/g (auto if both provided)
      const metalCost =
        netWeight > 0 && sellingPricePerGram > 0
          ? parseFloat((netWeight * sellingPricePerGram).toFixed(2))
          : 0;

      let amount: number;
      if (netWeight > 0 && sellingPricePerGram > 0) {
        amount = parseFloat((metalCost + gemstonePrice).toFixed(2));
        setValue(`items.${idx}.amount`, amount, { shouldDirty: true });
      } else {
        amount = Number(item.amount) || 0;
      }

      const makingChargeAmount = parseFloat((amount * makingChargePercent / 100).toFixed(2));
      const gstJewel = parseFloat((amount * 0.03).toFixed(2));
      const gstMaking = parseFloat((makingChargeAmount * 0.05).toFixed(2));
      const itemTotal = parseFloat((amount + makingChargeAmount).toFixed(2));

      setValue(`items.${idx}.makingChargeAmount`, makingChargeAmount, { shouldDirty: true });
      setValue(`items.${idx}.gstJewel`, gstJewel, { shouldDirty: true });
      setValue(`items.${idx}.gstMaking`, gstMaking, { shouldDirty: true });
      setValue(`items.${idx}.itemTotal`, itemTotal, { shouldDirty: true });

      // Persist making % as default for next invoice
      if (makingChargePercent > 0) {
        localStorage.setItem("ssj_making_pct", String(makingChargePercent));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items.map((i) => `${i.netWeight}|${i.sellingPricePerGram}|${i.gemstonePrice}|${i.amount}|${i.makingChargePercent}`).join(","),
  ]);

  const totals = (items ?? []).reduce(
    (acc, item) => {
      acc.subtotal += Number(item.amount) || 0;
      acc.making += Number(item.makingChargeAmount) || 0;
      acc.gstJewel += Number(item.gstJewel) || 0;
      acc.gstMaking += Number(item.gstMaking) || 0;
      return acc;
    },
    { subtotal: 0, making: 0, gstJewel: 0, gstMaking: 0 },
  );
  const grandTotal = totals.subtotal + totals.making + totals.gstJewel + totals.gstMaking;

  const { mutate: createInvoice, isPending } = useCreateInvoice({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [getListInvoicesUrl()] });
        localStorage.removeItem(DRAFT_KEY);
        toast({ title: `Invoice ${data.invoiceNumber} created!` });
        setLocation(`/invoices/${data.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create invoice", variant: "destructive" });
      },
    },
  });

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        reset(JSON.parse(saved));
        setHasDraft(false);
        toast({ title: "Draft restored" });
      }
    } catch { /* ignore */ }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const onSubmit = (data: InvoiceForm) => {
    createInvoice({
      data: {
        customerName: data.customerName,
        customerAddress: data.customerAddress || undefined,
        customerGstin: data.customerGstin?.toUpperCase() || undefined,
        invoiceDate: data.invoiceDate,
        items: data.items.map((item) => ({
          itemType: item.itemType || undefined,
          description: item.description,
          grossWeight: item.grossWeight,
          netWeight: item.netWeight,
          sellingPricePerGram: item.sellingPricePerGram,
          gemstonePrice: item.gemstonePrice,
          amount: Number(item.amount),
          makingChargePercent: Number(item.makingChargePercent),
          makingChargeAmount: Number(item.makingChargeAmount),
          gstJewel: Number(item.gstJewel),
          gstMaking: Number(item.gstMaking),
          itemTotal: Number(item.itemTotal),
          hsnCode: item.hsnCode || undefined,
        })),
      },
    });
  };

  // Keep ref in sync so keyboard shortcut always calls latest onSubmit
  onSubmitRef.current = onSubmit;

  return (
    <Layout>
      {/* Datalist for customer name autocomplete */}
      <datalist id="customer-names">
        {customerSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocation("/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
            <p className="text-muted-foreground text-sm">Create a GST-compliant jewellery invoice</p>
          </div>
        </div>

        {/* Draft restore banner */}
        {hasDraft && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span>You have an unsaved draft from a previous session.</span>
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={restoreDraft}>
                Restore
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={discardDraft}
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Customer Details */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Customer Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Amit Kumar"
                list="customer-names"
                autoComplete="off"
                {...register("customerName")}
              />
              {errors.customerName && (
                <p className="text-xs text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date <span className="text-destructive">*</span></Label>
              <Input type="date" {...register("invoiceDate")} />
              {errors.invoiceDate && (
                <p className="text-xs text-destructive">{errors.invoiceDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Customer Address</Label>
              <Input placeholder="123 Main St, Delhi" {...register("customerAddress")} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer GSTIN</Label>
              <Input
                placeholder="07AABCS1429B1ZP (optional)"
                className="font-mono uppercase"
                {...register("customerGstin")}
              />
              {errors.customerGstin && (
                <p className="text-xs text-destructive">{errors.customerGstin.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Items</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(defaultItem())}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}

          <div className="space-y-6">
            {fields.map((field, idx) => (
              <ItemRow
                key={field.id}
                idx={idx}
                register={register}
                errors={errors}
                items={items}
                watch={watch}
                onRemove={fields.length > 1 ? () => remove(idx) : undefined}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
            Invoice Summary
          </h2>
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jewel Value</span>
                <span className="font-mono">{formatIndianCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Making Charges</span>
                <span className="font-mono">{formatIndianCurrency(totals.making)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST on Jewel (3%)</span>
                <span className="font-mono">{formatIndianCurrency(totals.gstJewel)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST on Making (5%)</span>
                <span className="font-mono">{formatIndianCurrency(totals.gstMaking)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span className="text-primary font-mono">{formatIndianCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => setLocation("/invoices")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} title="Ctrl+Enter to submit">
            {isPending ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Layout>
  );
}

function ItemRow({
  idx,
  register,
  errors,
  items,
  watch,
  onRemove,
}: {
  idx: number;
  register: ReturnType<typeof useForm<InvoiceForm>>["register"];
  errors: ReturnType<typeof useForm<InvoiceForm>>["formState"]["errors"];
  items: ItemForm[];
  watch: ReturnType<typeof useForm<InvoiceForm>>["watch"];
  onRemove?: () => void;
}) {
  const item = items[idx] ?? {};
  const e = errors.items?.[idx];

  return (
    <div className="border rounded-lg p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Item {idx + 1}</span>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-2 space-y-1">
          <Label className="text-xs">
            Description <span className="text-destructive">*</span>
          </Label>
          <Input placeholder="Gold Ring 22K" {...register(`items.${idx}.description`)} />
          {e?.description && (
            <p className="text-xs text-destructive">{e.description.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Input placeholder="Ring / Chain…" {...register(`items.${idx}.itemType`)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Gross Wt (g)</Label>
          <Input
            type="number"
            step="0.001"
            placeholder="5.500"
            {...register(`items.${idx}.grossWeight`)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Net Wt (g)</Label>
          <Input
            type="number"
            step="0.001"
            placeholder="5.100"
            {...register(`items.${idx}.netWeight`)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rate/gram (₹)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="6500"
            {...register(`items.${idx}.sellingPricePerGram`)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gemstone (₹)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0"
            {...register(`items.${idx}.gemstonePrice`)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">
            Amount (₹)
            {Number(item.netWeight) > 0 && Number(item.sellingPricePerGram) > 0 ? (
              <span className="ml-1 text-muted-foreground">(Metal + Gemstone)</span>
            ) : (
              <span className="ml-1 text-muted-foreground">(Enter directly)</span>
            )}
          </Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Auto-calculated or enter manually"
            {...register(`items.${idx}.amount`)}
            className="font-mono"
            readOnly={Number(item.netWeight) > 0 && Number(item.sellingPricePerGram) > 0}
          />
          {e?.amount && <p className="text-xs text-destructive">{e.amount.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Making %</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="10"
            {...register(`items.${idx}.makingChargePercent`)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">HSN Code</Label>
          <Input
            placeholder="7113"
            className="font-mono"
            {...register(`items.${idx}.hsnCode`)}
          />
        </div>
      </div>

      {/* Computed row */}
      <div className="bg-muted/50 rounded-md px-3 py-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <Calculator className="h-3 w-3 inline mr-1" />
          Making:{" "}
          <span className="font-medium text-foreground">
            {formatIndianCurrency(Number(item.makingChargeAmount) || 0)}
          </span>
        </span>
        <span>
          GST Jewel (3%):{" "}
          <span className="font-medium text-foreground">
            {formatIndianCurrency(Number(item.gstJewel) || 0)}
          </span>
        </span>
        <span>
          GST Making (5%):{" "}
          <span className="font-medium text-foreground">
            {formatIndianCurrency(Number(item.gstMaking) || 0)}
          </span>
        </span>
        <span className="font-semibold text-foreground">
          Item Total:{" "}
          <span className="text-primary">
            {formatIndianCurrency(Number(item.itemTotal) || 0)}
          </span>
        </span>
      </div>
    </div>
  );
}
