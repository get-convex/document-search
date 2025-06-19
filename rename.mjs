#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";
import readline from "readline";

// Utility functions for case conversion
function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toUpperCase());
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  if (pascal === pascal.toUpperCase()) {
    return pascal.toLowerCase();
  }
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[-_\s]+/g, "-")
    .toLowerCase();
}

function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-_\s]+/g, "_")
    .toLowerCase();
}

function toSpaceCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
}

function toTitleCase(str) {
  if (str === str.toUpperCase()) {
    return str;
  }
  return toSpaceCase(str)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Function to get all files recursively, excluding specified directories
function getAllFiles(dir, excludeDirs = [".git", "node_modules", ".cursor"]) {
  const files = [];

  function traverse(currentPath) {
    const items = readdirSync(currentPath);
    for (const item of items) {
      const fullPath = join(currentPath, item);
      if (fullPath === "bootstrap.mjs") {
        continue;
      }
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          traverse(fullPath);
        }
      } else {
        // Only process text files (skip binary files)
        const ext = extname(item).toLowerCase();
        const textExtensions = [
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          ".cjs",
          ".mjs",
          ".json",
          ".md",
          ".txt",
          ".yaml",
          ".yml",
          ".html",
          ".css",
          ".scss",
          ".less",
          ".xml",
          ".config",
        ];

        if (textExtensions.includes(ext) || !ext) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return files;
}

// Function to replace all occurrences in a file
function replaceInFile(filePath, replacements) {
  try {
    let content = readFileSync(filePath, "utf8");
    let hasChanges = false;

    for (const [oldText, newText] of replacements) {
      if (content.includes(oldText)) {
        content = content.replaceAll(oldText, newText);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      writeFileSync(filePath, content, "utf8");
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    // Skip files that can't be read as text
    if (error.code !== "EISDIR") {
      console.warn(`Warning: Could not process ${filePath}: ${error.message}`);
    }
  }
}

// Main setup function
async function setup() {
  console.log("🚀 Convex Component Setup\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Current directory name
  const currentDirName = basename(process.cwd());

  // Prompt for component name
  const componentName = await new Promise((resolve) => {
    rl.question(
      `Enter your component name (e.g., "document search" or "RAG") [${currentDirName}]: `,
      (answer) => {
        resolve(answer.trim() || currentDirName);
      }
    );
  });

  if (!componentName.trim()) {
    console.error("❌ Component name is required!");
    process.exit(1);
  }

  // Prompt for npm package name
  const npmPackageName = await new Promise((resolve) => {
    rl.question(
      `Enter your npm package name [@convex-dev/${toKebabCase(componentName)}]: `,
      (answer) => {
        resolve(answer.trim() || `@convex-dev/${toKebabCase(componentName)}`);
      }
    );
  });

  // Prompt for repository name
  const repoName = await new Promise((resolve) => {
    rl.question(
      `Enter your repository name [get-convex/${toKebabCase(componentName)}]: `,
      (answer) => {
        resolve(answer.trim() || `get-convex/${toKebabCase(componentName)}`);
      }
    );
  });

  rl.close();

  // Generate all case variations
  const cases = {
    pascal: toPascalCase(componentName),
    camel: toCamelCase(componentName),
    kebab: toKebabCase(componentName),
    snake: toSnakeCase(componentName),
    space: toSpaceCase(componentName),
    title: toTitleCase(componentName),
  };

  console.log("\n📝 Component name variations:");
  console.log(`  PascalCase: ${cases.pascal}`);
  console.log(`  camelCase: ${cases.camel}`);
  console.log(`  kebab-case: ${cases.kebab}`);
  console.log(`  snake_case: ${cases.snake}`);
  console.log(`  space case: ${cases.space}`);
  console.log(`  Title Case: ${cases.title}`);
  console.log(`  NPM package: ${npmPackageName}`);
  console.log(`  Repository: ${repoName}\n`);

  // Define all replacements
  const replacements = [
    // NPM package name
    ["@convex-dev/document-search", npmPackageName],

    // Repository name
    ["get-convex/document-search", repoName],

    // Component name variations
    ["DocumentSearch", cases.pascal],
    ["documentSearch", cases.camel],
    ["document-search", cases.kebab],
    ["document_search", cases.snake],
    ["document search", cases.space],
    ["Document Search", cases.title],

    // // Handle the component definition in convex.config.ts
    // ['"documentSearch"', `"${cases.camel}"`],

    // // Handle description (appears in package.json)
    // ["A document search component for Convex.", `A ${cases.space} component for Convex.`],
  ];

  console.log("🔍 Finding files to update...");
  const files = getAllFiles(".");
  console.log(`Found ${files.length} files to process.\n`);

  console.log("🔄 Processing files...");
  let processedCount = 0;

  for (const file of files) {
    replaceInFile(file, replacements);
    processedCount++;
  }

  console.log(`\n✅ Setup complete! Processed ${processedCount} files.`);
  console.log("\n📋 Next steps: check out README.md");

  // Prompt to delete bootstrap.mjs
  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const shouldDelete = await new Promise((resolve) => {
    rl2.question(
      "\n🗑️  Would you like to delete the bootstrap.mjs file now? (y/N): ",
      (answer) => {
        resolve(
          answer.toLowerCase().trim() === "y" ||
            answer.toLowerCase().trim() === "yes"
        );
      }
    );
  });

  rl2.close();

  if (shouldDelete) {
    try {
      const { unlinkSync } = await import("fs");
      unlinkSync("./bootstrap.mjs");
      console.log("✅ bootstrap.mjs has been deleted.");
    } catch (error) {
      console.error("❌ Failed to delete bootstrap.mjs:", error.message);
    }
  } else {
    console.log(
      "📝 bootstrap.mjs kept. You can delete it manually when ready."
    );
  }
}

// Run the setup
setup().catch(console.error);
