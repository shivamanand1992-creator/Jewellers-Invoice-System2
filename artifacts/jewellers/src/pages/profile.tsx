import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getProfile,
  getGetProfileUrl,
  useUpsertProfile,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const profileSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  shopAddress: z.string().min(1, "Address is required"),
  gstNumber: z
    .string()
    .min(1, "GST number is required")
    .regex(GSTIN_REGEX, "Invalid GSTIN format (e.g. 07AABCS1429B1ZP)"),
  upiId: z.string().min(1, "UPI ID is required"),
  state: z.string().min(1, "State is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: [getGetProfileUrl()],
    queryFn: () => getProfile(),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      shopName: "",
      shopAddress: "",
      gstNumber: "",
      upiId: "",
      state: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        shopName: profile.shopName,
        shopAddress: profile.shopAddress,
        gstNumber: profile.gstNumber,
        upiId: profile.upiId,
        state: profile.state,
        phone: profile.phone ?? "",
        email: profile.email ?? "",
      });
    }
  }, [profile, reset]);

  const { mutate: upsertProfile, isPending } = useUpsertProfile({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData([getGetProfileUrl()], data);
        toast({ title: "Shop profile saved successfully" });
        reset({
          shopName: data.shopName,
          shopAddress: data.shopAddress,
          gstNumber: data.gstNumber,
          upiId: data.upiId,
          state: data.state,
          phone: data.phone ?? "",
          email: data.email ?? "",
        });
      },
      onError: () => {
        toast({ title: "Failed to save profile", variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: ProfileForm) => {
    upsertProfile({
      data: {
        shopName: data.shopName,
        shopAddress: data.shopAddress,
        gstNumber: data.gstNumber,
        upiId: data.upiId,
        state: data.state,
        phone: data.phone || undefined,
        email: data.email || undefined,
      },
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shop Profile</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            This information appears on your invoices and PDFs
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">Business Details</h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shopName">
                    Shop Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="shopName"
                    placeholder="S.S. Jewellers"
                    {...register("shopName")}
                  />
                  {errors.shopName && (
                    <p className="text-xs text-destructive">{errors.shopName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select state…" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive">{errors.state.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shopAddress">
                  Shop Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="shopAddress"
                  placeholder="123 Jewellers Market, Karol Bagh, Delhi"
                  {...register("shopAddress")}
                />
                {errors.shopAddress && (
                  <p className="text-xs text-destructive">{errors.shopAddress.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gstNumber">
                    GST Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="gstNumber"
                    placeholder="07AABCS1429B1ZP"
                    className="font-mono uppercase"
                    {...register("gstNumber")}
                  />
                  {errors.gstNumber && (
                    <p className="text-xs text-destructive">{errors.gstNumber.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upiId">
                    UPI ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="upiId"
                    placeholder="ssjewellers@upi"
                    {...register("upiId")}
                  />
                  {errors.upiId && (
                    <p className="text-xs text-destructive">{errors.upiId.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    {...register("phone")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@ssjewellers.com"
                    {...register("email")}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isPending || !isDirty}>
                  <Save className="h-4 w-4 mr-2" />
                  {isPending ? "Saving…" : "Save Profile"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
