"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

const INPUT_CLASSES =
  "w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary";

export function ReviewForm({ productId }: { productId: string }) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const [authorName, setAuthorName] = useState("");
  const [city, setCity] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (rating < 1) {
      setError(t("formRatingRequired"));
      return;
    }

    setPending(true);

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        authorName,
        city: city || undefined,
        authorEmail: authorEmail || undefined,
        rating,
        title: title || undefined,
        body,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      // L'API ne répond qu'en français : son message détaillé n'est repris que
      // sur la boutique française, ailleurs on affiche le message générique.
      const serverMessage = locale === "fr" ? data?.error : undefined;
      setError(serverMessage ?? t("formError"));
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-sm border border-border bg-muted p-5">
        <p className="font-black text-foreground">{t("formSuccessTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("formSuccessHint")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border border-border bg-white p-5">
      <fieldset className="mb-4">
        <legend className="mb-1 block text-sm font-semibold text-foreground">
          {t("formRatingLabel")} <span aria-hidden>*</span>
        </legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHoveredRating(0)}>
          {RATING_VALUES.map((value) => {
            const filled = value <= (hoveredRating || rating);

            return (
              <label
                key={value}
                onMouseEnter={() => setHoveredRating(value)}
                className="cursor-pointer rounded-sm p-0.5 focus-within:ring-2 focus-within:ring-ring"
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                />
                <Star
                  aria-hidden
                  className={`h-7 w-7 ${filled ? "fill-primary text-primary" : "text-border"}`}
                />
                <span className="sr-only">{t("formRatingAria", { value })}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            {t("formName")} <span aria-hidden>*</span>
          </span>
          <input
            required
            minLength={2}
            maxLength={80}
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            autoComplete="name"
            className={INPUT_CLASSES}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">{t("formCity")}</span>
          <input
            maxLength={80}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            autoComplete="address-level2"
            className={INPUT_CLASSES}
          />
        </label>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">{t("formEmail")}</span>
        <input
          type="email"
          maxLength={160}
          value={authorEmail}
          onChange={(event) => setAuthorEmail(event.target.value)}
          autoComplete="email"
          aria-describedby="review-email-hint"
          className={INPUT_CLASSES}
        />
        <span id="review-email-hint" className="mt-1 block text-xs text-muted-foreground">
          {t("formEmailHint")}
        </span>
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">{t("formTitle")}</span>
        <input
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("formTitlePlaceholder")}
          className={INPUT_CLASSES}
        />
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">
          {t("formBody")} <span aria-hidden>*</span>
        </span>
        <textarea
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("formBodyPlaceholder")}
          className={INPUT_CLASSES}
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          {t("formBodyCounter", { count: body.length })}
        </span>
      </label>

      {error && (
        <p role="alert" className="mb-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? t("formSubmitting") : t("formSubmit")}
      </button>

      <p className="mt-3 text-xs text-muted-foreground">{t("formModerationNote")}</p>
    </form>
  );
}
