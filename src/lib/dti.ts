/**
 * מנוע יחס החזר (DTI) — כללי בנק ישראל
 * ---------------------------------------------------------------------------
 * משלב שני מבחנים שהמועצה דרשה לשוק הישראלי:
 *   1) PTI  — Payment-to-Income: יחס ההחזר החודשי מתוך ההכנסה נטו.
 *   2) LTV  — Loan-to-Value: אחוז המימון מתוך שווי הנכס (כשיש בטוחת נכס).
 *
 * הפונקציה היא טהורה (pure) ודטרמיניסטית — אותה לוגיקה תרוץ ב-UI, ב-API,
 * ובהמשך כ-snapshot קפוא על ההצעה (Deal/Offer), כך שהצעה לא "תזוז" כשמשנים
 * נתונים בכרטיס.
 */

// ----- קבועי מדיניות (ניתנים לעריכה ע"י אדמין) -----

/** סף ה-PTI לדירוג הלקוח. */
export const PTI_BANDS = {
  hot: 0.30, // עד 30% → לקוח לוהט
  good: 0.36, // 30%–36% → טוב
  borderline: 0.40, // 36%–40% → גבולי (דורש אישור). מעל 40% → לא אפשרי
} as const;

/** תקרות LTV לפי סוג נכס (בנק ישראל). */
export const LTV_CAPS = {
  first_home: 0.75, // דירה יחידה / ראשונה
  replacement: 0.70, // דירה חליפית (משפרי דיור)
  investment: 0.50, // דירה להשקעה / נוספת
} as const;

/** ריבית הפריים הנוכחית (%) — בסיס לתמחור P±. ניתן לעדכון ע"י אדמין. */
export const DEFAULT_PRIME_PCT = 6.0;

export const NOT_POSSIBLE_CTA =
  "(לבדוק אם להורים יש נכס לערב או רכב לשעבד)";

// ----- טיפוסים -----

export type AssetType = "none" | "car" | "property";
export type PropertyKind = keyof typeof LTV_CAPS;
export type DtiStatus = "hot" | "good" | "borderline" | "not_possible";

export interface DtiInput {
  /** הכנסה חודשית נטו (₪). */
  netIncome: number;
  /** סך ההחזרים החודשיים הקיימים על חובות/אובליגו (₪). */
  existingMonthlyRepayments: number;
  /** האם הלקוח בשכירות. */
  rent?: boolean;
  /** סכום שכירות חודשי (₪) — רלוונטי אם rent=true. */
  rentAmount?: number;
  /** האם לכלול שכירות בנטל ההחזר (החלטת מדיניות). ברירת מחדל: כן. */
  countRentAsObligation?: boolean;

  /** סוג הבטוחה. */
  assetType: AssetType;
  /** סוג נכס (לחישוב LTV) — רלוונטי אם assetType="property". */
  propertyKind?: PropertyKind;
  /** שווי הנכס (₪). */
  propertyValue?: number;
  /** יתרת משכנתא קיימת על הנכס (₪). */
  remainingMortgage?: number;

  /** ההחזר החודשי של ההלוואה החדשה הנבחנת (₪). 0 בשלב הכרטיס לפני הצעה. */
  newLoanMonthlyPayment?: number;
  /** סכום ההלוואה החדשה (₪) — לחישוב LTV מול שווי הנכס. */
  newLoanAmount?: number;
}

export interface DtiResult {
  /** יחס ההחזר (0..n). */
  pti: number;
  /** יחס ההחזר באחוזים מעוגל. */
  ptiPct: number;
  /** יחס המימון מול שווי הנכס (0..n) — undefined אם אין נכס. */
  ltv?: number;
  ltvPct?: number;
  /** תקרת ה-LTV שחלה (לפי סוג נכס). */
  ltvCap?: number;
  status: DtiStatus;
  statusLabel: string;
  /** טקסט קריאה-לפעולה כשהסטטוס "לא אפשרי". */
  cta?: string;
  /** נימוקים אנושיים להחלטה (להצגה / audit). */
  reasons: string[];
}

const STATUS_LABEL: Record<DtiStatus, string> = {
  hot: "לוהט 🔥",
  good: "טוב",
  borderline: "גבולי — דורש אישור",
  not_possible: "לא אפשרי",
};

// ----- חישובי עזר -----

/**
 * החזר חודשי לפי לוח שפיצר.
 * @param principal קרן ההלוואה (₪)
 * @param annualRatePct ריבית שנתית (%)
 * @param months מספר חודשים
 */
export function monthlyPayment(
  principal: number,
  annualRatePct: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** המרת ריבית פריים± לריבית שנתית. */
export function primeToAnnualPct(
  primeDelta: number,
  primePct: number = DEFAULT_PRIME_PCT
): number {
  return primePct + primeDelta;
}

// ----- המנוע -----

export function computeDti(input: DtiInput): DtiResult {
  const {
    netIncome,
    existingMonthlyRepayments,
    rent = false,
    rentAmount = 0,
    countRentAsObligation = true,
    assetType,
    propertyKind = "first_home",
    propertyValue = 0,
    remainingMortgage = 0,
    newLoanMonthlyPayment = 0,
    newLoanAmount = 0,
  } = input;

  const reasons: string[] = [];

  // --- נטל ההחזר החודשי ---
  const rentLoad = rent && countRentAsObligation ? rentAmount : 0;
  const monthlyObligations =
    existingMonthlyRepayments + newLoanMonthlyPayment + rentLoad;

  const pti = netIncome > 0 ? monthlyObligations / netIncome : Infinity;
  const ptiPct = Math.round(pti * 100);

  reasons.push(
    `החזר חודשי ₪${Math.round(monthlyObligations).toLocaleString("he-IL")} ` +
      `מתוך הכנסה ₪${Math.round(netIncome).toLocaleString("he-IL")} = ${ptiPct}%`
  );

  // --- LTV (רק אם הבטוחה היא נכס) ---
  let ltv: number | undefined;
  let ltvPct: number | undefined;
  let ltvCap: number | undefined;
  let ltvExceeded = false;

  if (assetType === "property" && propertyValue > 0) {
    ltvCap = LTV_CAPS[propertyKind];
    const totalLien = remainingMortgage + newLoanAmount;
    ltv = totalLien / propertyValue;
    ltvPct = Math.round(ltv * 100);
    ltvExceeded = ltv > ltvCap;
    reasons.push(
      `LTV ${ltvPct}% מול תקרה ${Math.round(ltvCap * 100)}% (${propertyKindLabel(propertyKind)})`
    );
  }

  // --- חוק עוקף: יש החזרים קיימים ואין נכס → לא אפשרי ---
  const overrideNoAsset =
    existingMonthlyRepayments > 0 && assetType !== "property";

  let status: DtiStatus;
  if (overrideNoAsset) {
    status = "not_possible";
    reasons.push("חוק עוקף: קיימים החזרים ואין נכס לבטוחה → לא אפשרי");
  } else if (ltvExceeded) {
    status = "not_possible";
    reasons.push("LTV מעל התקרה המותרת → לא אפשרי");
  } else if (pti <= PTI_BANDS.hot) {
    status = "hot";
  } else if (pti <= PTI_BANDS.good) {
    status = "good";
  } else if (pti <= PTI_BANDS.borderline) {
    status = "borderline";
  } else {
    status = "not_possible";
    reasons.push("יחס החזר מעל 40% → לא אפשרי");
  }

  return {
    pti,
    ptiPct,
    ltv,
    ltvPct,
    ltvCap,
    status,
    statusLabel: STATUS_LABEL[status],
    cta: status === "not_possible" ? NOT_POSSIBLE_CTA : undefined,
    reasons,
  };
}

function propertyKindLabel(k: PropertyKind): string {
  return k === "first_home"
    ? "דירה ראשונה"
    : k === "replacement"
      ? "דירה חליפית"
      : "דירה להשקעה";
}

/**
 * דירוג מהיר לפי PTI בלבד (ללא חוק עוקף / LTV) — לשימוש ברשימות ברמת הלקוח,
 * לפני שיש עסקה עם בטוחה. הדירוג המלא מחושב ב-computeDti ברמת העסקה.
 */
export function statusFromPti(ptiFraction: number): DtiStatus {
  if (!isFinite(ptiFraction)) return "not_possible";
  if (ptiFraction <= PTI_BANDS.hot) return "hot";
  if (ptiFraction <= PTI_BANDS.good) return "good";
  if (ptiFraction <= PTI_BANDS.borderline) return "borderline";
  return "not_possible";
}

export function statusLabelOf(status: DtiStatus): string {
  return STATUS_LABEL[status];
}

/** מיפוי סטטוס ל-class של תג העיצוב (fh-badge-*). */
export function statusBadgeClass(status: DtiStatus): string {
  switch (status) {
    case "hot":
      return "fh-badge-hot";
    case "good":
      return "fh-badge-good";
    case "borderline":
      return "fh-badge-warn";
    case "not_possible":
      return "fh-badge-bad";
  }
}