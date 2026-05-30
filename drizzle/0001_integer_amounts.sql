ALTER TABLE monthly_finance
  ALTER COLUMN income TYPE integer USING ROUND(income)::integer,
  ALTER COLUMN fixed_expense TYPE integer USING ROUND(fixed_expense)::integer,
  ALTER COLUMN variable_expense TYPE integer USING ROUND(variable_expense)::integer,
  ALTER COLUMN bonus TYPE integer USING ROUND(bonus)::integer;
--> statement-breakpoint
ALTER TABLE assets ALTER COLUMN amount TYPE integer USING ROUND(amount)::integer;
--> statement-breakpoint
ALTER TABLE liabilities ALTER COLUMN amount TYPE integer USING ROUND(amount)::integer;
--> statement-breakpoint
ALTER TABLE fire_settings
  ALTER COLUMN annual_expense TYPE integer USING ROUND(annual_expense)::integer,
  ALTER COLUMN side_income TYPE integer USING ROUND(side_income)::integer;
--> statement-breakpoint
ALTER TABLE life_events ALTER COLUMN target_amount TYPE integer USING ROUND(target_amount)::integer;
--> statement-breakpoint
ALTER TABLE asset_snapshots
  ALTER COLUMN total_assets TYPE integer USING ROUND(total_assets)::integer,
  ALTER COLUMN savings TYPE integer USING ROUND(savings)::integer;
