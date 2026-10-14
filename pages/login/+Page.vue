<template>
  <AuthShell>
    <template #aside>
      <p class="mk-eyebrow text-background/60">{{ messages.auth.login.tagline }}</p>
      <p class="mt-5 whitespace-pre-line text-[clamp(32px,3.4vw,52px)] font-semibold leading-[1.1] tracking-[-0.02em]">{{ messages.auth.login.headline }}</p>
      <p class="mt-6 max-w-sm text-base leading-7 text-background/70">{{ messages.auth.login.description }}</p>
      <ol class="mt-12 grid gap-3">
        <li v-for="(step, index) in loginSteps" :key="step.label" class="flex items-center gap-4 rounded-2xl bg-background/[0.06] p-3 pr-5 ring-1 ring-background/10">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-background text-foreground"><component :is="step.icon" class="size-5" /></span>
          <span class="text-[15px] font-medium">{{ step.label }}</span>
          <span class="ml-auto font-display text-sm tabular-nums text-background/65" aria-hidden="true">0{{ index + 1 }}</span>
        </li>
      </ol>
      <p class="mt-10 flex items-center gap-2 text-sm text-background/60"><LockKeyholeIcon class="size-4" />{{ messages.auth.login.sslProtected }}</p>
    </template>

    <Card class="w-full">
      <CardHeader>
        <img :src="brandLogoUrl" :alt="`${siteName} Logo`" class="mb-4 size-12 rounded-2xl object-contain lg:hidden" />
        <CardTitle as="h1">{{ messages.auth.login.welcomeBack }}</CardTitle>
      </CardHeader>
      <form novalidate @submit.prevent="submit">
        <CardContent>
          <FieldGroup>
            <VeeField v-slot="{ componentField, errors }" name="email" :validate-on-input="true"><Field :data-invalid="errors.length > 0"><FieldLabel for="login-email">{{ messages.auth.login.email }}</FieldLabel><Input id="login-email" v-bind="componentField" type="email" autocomplete="email" :aria-invalid="errors.length > 0" /><FieldError v-if="errors.length" :errors="errors" /></Field></VeeField>
            <VeeField v-slot="{ componentField, errors }" name="password" :validate-on-input="true"><Field :data-invalid="errors.length > 0"><FieldLabel for="login-password">{{ messages.auth.login.password }}</FieldLabel><Input id="login-password" v-bind="componentField" type="password" autocomplete="current-password" :aria-invalid="errors.length > 0" /><FieldError v-if="errors.length" :errors="errors" /></Field></VeeField>
          </FieldGroup>
          <div v-if="turnstileSiteKey" ref="turnstileElement" class="mt-5 min-h-16" />
          <Alert v-if="formError" variant="destructive" class="mt-5"><AlertDescription>{{ formError }}</AlertDescription></Alert>
        </CardContent>
        <CardFooter class="mt-7 flex-col"><Button class="h-12 w-full text-[15px]" type="submit" :disabled="isSubmitting">{{ isSubmitting ? messages.auth.login.signingIn : messages.auth.login.signIn }}</Button><div class="mt-4 grid w-full justify-items-center gap-0"><Button as="a" href="/signup" variant="link">{{ messages.auth.login.createAccount }}</Button><Button as="a" href="/forgot-password" variant="link">{{ messages.auth.login.forgotPassword }}</Button></div></CardFooter>
      </form>
    </Card>
  </AuthShell>
</template>

<script lang="ts" setup>
import { toTypedSchema } from "@vee-validate/zod";
import { Field as VeeField, useForm } from "vee-validate";
import { focusFirstInvalid } from "@/lib/ui/focus-invalid";
import { navigate } from "vike/client/router";
import { usePageContext } from "vike-vue/usePageContext";
import { computed, nextTick, onMounted, ref } from "vue";

import { z } from "zod";
import { LockKeyholeIcon, PackageCheckIcon, ShieldCheckIcon, ShoppingCartIcon } from "@lucide/vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import AuthShell from "@/components/storefront/AuthShell.vue";
import { authClient } from "@/lib/auth-client";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";
import logoUrl from "@/assets/logo.svg?url";

type Site = { name?: string | null; logo?: string | null };
const pageContext = usePageContext() as ReturnType<typeof usePageContext> & { site?: Site | null };
const { messages } = useStorefrontPreferences();
const siteName = computed(() => pageContext.site?.name?.trim() || "MioKey");
const brandLogoUrl = computed(() => pageContext.site?.logo || logoUrl);
const loginSteps = computed(() => [
  { icon: ShoppingCartIcon, label: messages.value.auth.login.createOrder },
  { icon: ShieldCheckIcon, label: messages.value.auth.login.securePayment },
  { icon: PackageCheckIcon, label: messages.value.auth.login.delivery },
]);

const turnstileElement = ref<HTMLElement | null>(null);
const turnstileSiteKey = ref<string | null>(null);
const turnstileToken = ref("");
const turnstileWidgetId = ref<string | null>(null);
const formError = ref<string | null>(null);

declare global { interface Window { turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string; reset: (widgetId?: string) => void; }; } }

async function loadTurnstile() {
  const config = await fetch("/api/security/turnstile").then((response) => response.json() as Promise<{ enabled: boolean; siteKey: string | null }>);
  if (!config.enabled || !config.siteKey) return;
  turnstileSiteKey.value = config.siteKey;
  await nextTick();
  await new Promise<void>((resolve, reject) => {
    if (window.turnstile) { resolve(); return; }
    const script = window.document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("TURNSTILE_LOAD_FAILED")); window.document.head.appendChild(script);
  });
  if (turnstileElement.value) turnstileWidgetId.value = window.turnstile?.render(turnstileElement.value, { sitekey: config.siteKey, callback: (token) => { turnstileToken.value = token; }, "expired-callback": () => { turnstileToken.value = ""; } }) ?? null;
}

function resetTurnstile() {
  turnstileToken.value = "";
  if (turnstileWidgetId.value) window.turnstile?.reset(turnstileWidgetId.value);
}

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(z.object({
    email: z.string().trim().email(messages.value.auth.login.emailInvalid),
    password: z.string().min(1, messages.value.auth.login.passwordRequired),
  })),
  initialValues: { email: "", password: "" },
});

const submit = handleSubmit(async (input) => {
  try {
    formError.value = null;
    if (turnstileSiteKey.value && !turnstileToken.value) {
      formError.value = messages.value.auth.login.captchaRequired;
      return;
    }
    const result = await authClient.signIn.email({ ...input, ...(turnstileToken.value ? { fetchOptions: { headers: { "x-captcha-response": turnstileToken.value } } } : {}) });
    if (result.error) {
      resetTurnstile();
      formError.value = messages.value.auth.login.invalidCredentials;
      return;
    }
    if ((result.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) return;
    await navigate("/auth/continue");
  } catch {
    resetTurnstile();
    formError.value = messages.value.auth.login.requestFailed;
  }
}, () => { void focusFirstInvalid(); });

onMounted(() => { void loadTurnstile().catch(() => { formError.value = messages.value.auth.login.captchaLoadFailed; }); });
</script>
