<template>
  <StoreShell bottom-bar :products="data.searchProducts" :categories="data.searchCategories" :product-total="data.searchProductTotal">
    <div class="mk-page pb-16 pt-1 sm:pt-6 lg:pb-[var(--mk-sec)]">
      <nav class="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground" :aria-label="messages.shop.product.breadcrumb">
        <a href="/" class="mk-link inline-flex min-h-11 shrink-0 items-center hover:text-foreground sm:min-h-0">{{ messages.shop.home }}</a>
        <ChevronRightIcon class="size-3.5 shrink-0" />
        <a href="/#products" class="mk-link inline-flex min-h-11 shrink-0 items-center hover:text-foreground sm:min-h-0">{{ data.categoryName || messages.shop.allProducts }}</a>
        <ChevronRightIcon class="size-3.5 shrink-0" />
        <span class="truncate text-foreground" aria-current="page">{{ data.name }}</span>
      </nav>

      <section class="mt-1 grid gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 xl:gap-20">
        <div class="min-w-0">
          <div class="lg:sticky lg:top-24">
            <div class="mk-card-media aspect-[4/3]">
              <img :src="data.coverImage || defaultProductImage" :alt="data.name" width="1200" height="900" class="size-full object-cover" fetchpriority="high" decoding="sync" />
            </div>
          </div>
        </div>

        <div class="min-w-0">
          <p class="mk-eyebrow text-muted-foreground">{{ data.categoryName || messages.productCheckout.defaultCategory }}</p>
          <h1 class="mk-h1 mt-2 break-words" data-testid="product-title">{{ data.name }}</h1>
          <p v-if="data.subtitle" class="mt-3 text-[15px] leading-7 text-muted-foreground">{{ data.subtitle }}</p>
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <p class="font-display text-[32px] font-semibold leading-none tabular-nums" aria-live="polite"><span class="mr-0.5 text-xl">¥</span>{{ selectedSku.price }}</p>
            <span v-if="isOutOfStock" class="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">{{ messages.shop.soldOut }}</span>
            <span v-else-if="isStockLimited && availableStock <= 5" class="rounded-full bg-[#fda084] px-3 py-1 text-xs font-semibold text-black">{{ t(messages.shop.lowStock, { count: availableStock }) }}</span>
            <span v-else class="inline-flex items-center gap-1.5 text-[13px] text-success"><span class="size-1.5 rounded-full bg-current" />{{ selectedSku.deliveryType === 'MANUAL' || selectedSku.deliveryType === 'EXPRESS' ? messages.shop.inStockManual : messages.shop.inStockReady }}</span>
          </div>

          <form id="mk-buy" class="mt-8 grid min-w-0 gap-7 border-t pt-7" novalidate @submit.prevent="submit">
            <div v-if="data.skus.length > 1" class="grid gap-3">
              <p class="text-sm font-semibold">{{ messages.shop.product.chooseSku }}<span class="ml-2 font-normal text-muted-foreground">{{ selectedSku.name }}</span></p>
              <div class="flex flex-wrap gap-2" role="group" :aria-label="messages.shop.product.chooseSku">
                <button
                  v-for="sku in data.skus"
                  :key="sku.id"
                  type="button"
                  :aria-pressed="String(sku.id) === selectedSkuId"
                  :data-testid="`sku-${sku.id}`"
                  class="min-h-11 rounded-full border px-5 py-2 text-left text-sm leading-5 transition-[background-color,border-color,color] duration-300 hover:border-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                  @click="selectedSkuId = String(sku.id)"
                >
                  {{ sku.name }}<span class="ml-2 tabular-nums opacity-70">¥{{ sku.price }}</span>
                </button>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div class="grid content-start gap-3">
                <p class="text-sm font-semibold"><span class="text-destructive">*</span> {{ messages.productCheckout.quantity }}</p>
                <div class="mk-qty inline-flex h-12 w-fit items-center rounded-full border has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-foreground has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-background">
                  <button type="button" class="grid size-12 place-items-center rounded-full transition-colors hover:bg-muted disabled:opacity-40" :aria-label="messages.shop.product.quantityDecrease" :disabled="quantity <= selectedSku.minBuy" @click="quantity = Math.max(selectedSku.minBuy, Number(quantity) - 1)"><MinusIcon class="size-4" /></button>
                  <input v-model.number="quantity" type="number" inputmode="numeric" :min="selectedSku.minBuy" :max="purchaseLimit" required :aria-label="messages.productCheckout.quantity" class="h-full w-12 bg-transparent text-center text-[15px] font-semibold tabular-nums outline-none" />
                  <button type="button" class="grid size-12 place-items-center rounded-full transition-colors hover:bg-muted disabled:opacity-40" :aria-label="messages.shop.product.quantityIncrease" :disabled="quantity >= purchaseLimit" @click="quantity = Math.min(purchaseLimit, Number(quantity) + 1)"><PlusIcon class="size-4" /></button>
                </div>
                <span v-if="isStockLimited" class="text-xs text-muted-foreground">{{ t(messages.productCheckout.availableStock, { count: availableStock }) }}</span>
              </div>
              <label for="buy-email" class="grid min-w-0 content-start gap-3 text-sm font-semibold"><span><span class="text-destructive" aria-hidden="true">*</span> {{ messages.productCheckout.contactEmail }}</span><Input id="buy-email" v-model="contactValue" type="email" autocomplete="email" required class="h-12" /></label>
            </div>

            <p v-if="requiresPayment && !methods.length" class="rounded-[18px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{{ messages.productCheckout.noPaymentMethod }}</p>

            <FieldSet v-if="selectedSku.deliveryType === 'EXPRESS'" class="min-w-0 gap-4 rounded-[20px] border p-4 sm:p-5">
              <FieldLegend>{{ messages.productCheckout.shippingAddress }}</FieldLegend>
              <Field v-if="addresses.length" class="min-w-0"><FieldLabel for="checkout-address">{{ messages.productCheckout.selectSavedAddress }}</FieldLabel><Select :model-value="selectedAddress" class="block w-full min-w-0" @update:model-value="onAddressSelectionChange"><SelectTrigger id="checkout-address" class="w-full! min-w-0 max-w-full **:data-[slot=select-value]:min-w-0 **:data-[slot=select-value]:flex-1 **:data-[slot=select-value]:truncate"><SelectValue :placeholder="messages.productCheckout.selectShippingAddress" /></SelectTrigger><SelectContent><SelectItem v-for="item in addresses" :key="String(item.id)" :value="String(item.id)">{{ item.recipientName }} · {{ item.phone }} · {{ addressSummary(item) }}</SelectItem><SelectItem value="new">{{ messages.productCheckout.enterNewAddress }}</SelectItem><SelectItem v-if="!user" value="clear-local-addresses" class="text-destructive focus:text-destructive">{{ messages.productCheckout.clearBrowserAddresses }}</SelectItem></SelectContent></Select></Field>
              <p v-else-if="addressesLoading" class="text-sm text-muted-foreground">{{ messages.productCheckout.loadingSavedAddresses }}</p>
              <div v-if="selectedAddress === 'new' || !addresses.length" class="grid gap-4 sm:grid-cols-2">
                <VeeField v-for="field in addressFieldsWithoutPostalCode" :key="field.name" v-slot="{ componentField, errors }" :name="field.name" :validate-on-input="true"><Field :class="'wide' in field && field.wide ? 'sm:col-span-2' : ''" :data-invalid="errors.length > 0"><FieldLabel :for="`checkout-${field.name}`"><span v-if="field.required" class="text-destructive">*</span> {{ field.label }}</FieldLabel><Input :id="`checkout-${field.name}`" v-bind="componentField" :autocomplete="field.autocomplete" :aria-invalid="errors.length > 0" /><FieldError v-if="errors.length" :errors="errors" /></Field></VeeField>
                <div class="grid gap-4 sm:col-span-2">
                  <VeeField v-slot="{ componentField, errors }" name="postalCode" :validate-on-input="true"><Field :data-invalid="errors.length > 0"><FieldLabel for="checkout-postalCode">{{ messages.productCheckout.address.postalCode }}</FieldLabel><Input id="checkout-postalCode" v-bind="componentField" autocomplete="postal-code" :aria-invalid="errors.length > 0" /><FieldError v-if="errors.length" :errors="errors" /></Field></VeeField>
                  <Button type="button" variant="outline" class="w-full" :disabled="savingAddress" @click="saveCurrentAddress">{{ savingAddress ? messages.productCheckout.savingAddress : messages.productCheckout.saveAddress }}</Button>
                </div>
              </div>
            </FieldSet>

            <div v-if="methods.length" class="grid gap-3">
              <p class="text-sm font-semibold">{{ messages.productCheckout.paymentMethod }}</p>
              <div class="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" role="group" :aria-label="messages.productCheckout.paymentMethod">
                <button
                  v-for="item in methods"
                  :key="item.key"
                  type="button"
                  :aria-pressed="selectedMethod === item.key"
                  class="group flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm leading-5 transition-[border-color,box-shadow] duration-300 hover:border-foreground/50 aria-pressed:border-foreground aria-pressed:shadow-[inset_0_0_0_1px_var(--foreground)]"
                  @click="selectedMethod = item.key"
                >
                  <span class="grid size-4 shrink-0 place-items-center rounded-full border border-foreground/30 transition-colors group-aria-pressed:border-foreground"><span class="size-2 scale-0 rounded-full bg-foreground transition-transform duration-300 group-aria-pressed:scale-100" /></span>
                  <span class="min-w-0">{{ item.name }}{{ item.channel ? `（${channelLabel(item.channel)}）` : "" }}</span>
                </button>
              </div>
            </div>

            <details class="group rounded-[20px] border px-4 sm:px-5" :open="Boolean(discountPreview) || undefined">
              <summary class="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">{{ messages.shop.product.extras }}<PlusIcon class="size-4 transition-transform duration-500 ease-out-expo group-open:rotate-45" /></summary>
              <div class="grid gap-4 pb-5">
                <div class="grid gap-2 text-sm font-medium"><label for="buy-discount-code">{{ messages.productCheckout.discountCode }}</label><div class="flex gap-2"><Input id="buy-discount-code" v-model="discountCode" autocomplete="off" @keydown.enter.prevent="onApplyDiscount" /><Button type="button" variant="outline" :disabled="discountApplying || !discountCode.trim()" @click="onApplyDiscount">{{ discountApplying ? messages.productCheckout.applyingDiscount : messages.productCheckout.applyDiscount }}</Button></div></div>
                <label class="grid gap-2 text-sm font-medium">{{ messages.productCheckout.buyerNote }}<Textarea v-model="buyerNote" rows="3" /></label>
              </div>
            </details>

            <div v-if="discountPreview" class="grid gap-1.5 rounded-[20px] bg-muted/60 p-4 text-sm"><div class="flex justify-between gap-4"><span class="text-muted-foreground">{{ messages.productCheckout.originalAmount }}</span><span class="tabular-nums">¥{{ discountPreview.originalAmount }}</span></div><div class="flex justify-between gap-4"><span class="text-muted-foreground">{{ t(messages.productCheckout.appliedDiscount, { code: discountPreview.code }) }}</span><span class="tabular-nums text-destructive">-¥{{ discountPreview.discountAmount }}</span></div><div class="flex justify-between gap-4 border-t pt-2 font-semibold"><span>{{ messages.productCheckout.amountDue }}</span><span class="tabular-nums">¥{{ discountPreview.finalAmount }}</span></div></div>

            <div class="grid gap-3">
              <div v-if="!discountPreview" class="flex items-baseline justify-between gap-4 text-sm" data-testid="buy-summary" aria-live="polite">
                <span class="text-muted-foreground">{{ messages.shop.product.total }}<span v-if="displayQuantity > 1" class="tabular-nums"> · ¥{{ selectedSku.price }} × {{ displayQuantity }}</span></span>
                <span class="font-display text-xl font-semibold tabular-nums">¥{{ displayTotal }}</span>
              </div>
              <button type="submit" data-testid="buy-submit" class="mk-sweep inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[15px] font-semibold text-background transition-opacity disabled:pointer-events-none disabled:opacity-40" :disabled="loading || isOutOfStock || (requiresPayment && !methods.length)">
                {{ loading ? messages.productCheckout.processingOrder : isOutOfStock ? messages.storefront.outOfStock : requiresPayment ? messages.productCheckout.submitAndPay : messages.productCheckout.createFreeOrder }}
              </button>
              <p class="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheckIcon class="mt-0.5 size-3.5 shrink-0" />{{ messages.productCheckout.paymentAmountNotice }}</p>
            </div>
          </form>
        </div>
      </section>

      <section class="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 xl:gap-20">
        <article v-if="data.description" class="min-w-0">
          <h2 class="mk-h3">{{ messages.productCheckout.productDetails }}</h2>
          <!-- `description` is sanitized server-side by sanitizeProductDescription(). -->
          <!-- eslint-disable vue/no-v-html -->
          <div ref="descriptionRef" class="product-rich-content mt-4 text-sm leading-7 text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-[1.1rem] [&_h3]:font-semibold [&_img]:my-4 [&_img]:block [&_img]:max-w-full [&_img]:cursor-zoom-in [&_img]:rounded-lg [&_img]:border [&_img]:transition-opacity [&_img]:hover:opacity-90 [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6" @click="previewDescriptionImage" v-html="data.description" />
          <!-- eslint-enable vue/no-v-html -->
        </article>
        <aside :class="['h-fit min-w-0 rounded-[24px] bg-muted/60 p-5 text-sm leading-6 sm:p-7', data.description ? '' : 'lg:col-span-2']">
          <h2 class="mk-display text-lg">{{ messages.productCheckout.purchaseInstructions }}</h2>
          <div class="mt-3 grid gap-3 text-muted-foreground"><p class="whitespace-pre-wrap">{{ purchaseNote }}</p><p v-if="deliveryHint" class="whitespace-pre-wrap">{{ deliveryHint }}</p></div>
        </aside>
      </section>
    </div>

    <!-- Phone: sticky buy bar that submits the same form. -->
    <StickyBuyBar target="[data-testid=buy-submit]" class="mk-buy-bar fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs text-muted-foreground">{{ selectedSku.name || data.name }}<span v-if="displayQuantity > 1" class="tabular-nums"> × {{ displayQuantity }}</span></p>
          <p class="font-display text-xl font-semibold leading-tight tabular-nums" data-testid="buy-bar-total">¥{{ displayTotal }}</p>
        </div>
        <button type="submit" form="mk-buy" data-testid="buy-submit-mobile" class="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-40" :disabled="loading || isOutOfStock || (requiresPayment && !methods.length)">
          {{ loading ? messages.productCheckout.processingOrder : isOutOfStock ? messages.storefront.outOfStock : messages.shop.product.mobileBuy }}
        </button>
      </div>
    </StickyBuyBar>

    <Dialog :open="Boolean(previewImage)" @update:open="(open) => { if (!open) previewImage = null; }">
      <DialogContent :show-close-button="false" class="w-fit! max-w-[calc(100vw-2rem)]! border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100vw-4rem)]!" @interact-outside="previewImage = null">
        <DialogTitle class="sr-only">{{ messages.productCheckout.imagePreview }}</DialogTitle>
        <div class="relative inline-flex">
          <img v-if="previewImage" :src="previewImage.src" :alt="previewImage.alt" class="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] rounded-lg object-contain sm:max-w-[calc(100vw-4rem)]" />
          <DialogClose as-child><Button type="button" variant="ghost" size="icon" class="absolute right-2 top-2 size-10 rounded-full bg-black/55 text-white hover:bg-black/75 hover:text-white" :aria-label="messages.productCheckout.closeImagePreview"><XIcon /></Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog :open="clearAddressesDialogOpen" @update:open="(open) => { clearAddressesDialogOpen = open; if (!open) selectedAddress = previousAddressSelection; }">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ messages.productCheckout.confirmClearAddressesTitle }}</DialogTitle>
          <DialogDescription>{{ messages.productCheckout.confirmClearAddressesDescription }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="clearAddressesDialogOpen = false">{{ messages.productCheckout.cancel }}</Button>
          <Button type="button" variant="destructive" @click="confirmClearSavedAddresses">{{ messages.productCheckout.confirmClearAddresses }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </StoreShell>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { Field as VeeField, useForm } from "vee-validate";
import { z } from "zod";
import { ChevronRightIcon, MinusIcon, PlusIcon, ShieldCheckIcon, XIcon } from "@lucide/vue";
import { toast } from "vue-sonner";
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import { navigate } from "vike/client/router";

import StoreShell from "@/components/storefront/StoreShell.vue";
import StickyBuyBar from "@/components/storefront/StickyBuyBar.vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import defaultProductImage from "@/assets/product_img.jpg?url";
import { clearLocalAddresses, getLocalAddresses, saveLocalAddress, type LocalAddress } from "@/lib/local-addresses";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";
import { saveGuestOrder } from "@/lib/local-orders";
import { cacheQrPayment, formatCentsAsYuan } from "@/lib/payment-utils";
import { runTelefunc, userErrorMessage } from "@/lib/telefunc-client";
import { onCreateAddress, onListAddresses } from "@/server/address/index.telefunc";
import { onPreviewDiscount } from "@/server/discount/preview.telefunc";
import { onCreatePayment } from "@/server/payment/checkout.telefunc";
import type { PaymentChannel, PaymentProviderKind } from "@/server/payment/registry";
import type { Data } from "./+data.server";
const { messages, t } = useStorefrontPreferences();
const data = useData<Data>();
const pageContext = usePageContext() as ReturnType<typeof usePageContext> & { user?: { id: string; email?: string | null } | null };
const user = pageContext.user ?? null;
type Address = Awaited<ReturnType<typeof onListAddresses>>[number];
type SavedAddress = Address | LocalAddress;
type AddressForm = { recipientName: string; phone: string; country: string; province: string; city: string; district: string; addressLine: string; postalCode: string };
type PaymentMethod = { key: string; provider: PaymentProviderKind; channel?: PaymentChannel; name: string };
const methods = computed<PaymentMethod[]>(() => data.paymentProviders.flatMap((provider): PaymentMethod[] => provider.channels.length ? provider.channels.map((channel) => ({ key: `${provider.provider}:${channel}`, provider: provider.provider, channel, name: provider.name })) : [{ key: `${provider.provider}:`, provider: provider.provider, name: provider.name }]));
const purchaseNote = computed(() => data.purchaseNote || messages.value.productCheckout.defaultPurchaseNote);
const deliveryHint = computed(() => {
  if (selectedSku.value.deliveryType === "MANUAL") return data.manualDeliveryHint || messages.value.productCheckout.defaultManualDeliveryHint;
  if (selectedSku.value.deliveryType === "EXPRESS") return data.manualDeliveryHint || messages.value.productCheckout.defaultExpressDeliveryHint;
  return null;
});
const descriptionRef = ref<HTMLElement | null>(null); const previewImage = ref<{ src: string; alt: string } | null>(null);
const selectedMethod = ref(methods.value[0]?.key ?? ""); const selectedSkuId = ref(String(data.skus[0]?.id ?? "")); const selectedSku = computed(() => data.skus.find((sku) => String(sku.id) === selectedSkuId.value) ?? data.skus[0] ?? data); const quantity = ref(selectedSku.value.minBuy);
watch(selectedSku, (sku) => { if (sku) { quantity.value = sku.minBuy; discountPreview.value = null; } });
const contactValue = ref(user?.email?.trim() ?? ""); const discountCode = ref(""); const buyerNote = ref(""); const discountApplying = ref(false); type DiscountPreview = Awaited<ReturnType<typeof onPreviewDiscount>>; const discountPreview = ref<DiscountPreview | null>(null); const loading = ref(false);
const addresses = ref<SavedAddress[]>([]); const addressesLoading = ref(false); const selectedAddress = ref("new"); const previousAddressSelection = ref("new"); const clearAddressesDialogOpen = ref(false); const savingAddress = ref(false);
const addressSchema = z.object({ recipientName: z.string().trim().min(1, messages.value.productCheckout.validation.recipientNameRequired).max(100), phone: z.string().trim().regex(/^[0-9+()\-\s]{5,32}$/, messages.value.productCheckout.validation.phoneInvalid), country: z.string().trim().min(1, messages.value.productCheckout.validation.countryRequired).max(100), province: z.string().trim().min(1, messages.value.productCheckout.validation.provinceRequired).max(100), city: z.string().trim().min(1, messages.value.productCheckout.validation.cityRequired).max(100), district: z.string().trim().min(1, messages.value.productCheckout.validation.districtRequired).max(100), addressLine: z.string().trim().min(1, messages.value.productCheckout.validation.addressLineRequired).max(500), postalCode: z.string().trim().max(20).refine((value) => !value || /^[A-Za-z0-9][A-Za-z0-9\- ]{0,19}$/.test(value), messages.value.productCheckout.validation.postalCodeInvalid) });
const { handleSubmit, validate, values } = useForm<AddressForm>({ validationSchema: toTypedSchema(addressSchema), initialValues: { recipientName: "", phone: "", country: messages.value.productCheckout.address.defaultCountry, province: "", city: "", district: "", addressLine: "", postalCode: "" }, keepValuesOnUnmount: true });
const addressFields = computed(() => [{ name: "recipientName", label: messages.value.productCheckout.address.recipientName, autocomplete: "name", required: true }, { name: "phone", label: messages.value.productCheckout.address.phone, autocomplete: "tel", required: true }, { name: "country", label: messages.value.productCheckout.address.country, autocomplete: "country-name", required: true }, { name: "province", label: messages.value.productCheckout.address.province, autocomplete: "address-level1", required: true }, { name: "city", label: messages.value.productCheckout.address.city, autocomplete: "address-level2", required: true }, { name: "district", label: messages.value.productCheckout.address.district, autocomplete: "address-level3", required: true }, { name: "addressLine", label: messages.value.productCheckout.address.addressLine, autocomplete: "street-address", required: true, wide: true }, { name: "postalCode", label: messages.value.productCheckout.address.postalCode, autocomplete: "postal-code", required: false }] as const);
const addressFieldsWithoutPostalCode = computed(() => addressFields.value.filter((field) => field.name !== "postalCode"));
const requiresPayment = computed(() => (discountPreview.value?.finalAmount ?? selectedSku.value.price) !== "0.00");
// Display only: the order amount is still computed on the server; with a discount preview we show its final amount.
const displayQuantity = computed(() => (Number.isFinite(quantity.value) && quantity.value > 0 ? Math.floor(quantity.value) : selectedSku.value.minBuy));
const displayTotal = computed(() => { if (discountPreview.value) return discountPreview.value.finalAmount; const cents = Math.round(Number(selectedSku.value.price) * 100) * displayQuantity.value; return Number.isSafeInteger(cents) && cents >= 0 ? formatCentsAsYuan(cents) : selectedSku.value.price; });
const isStockLimited = computed(() => selectedSku.value.availableStock !== null);
const availableStock = computed(() => selectedSku.value.availableStock ?? 0);
const purchaseLimit = computed(() => isStockLimited.value ? Math.max(selectedSku.value.minBuy, Math.min(selectedSku.value.maxBuy, availableStock.value)) : selectedSku.value.maxBuy);
const isOutOfStock = computed(() => isStockLimited.value && availableStock.value < selectedSku.value.minBuy);
watch([discountCode, quantity], () => { discountPreview.value = null; });
function previewDescriptionImage(event: MouseEvent) { const image = event.target instanceof HTMLImageElement ? event.target : null; if (image && descriptionRef.value?.contains(image)) previewImage.value = { src: image.currentSrc || image.src, alt: image.alt || data.name }; }
async function onApplyDiscount() { const code = discountCode.value; if (!code.trim()) return; const requestedQuantity = quantity.value; const requestedSkuId = selectedSku.value.id; discountPreview.value = null; discountApplying.value = true; try { const preview = await runTelefunc(() => onPreviewDiscount({ productId: data.id, productSkuId: requestedSkuId, quantity: requestedQuantity, discountCode: code }), { notifyError: false }); if (discountCode.value === code && quantity.value === requestedQuantity && selectedSku.value.id === requestedSkuId) discountPreview.value = preview; } catch (cause) { if (discountCode.value === code && quantity.value === requestedQuantity && selectedSku.value.id === requestedSkuId) toast.error(userErrorMessage(cause, messages.value.productCheckout.discountPreviewFailed)); } finally { discountApplying.value = false; } }
async function onSubmit(address: AddressForm) { if (isOutOfStock.value || (isStockLimited.value && quantity.value > availableStock.value)) { toast.error(messages.value.productCheckout.insufficientStock); return; } if (discountCode.value.trim() && !discountPreview.value) { toast.info(messages.value.productCheckout.applyDiscountFirst); return; } const method = methods.value.find((item) => item.key === selectedMethod.value); if (!method && requiresPayment.value) { toast.error(messages.value.productCheckout.noPaymentMethod); return; } const savedAddress = addresses.value.find((item) => String(item.id) === selectedAddress.value); const useStoredAddress = selectedSku.value.deliveryType === "EXPRESS" && selectedAddress.value !== "new" && savedAddress; const expressAddress = selectedSku.value.deliveryType === "EXPRESS" ? (useStoredAddress ? (user ? { addressId: Number(savedAddress.id) } : { address: { recipientName: savedAddress.recipientName, phone: savedAddress.phone, country: savedAddress.country, province: savedAddress.province, city: savedAddress.city, district: savedAddress.district, addressLine: savedAddress.addressLine, postalCode: savedAddress.postalCode || undefined } }) : { address: { ...address, postalCode: address.postalCode || undefined } }) : {}; loading.value = true; try { const created = await runTelefunc(() => onCreatePayment({ productId: data.id, productSkuId: selectedSku.value.id, quantity: quantity.value, paymentProvider: method?.provider ?? "ALIPAY", paymentChannel: method?.channel, contactType: "EMAIL", contactValue: contactValue.value, ...expressAddress, discountCode: discountPreview.value?.code, buyerNote: buyerNote.value }), { notifyError: false }); if (!pageContext.user) saveGuestOrder(contactValue.value, { orderNo: created.orderNo, productName: data.name, amount: requiresPayment.value ? (discountPreview.value?.finalAmount ?? selectedSku.value.price) : "0.00", createdAt: new Date().toISOString() }); if (created.payment?.mode === "redirect" && created.payment.url) { window.location.assign(created.payment.url); return; } if (created.payment?.mode === "qr") { cacheQrPayment(created); await navigate(`/checkout?orderNo=${encodeURIComponent(created.orderNo)}`); return; } await navigate(`${pageContext.user ? "/account/order" : "/order"}?orderNo=${encodeURIComponent(created.orderNo)}`); } catch (cause) { toast.error(userErrorMessage(cause, messages.value.productCheckout.orderSubmissionFailed)); } finally { loading.value = false; } }
const submitAddress = handleSubmit(onSubmit, () => toast.error(messages.value.productCheckout.shippingAddressIncomplete));
function submit(event: Event) {
  const requiresAddressForm = selectedSku.value.deliveryType === "EXPRESS" && (!user || selectedAddress.value === "new" || !addresses.value.length);
  if (requiresAddressForm) return submitAddress(event);
  void onSubmit({ recipientName: "", phone: "", country: "", province: "", city: "", district: "", addressLine: "", postalCode: "" });
}
async function saveCurrentAddress() { const result = await validate(); if (!result.valid) { toast.error(messages.value.productCheckout.shippingAddressIncomplete); return; } savingAddress.value = true; try { const input = { ...values, postalCode: values.postalCode || undefined, isDefault: addresses.value.length === 0 }; const saved = user ? await runTelefunc(() => onCreateAddress(input), { notifyError: false }) : saveLocalAddress({ ...input, postalCode: input.postalCode ?? null }); if (!saved) { toast.error(messages.value.productCheckout.addressSaveStorageFailed); return; } addresses.value = [...addresses.value, saved]; selectedAddress.value = String(saved.id); toast.success(messages.value.productCheckout.addressSaved); } catch (cause) { toast.error(userErrorMessage(cause, messages.value.productCheckout.addressSaveFailed)); } finally { savingAddress.value = false; } }
function onAddressSelectionChange(value: unknown) { if (value === "clear-local-addresses") { previousAddressSelection.value = selectedAddress.value; clearAddressesDialogOpen.value = true; return; } if (typeof value === "string") selectedAddress.value = value; }
function confirmClearSavedAddresses() { if (!clearLocalAddresses()) { toast.error(messages.value.productCheckout.clearAddressesFailed); return; } addresses.value = []; selectedAddress.value = "new"; clearAddressesDialogOpen.value = false; toast.success(messages.value.productCheckout.addressesCleared); }
async function loadAddresses() { if (selectedSku.value.deliveryType !== "EXPRESS") return; addressesLoading.value = true; try { addresses.value = user ? await runTelefunc(() => onListAddresses(), { notifyError: false }) : getLocalAddresses(); const preferred = addresses.value.find((item) => item.isDefault) ?? addresses.value[0]; selectedAddress.value = preferred ? String(preferred.id) : "new"; } catch (cause) { toast.error(userErrorMessage(cause, messages.value.productCheckout.addressLoadFailed)); selectedAddress.value = "new"; } finally { addressesLoading.value = false; } }
function addressSummary(address: SavedAddress) { return `${address.province}${address.city}${address.district}${address.addressLine}`; }
onMounted(loadAddresses);
function channelLabel(channel: string) { return ({ web: messages.value.productCheckout.paymentChannels.web, wap: messages.value.productCheckout.paymentChannels.wap, face_to_face: messages.value.productCheckout.paymentChannels.faceToFace, alipay: messages.value.productCheckout.paymentChannels.alipay, wxpay: messages.value.productCheckout.paymentChannels.wxpay } as Record<string, string>)[channel] ?? channel; }
</script>
