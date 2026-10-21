import { expoDb } from "../db";

export interface BudgetCategoryDetail {
  id: number; // budget_categories.id
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  progressPercent: number; // (spent / budgetAmount) * 100
  isExceeded: boolean;
  isCompleted: boolean;
}

export interface BudgetDetail {
  id: number;
  name: string;
  month: string;
  template: boolean;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  progressPercent: number;
  categories: BudgetCategoryDetail[];
}

export interface BudgetSummaryItem {
  id: number;
  name: string;
  month: string;
  template: boolean;
  totalBudget: number;
  totalSpent: number;
  savedAmount: number;
  exceededAmount: number;
  isExceeded: boolean;
}

export interface MonthSummaryItem {
  month: string; // 'YYYY-MM'
  totalBudget: number;
  totalSpent: number;
  savedAmount: number;
  exceededAmount: number;
  isExceeded: boolean;
  budgetCount: number;
}

export interface TopCategoryMiniPie {
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  progressPercent: number;
  color: string;
}

export interface MonthBudgetSummary {
  month: string; // 'YYYY-MM'
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallProgressPercent: number;
  budgets: BudgetDetail[];
  topCategories: TopCategoryMiniPie[];
}

const CATEGORY_COLORS = [
  "#D4F938", // Electric Lime
  "#F59E0B", // Amber Gold
  "#F43F5E", // Rose Red
  "#38BDF8", // Sky Blue
  "#A855F7", // Purple
];

/**
 * Loads all budgets, category allocations, and calculated expenses for a given month ('YYYY-MM').
 */
export function getMonthBudgetSummary(month: string): MonthBudgetSummary {

  // 1. Fetch budgets for this month
  const budgetRows = expoDb.getAllSync<{
    id: number;
    name: string;
    month: string;
    template: number;
  }>(
    `SELECT id, name, month, COALESCE(template, 0) as template FROM budgets WHERE month = ? ORDER BY id ASC;`,
    [month]
  );

  // 2. Fetch all budget_categories mappings for this month's budgets
  const categoryMapRows = expoDb.getAllSync<{
    id: number;
    budget_id: number;
    category_id: number;
    amount: number;
    category_name: string;
    category_icon: string | null;
  }>(`
    SELECT bc.id, bc.budget_id, bc.category_id, bc.amount, c.name as category_name, c.icon as category_icon
    FROM budget_categories bc
    JOIN categories c ON c.id = bc.category_id
    JOIN budgets b ON b.id = bc.budget_id
    WHERE b.month = ?;
  `, [month]);

  // 3. Fetch spent amounts for all categories in this month from transactions (EXPENSE only)
  const spentRows = expoDb.getAllSync<{
    category_id: number;
    total_spent: number;
  }>(`
    SELECT category_id, SUM(amount) as total_spent
    FROM transactions
    WHERE type = 'EXPENSE' AND category_id IS NOT NULL AND date LIKE ?
    GROUP BY category_id;
  `, [`${month}%`]);

  const spentMap = new Map<number, number>();
  for (const r of spentRows) {
    if (r.category_id != null) {
      spentMap.set(r.category_id, Number(r.total_spent) || 0);
    }
  }

  // 4. Group categories by budget_id
  const budgetCategoriesMap = new Map<number, BudgetCategoryDetail[]>();
  for (const row of categoryMapRows) {
    const spent = spentMap.get(row.category_id) || 0;
    const bAmt = Number(row.amount) || 0;
    const roundedSpent = Math.round(spent * 100) / 100;
    const roundedBudget = Math.round(bAmt * 100) / 100;
    const diff = Math.round((roundedBudget - roundedSpent) * 100) / 100;
    const remaining = diff;
    const progress = roundedBudget > 0 ? Math.round((roundedSpent / roundedBudget) * 100) : 0;
    const isExceeded = roundedSpent > roundedBudget;
    const isCompleted = roundedBudget > 0 && diff === 0;

    const catDetail: BudgetCategoryDetail = {
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryIcon: row.category_icon,
      budgetAmount: roundedBudget,
      spentAmount: roundedSpent,
      remainingAmount: isCompleted ? 0 : remaining,
      progressPercent: progress,
      isExceeded,
      isCompleted,
    };

    if (!budgetCategoriesMap.has(row.budget_id)) {
      budgetCategoriesMap.set(row.budget_id, []);
    }
    budgetCategoriesMap.get(row.budget_id)!.push(catDetail);
  }

  // 5. Build BudgetDetail objects
  let totalMonthBudget = 0;
  let totalMonthSpent = 0;
  const budgets: BudgetDetail[] = [];
  const allCategoryDetails: BudgetCategoryDetail[] = [];

  for (const bRow of budgetRows) {
    const cats = budgetCategoriesMap.get(bRow.id) || [];
    let bBudget = 0;
    let bSpent = 0;

    for (const c of cats) {
      bBudget += c.budgetAmount;
      bSpent += c.spentAmount;
      allCategoryDetails.push(c);
    }

    totalMonthBudget += bBudget;
    totalMonthSpent += bSpent;

    const bRemaining = bBudget - bSpent;
    const bProg = bBudget > 0 ? Math.round((bSpent / bBudget) * 100) : 0;

    budgets.push({
      id: bRow.id,
      name: bRow.name,
      month: bRow.month,
      template: Boolean(bRow.template),
      totalBudget: bBudget,
      totalSpent: bSpent,
      totalRemaining: bRemaining,
      progressPercent: bProg,
      categories: cats,
    });
  }

  const totalMonthRemaining = totalMonthBudget - totalMonthSpent;
  const overallProgress =
    totalMonthBudget > 0
      ? Math.min(100, Math.round((totalMonthSpent / totalMonthBudget) * 100))
      : 0;

  // 6. Calculate Top 5 Categories (by progressPercent descending)
  // Deduplicate categories if the same category exists in multiple budgets
  const uniqueCats = new Map<number, BudgetCategoryDetail>();
  for (const c of allCategoryDetails) {
    const existing = uniqueCats.get(c.categoryId);
    if (!existing || c.progressPercent > existing.progressPercent) {
      uniqueCats.set(c.categoryId, c);
    }
  }

  const sortedCats = Array.from(uniqueCats.values()).sort(
    (a, b) => b.progressPercent - a.progressPercent
  );

  const topCategories: TopCategoryMiniPie[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < sortedCats.length) {
      const c = sortedCats[i];
      topCategories.push({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryIcon: c.categoryIcon,
        progressPercent: c.progressPercent,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      });
    } else {
      // Empty placeholder pie
      topCategories.push({
        categoryId: 0,
        categoryName: "—",
        categoryIcon: null,
        progressPercent: 0,
        color: "#262B3A",
      });
    }
  }

  return {
    month,
    totalBudget: totalMonthBudget,
    totalSpent: totalMonthSpent,
    totalRemaining: totalMonthRemaining,
    overallProgressPercent: overallProgress,
    budgets,
    topCategories,
  };
}

/**
 * Creates a new budget with multiple category allocations.
 */
export function createBudgetWithCategories(params: {
  name: string;
  month: string;
  template?: boolean;
  categories: { categoryId: number; amount: number }[];
}): number {

  // 1. Insert into budgets
  expoDb.runSync(`INSERT INTO budgets (name, month, template) VALUES (?, ?, ?);`, [
    params.name.trim(),
    params.month,
    params.template ? 1 : 0,
  ]);

  const lastIdRow = expoDb.getFirstSync<{ id: number }>(
    `SELECT last_insert_rowid() as id;`
  );
  const budgetId = lastIdRow?.id || 0;

  // 2. Insert category mappings with month
  for (const cat of params.categories) {
    if (cat.categoryId > 0 && cat.amount > 0) {
      expoDb.runSync(
        `INSERT INTO budget_categories (budget_id, category_id, month, amount) VALUES (?, ?, ?, ?);`,
        [budgetId, cat.categoryId, params.month, cat.amount]
      );
    }
  }

  return budgetId;
}

/**
 * Updates an existing budget and replaces its category allocations.
 */
export function updateBudgetWithCategories(
  budgetId: number,
  params: {
    name: string;
    month: string;
    template?: boolean;
    categories: { categoryId: number; amount: number }[];
  }
) {

  // 1. Update budget name, month, and template
  expoDb.runSync(
    `UPDATE budgets SET name = ?, month = ?, template = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
    [params.name.trim(), params.month, params.template ? 1 : 0, budgetId]
  );

  // 2. Clear old category mappings for this budget
  expoDb.runSync(`DELETE FROM budget_categories WHERE budget_id = ?;`, [
    budgetId,
  ]);

  // 3. Re-insert category mappings with updated month
  for (const cat of params.categories) {
    if (cat.categoryId > 0 && cat.amount > 0) {
      expoDb.runSync(
        `INSERT INTO budget_categories (budget_id, category_id, month, amount) VALUES (?, ?, ?, ?);`,
        [budgetId, cat.categoryId, params.month, cat.amount]
      );
    }
  }
}

/**
 * Fetches all budgets summary across all months or filtered by month.
 * Ordered by month DESC, id DESC.
 */
export function getAllBudgetsSummary(monthFilter?: string): BudgetSummaryItem[] {
  const query = monthFilter
    ? `SELECT id, name, month, COALESCE(template, 0) as template FROM budgets WHERE month = ? ORDER BY month DESC, id DESC;`
    : `SELECT id, name, month, COALESCE(template, 0) as template FROM budgets ORDER BY month DESC, id DESC;`;
  const params = monthFilter ? [monthFilter] : [];
  const rows = expoDb.getAllSync<{
    id: number;
    name: string;
    month: string;
    template: number;
  }>(query, params);

  // Get all budget categories
  const catRows = expoDb.getAllSync<{
    budget_id: number;
    category_id: number;
    amount: number;
    month: string;
  }>(`SELECT budget_id, category_id, amount, month FROM budget_categories;`);

  // Get all expenses grouped by month and category
  const expenseRows = expoDb.getAllSync<{
    category_id: number;
    month_prefix: string;
    total_spent: number;
  }>(`
    SELECT category_id, substr(date, 1, 7) as month_prefix, SUM(amount) as total_spent
    FROM transactions
    WHERE type = 'EXPENSE' AND category_id IS NOT NULL
    GROUP BY category_id, substr(date, 1, 7);
  `);

  const expenseMap = new Map<string, number>();
  for (const e of expenseRows) {
    expenseMap.set(`${e.category_id}_${e.month_prefix}`, Number(e.total_spent) || 0);
  }

  const budgetCatMap = new Map<number, { amount: number; spent: number }>();
  for (const c of catRows) {
    const existing = budgetCatMap.get(c.budget_id) || { amount: 0, spent: 0 };
    existing.amount += Number(c.amount) || 0;
    const spent = expenseMap.get(`${c.category_id}_${c.month}`) || 0;
    existing.spent += spent;
    budgetCatMap.set(c.budget_id, existing);
  }

  return rows.map((b) => {
    const stat = budgetCatMap.get(b.id) || { amount: 0, spent: 0 };
    const totalBudget = stat.amount;
    const totalSpent = stat.spent;
    const isExceeded = totalSpent > totalBudget;
    const savedAmount = isExceeded ? 0 : Math.max(0, totalBudget - totalSpent);
    const exceededAmount = isExceeded ? totalSpent - totalBudget : 0;
    return {
      id: b.id,
      name: b.name,
      month: b.month,
      template: Boolean(b.template),
      totalBudget,
      totalSpent,
      savedAmount,
      exceededAmount,
      isExceeded,
    };
  });
}

/**
 * Loads a single budget's complete details including all its category breakdowns and expenses.
 */
export function getBudgetDetailById(id: number): BudgetDetail | null {
  const bRow = expoDb.getFirstSync<{
    id: number;
    name: string;
    month: string;
    template: number;
  }>(
    `SELECT id, name, month, COALESCE(template, 0) as template FROM budgets WHERE id = ?;`,
    [id]
  );

  if (!bRow) return null;

  const categoryMapRows = expoDb.getAllSync<{
    id: number;
    budget_id: number;
    category_id: number;
    amount: number;
    category_name: string;
    category_icon: string | null;
  }>(`
    SELECT bc.id, bc.budget_id, bc.category_id, bc.amount, c.name as category_name, c.icon as category_icon
    FROM budget_categories bc
    JOIN categories c ON c.id = bc.category_id
    WHERE bc.budget_id = ?;
  `, [id]);

  const spentRows = expoDb.getAllSync<{
    category_id: number;
    total_spent: number;
  }>(`
    SELECT category_id, SUM(amount) as total_spent
    FROM transactions
    WHERE type = 'EXPENSE' AND category_id IS NOT NULL AND date LIKE ?
    GROUP BY category_id;
  `, [`${bRow.month}%`]);

  const spentMap = new Map<number, number>();
  for (const r of spentRows) {
    if (r.category_id != null) {
      spentMap.set(r.category_id, Number(r.total_spent) || 0);
    }
  }

  let totalBudget = 0;
  let totalSpent = 0;

  const categories: BudgetCategoryDetail[] = categoryMapRows.map((cat) => {
    const budgetAmount = Math.round((Number(cat.amount) || 0) * 100) / 100;
    const spentAmount = Math.round((spentMap.get(cat.category_id) || 0) * 100) / 100;
    const diff = Math.round((budgetAmount - spentAmount) * 100) / 100;
    const remainingAmount = diff;
    const progressPercent = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

    totalBudget += budgetAmount;
    totalSpent += spentAmount;

    const isExceeded = spentAmount > budgetAmount;
    const isCompleted = budgetAmount > 0 && diff === 0;

    return {
      id: cat.id,
      categoryId: cat.category_id,
      categoryName: cat.category_name,
      categoryIcon: cat.category_icon,
      budgetAmount,
      spentAmount,
      remainingAmount: isCompleted ? 0 : remainingAmount,
      progressPercent,
      isExceeded,
      isCompleted,
    };
  });

  const totalRemaining = totalBudget - totalSpent;
  const progressPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return {
    id: bRow.id,
    name: bRow.name,
    month: bRow.month,
    template: Boolean(bRow.template),
    totalBudget,
    totalSpent,
    totalRemaining,
    progressPercent,
    categories,
  };
}

/**
 * Returns all category IDs already assigned to ANY budget in the given month.
 * Can optionally exclude a specific budget ID when editing that budget.
 */
export function getAssignedCategoryIdsForMonth(
  month: string,
  excludeBudgetId?: number
): number[] {
  let query = `
    SELECT DISTINCT bc.category_id
    FROM budget_categories bc
    JOIN budgets b ON b.id = bc.budget_id
    WHERE b.month = ?
  `;
  const params: (string | number)[] = [month];
  if (excludeBudgetId) {
    query += ` AND bc.budget_id != ?`;
    params.push(excludeBudgetId);
  }
  const rows = expoDb.getAllSync<{ category_id: number }>(query, params);
  return rows.map((r) => r.category_id);
}

/**
 * Checks if a budget with the given name already exists in the target month.
 */
export function checkBudgetExistsForMonth(
  name: string,
  month: string,
  excludeBudgetId?: number
): boolean {
  let query = `SELECT id FROM budgets WHERE LOWER(name) = LOWER(?) AND month = ?`;
  const params: (string | number)[] = [name.trim(), month];
  if (excludeBudgetId) {
    query += ` AND id != ?`;
    params.push(excludeBudgetId);
  }
  const row = expoDb.getFirstSync<{ id: number }>(query, params);
  return Boolean(row);
}

/**
 * Adds a new category allocation to an existing budget.
 */
export function addCategoryToExistingBudget(
  budgetId: number,
  categoryId: number,
  amount: number
) {
  const bRow = expoDb.getFirstSync<{ month: string }>(
    `SELECT month FROM budgets WHERE id = ?;`,
    [budgetId]
  );
  const month = bRow?.month || new Date().toISOString().slice(0, 7);
  expoDb.runSync(
    `INSERT INTO budget_categories (budget_id, category_id, month, amount) VALUES (?, ?, ?, ?);`,
    [budgetId, categoryId, month, amount]
  );
}

/**
 * Deletes a budget and all its category mappings.
 */
export function deleteBudget(budgetId: number) {
  expoDb.runSync(`DELETE FROM budget_categories WHERE budget_id = ?;`, [
    budgetId,
  ]);
  expoDb.runSync(`DELETE FROM budgets WHERE id = ?;`, [budgetId]);
}

/**
 * Updates the template flag of a budget.
 */
export function setBudgetTemplate(budgetId: number, isTemplate: boolean) {
  expoDb.runSync(
    `UPDATE budgets SET template = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
    [isTemplate ? 1 : 0, budgetId]
  );
}

/**
 * Helper to batch-fetch budget summary data across multiple months in 2 SQL queries
 * rather than O(N*3) queries on the main thread.
 */
function fetchMonthsBudgetSummary(targetMonths: string[]): MonthSummaryItem[] {
  if (targetMonths.length === 0) return [];

  const placeholders = targetMonths.map(() => "?").join(", ");

  // 1. Fetch budget counts and total allocated amount per month
  const budgetRows = expoDb.getAllSync<{
    month: string;
    budgetCount: number;
    totalBudget: number;
  }>(
    `
    SELECT 
      b.month,
      COUNT(DISTINCT b.id) as budgetCount,
      COALESCE(SUM(bc.amount), 0) as totalBudget
    FROM budgets b
    LEFT JOIN budget_categories bc ON bc.budget_id = b.id
    WHERE b.month IN (${placeholders})
    GROUP BY b.month;
  `,
    targetMonths
  );

  const budgetMap = new Map<string, { budgetCount: number; totalBudget: number }>();
  for (const row of budgetRows) {
    budgetMap.set(row.month, {
      budgetCount: Number(row.budgetCount) || 0,
      totalBudget: Math.round((Number(row.totalBudget) || 0) * 100) / 100,
    });
  }

  // 2. Fetch total spent per month for categories allocated in that month's budgets
  const spentRows = expoDb.getAllSync<{
    month: string;
    totalSpent: number;
  }>(
    `
    SELECT 
      bc.month,
      COALESCE(SUM(t.amount), 0) as totalSpent
    FROM budget_categories bc
    JOIN transactions t ON t.category_id = bc.category_id 
      AND t.type = 'EXPENSE' 
      AND substr(t.date, 1, 7) = bc.month
    WHERE bc.month IN (${placeholders})
    GROUP BY bc.month;
  `,
    targetMonths
  );

  const spentMap = new Map<string, number>();
  for (const row of spentRows) {
    spentMap.set(row.month, Math.round((Number(row.totalSpent) || 0) * 100) / 100);
  }

  // 3. Assemble summaries preserving order of targetMonths
  return targetMonths.map((month) => {
    const bInfo = budgetMap.get(month) || { budgetCount: 0, totalBudget: 0 };
    const totalSpent = spentMap.get(month) || 0;
    const totalBudget = bInfo.totalBudget;
    const isExceeded = totalSpent > totalBudget;
    const savedAmount = isExceeded ? 0 : Math.max(0, Math.round((totalBudget - totalSpent) * 100) / 100);
    const exceededAmount = isExceeded ? Math.round((totalSpent - totalBudget) * 100) / 100 : 0;

    return {
      month,
      totalBudget,
      totalSpent,
      savedAmount,
      exceededAmount,
      isExceeded,
      budgetCount: bInfo.budgetCount,
    };
  });
}

/**
 * Returns month-wise budget summaries across all distinct months in budgets.
 * Shows overall allocated amount and overall spent amount for all budgets in each month.
 */
export function getAllMonthsBudgetSummary(monthFilter?: string): MonthSummaryItem[] {

  const query = monthFilter
    ? `SELECT DISTINCT month FROM budgets WHERE month = ? ORDER BY month DESC;`
    : `SELECT DISTINCT month FROM budgets ORDER BY month DESC;`;
  const params = monthFilter ? [monthFilter] : [];
  const monthRows = expoDb.getAllSync<{ month: string }>(query, params);
  const months = monthRows.map((m) => m.month);

  return fetchMonthsBudgetSummary(months);
}

/**
 * Toggles or sets the template flag for ALL budgets in a given month.
 */
export function setMonthTemplate(month: string, isTemplate: boolean) {
  expoDb.runSync(
    `UPDATE budgets SET template = ?, updated_at = CURRENT_TIMESTAMP WHERE month = ?;`,
    [isTemplate ? 1 : 0, month]
  );
}

/**
 * Returns whether all budgets in a given month are marked as template.
 */
export function isMonthTemplate(month: string): boolean {
  const row = expoDb.getFirstSync<{ cnt: number; templateCnt: number }>(`
    SELECT COUNT(*) as cnt, SUM(CASE WHEN template = 1 THEN 1 ELSE 0 END) as templateCnt
    FROM budgets WHERE month = ?;
  `, [month]);
  return Boolean(row && row.cnt > 0 && row.cnt === row.templateCnt);
}

/**
 * Returns all distinct months that have been saved as templates.
 */
export function getSavedTemplateMonths(): MonthSummaryItem[] {
  const monthRows = expoDb.getAllSync<{ month: string }>(`
    SELECT DISTINCT month FROM budgets WHERE template = 1 ORDER BY month DESC;
  `);
  const months = monthRows.map((m) => m.month);

  return fetchMonthsBudgetSummary(months);
}

/**
 * Calculates the previous month string ('YYYY-MM') given a month string.
 */
export function getPreviousMonthYMD(monthYMD: string): string {
  const [y, m] = monthYMD.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
  return `${prevY}-${prevM}`;
}

/**
 * Copies all budgets and their category allocations from sourceMonth into targetMonth.
 * Atomically handles existing categories in targetMonth to avoid UNIQUE constraint crashes.
 */
export function copyMonthBudgets(sourceMonth: string, targetMonth: string) {

  // 1. Fetch budgets for sourceMonth
  const srcBudgets = expoDb.getAllSync<{ id: number; name: string; template: number }>(
    `SELECT id, name, template FROM budgets WHERE month = ? ORDER BY id ASC;`,
    [sourceMonth]
  );
  if (srcBudgets.length === 0) return;

  // 2. Fetch categories for sourceMonth
  const srcCategories = expoDb.getAllSync<{
    budget_id: number;
    category_id: number;
    amount: number;
  }>(`
    SELECT bc.budget_id, bc.category_id, bc.amount
    FROM budget_categories bc
    JOIN budgets b ON b.id = bc.budget_id
    WHERE b.month = ?;
  `, [sourceMonth]);

  const catMap = new Map<number, { category_id: number; amount: number }[]>();
  for (const c of srcCategories) {
    const list = catMap.get(c.budget_id) || [];
    list.push({ category_id: c.category_id, amount: Number(c.amount) || 0 });
    catMap.set(c.budget_id, list);
  }

  // Pre-fetch any existing category IDs already allocated in targetMonth
  const existingCatRows = expoDb.getAllSync<{ category_id: number }>(
    `SELECT category_id FROM budget_categories WHERE month = ?;`,
    [targetMonth]
  );
  const existingCatIds = new Set(existingCatRows.map((r) => r.category_id));

  // 3. Atomically insert into targetMonth
  expoDb.withTransactionSync(() => {
    for (const b of srcBudgets) {
      const cats = catMap.get(b.id) || [];
      const newCats = cats.filter((cat) => !existingCatIds.has(cat.category_id));

      expoDb.runSync(
        `INSERT INTO budgets (name, month, template) VALUES (?, ?, ?);`,
        [b.name, targetMonth, b.template]
      );
      const lastIdRow = expoDb.getFirstSync<{ id: number }>(`SELECT last_insert_rowid() as id;`);
      const newBudgetId = lastIdRow?.id;
      if (newBudgetId) {
        for (const cat of newCats) {
          expoDb.runSync(
            `INSERT OR IGNORE INTO budget_categories (budget_id, category_id, month, amount) VALUES (?, ?, ?, ?);`,
            [newBudgetId, cat.category_id, targetMonth, cat.amount]
          );
          existingCatIds.add(cat.category_id);
        }
      }
    }
  });
}


