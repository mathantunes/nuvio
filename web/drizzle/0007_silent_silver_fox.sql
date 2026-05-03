CREATE TABLE "asset_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"currency_code" text NOT NULL,
	"valued_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"description" text,
	"currency_code" text NOT NULL,
	"purchase_price" numeric(18, 6) NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_amortizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"amount" numeric(18, 6) NOT NULL,
	"kind" text DEFAULT 'a_prazo' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"instrument_transfer_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"instrument_transfer_id" uuid,
	"payment_date" timestamp with time zone NOT NULL,
	"total_amount" numeric(18, 6) NOT NULL,
	"principal_amount" numeric(18, 6) NOT NULL,
	"interest_amount" numeric(18, 6) NOT NULL,
	"remaining_balance" numeric(18, 6) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"lender" text NOT NULL,
	"principal" numeric(18, 6) NOT NULL,
	"currency_code" text NOT NULL,
	"interest_rate" numeric(8, 6) NOT NULL,
	"term_months" integer NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'simulation' NOT NULL,
	"asset_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_valuations" ADD CONSTRAINT "asset_valuations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_amortizations" ADD CONSTRAINT "loan_amortizations_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_amortizations" ADD CONSTRAINT "loan_amortizations_instrument_transfer_id_instrument_transfers_id_fk" FOREIGN KEY ("instrument_transfer_id") REFERENCES "public"."instrument_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_instrument_transfer_id_instrument_transfers_id_fk" FOREIGN KEY ("instrument_transfer_id") REFERENCES "public"."instrument_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;