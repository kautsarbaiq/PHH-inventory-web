CREATE TABLE "bins" (
	"code" text PRIMARY KEY NOT NULL,
	"zone" text NOT NULL,
	"rack" text NOT NULL,
	"shelf" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pick_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"barcode" text NOT NULL,
	"bin_code" text,
	"qty_to_pick" integer NOT NULL,
	"qty_picked" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pick_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"customer" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pick_lists_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "placement_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"barcode" text NOT NULL,
	"qty" integer NOT NULL,
	"source_po" text NOT NULL,
	"bin_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"barcode" text NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"expected_qty" integer NOT NULL,
	"received_qty" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"supplier" text NOT NULL,
	"expected_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
ALTER TABLE "pick_lines" ADD CONSTRAINT "pick_lines_list_id_pick_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."pick_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pick_lines_list_id_idx" ON "pick_lines" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "placement_items_bin_code_idx" ON "placement_items" USING btree ("bin_code");--> statement-breakpoint
CREATE INDEX "po_items_po_id_idx" ON "po_items" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "po_items_barcode_idx" ON "po_items" USING btree ("barcode");