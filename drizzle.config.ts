import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "expo", // 👈 Targets Expo SQLite
  schema: "./db/schema.ts", // Path to your schema definitions
  out: "./drizzle", // Output folder for migrations
});
