#!/usr/bin/env node
/**
 * Create or update a platform owner (superAdmin) for local / staging use.
 *
 * Usage (from hotel-hub root):
 *   MONGODB_URI="mongodb://..." node scripts/seed-platform-owner.mjs
 *
 * Optional env:
 *   PLATFORM_OWNER_EMAIL   (default: platform.owner@example.com)
 *   PLATFORM_OWNER_PASSWORD (default: ChangeMe!Platform1)
 *   PLATFORM_OWNER_FIRST_NAME
 *   PLATFORM_OWNER_LAST_NAME
 *
 * If the email already exists, that user is promoted to superAdmin,
 * password is updated, and tenantId/branchId are cleared (platform-only).
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // ignore missing file
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
const SALT_ROUNDS = 12;

const email = (process.env.PLATFORM_OWNER_EMAIL || "platform.owner@example.com").toLowerCase();
const password = process.env.PLATFORM_OWNER_PASSWORD || "ChangeMe!Platform1";
const firstName = process.env.PLATFORM_OWNER_FIRST_NAME || "Platform";
const lastName = process.env.PLATFORM_OWNER_LAST_NAME || "Owner";

async function main() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI. Set it in .env / .env.local or export it in the shell.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const users = mongoose.connection.collection("users");
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await users.findOne({ email });

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: "superAdmin",
          password: hashed,
          isActive: true,
          permissions: [],
          firstName,
          lastName,
        },
        $unset: { tenantId: "", branchId: "" },
      }
    );
    console.log(`Updated existing user → superAdmin (platform-only): ${email}`);
  } else {
    const now = new Date();
    await users.insertOne({
      firstName,
      lastName,
      email,
      password: hashed,
      role: "superAdmin",
      isActive: true,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created platform owner: ${email}`);
  }

  const appPort = process.env.PORT || "3000";
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || `http://localhost:${appPort}`;

  console.log("\n--- Login (multi-tenant platform) ---");
  console.log(`URL:  ${base}/login`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("\nAfter login you should see: Dashboard, Platform (Tenants, Subscription plans), Settings.");
  console.log("Change the password in production.\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
