import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import PublicForm from "../models/PublicForm.js";
import { INITIAL_PUBLIC_FORMS } from "../data/publicForms.js";

export async function seedPublicForms() {
  await PublicForm.init();
  let inserted = 0;
  for (const form of INITIAL_PUBLIC_FORMS) {
    const document = new PublicForm(form);
    await document.validate();
    const now = new Date();
    const data = { ...document.toObject(), createdAt: now, updatedAt: now };
    try {
      // Disabling automatic timestamps avoids touching existing records at all.
      const result = await PublicForm.updateOne(
        { slug: form.slug }, { $setOnInsert: data },
        { upsert: true, timestamps: false, setDefaultsOnInsert: false }
      );
      inserted += result.upsertedCount;
    } catch (error) {
      // Concurrent seed runs may race on the unique slug index.
      if (error.code !== 11000 || !await PublicForm.exists({ slug: form.slug })) throw error;
    }
  }
  return { inserted, existing: INITIAL_PUBLIC_FORMS.length - inserted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.MONGO_URL) throw new Error("MONGO_URL must be configured before running the seed.");
    await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 15000 });
    console.log("Public forms seed:", await seedPublicForms());
  } catch (error) {
    console.error("Public forms seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
