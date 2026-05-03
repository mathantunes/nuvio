CREATE TABLE "instrument_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"instrument_type" text NOT NULL,
	"instrument_id" uuid NOT NULL,
	"amount" numeric(18, 6) NOT NULL,
	"currency_code" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_flows" ADD COLUMN "instrument_transfer_id" uuid;--> statement-breakpoint
ALTER TABLE "instrument_transfers" ADD CONSTRAINT "instrument_transfers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_flows" ADD CONSTRAINT "investment_flows_instrument_transfer_id_instrument_transfers_id_fk" FOREIGN KEY ("instrument_transfer_id") REFERENCES "public"."instrument_transfers"("id") ON DELETE no action ON UPDATE no action;