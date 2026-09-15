import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const address = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().default(""),
  city: z.string().min(1),
  state: z.string().regex(/^[A-Z]{2}$/),
  postalCode: z.string().regex(/^\d{5}$/),
  phone: z.string().regex(/^\d{10}$/),
});

export async function readFlowersConfig() {
  const config = z
    .object({
      productUrl: z.url(),
      product: z.string().min(1),
      size: z.enum(["Small", "Medium", "Large", "Extra Large"]),
      deliveryZip: z.string().regex(/^\d{5}$/),
      deliveryTimeZone: z.string().default("America/Los_Angeles"),
      locationType: z.enum(["Residence", "Business", "Apartment"]),
      deliveryDate: z.literal("next_available"),
      maxTotal: z.number().int().positive().max(50000),
      recipient: address.nullable(),
      giftMessage: z.string().max(200),
    })
    .parse(JSON.parse(await readFile("flowers.json", "utf8")));
  const url = new URL(config.productUrl);
  assert(
    url.protocol === "https:" && url.hostname === "www.1800flowers.com",
    "Use a product URL on www.1800flowers.com",
  );
  assert(
    !config.recipient || config.recipient.postalCode === config.deliveryZip,
    "Recipient ZIP must match the delivery ZIP",
  );
  return config;
}
