#!/usr/bin/env node

/**
 * Test Generation Script
 *
 * This script automatically generates test cases by parsing @test-scope comments
 * from the codebase. It ensures that every function has adequate test coverage
 * and that new features include proper testing from the start.
 *
 * @test-scope: Automated test generation from code comments
 * @test-requirements:
 *   - TC-TESTGEN-001: Parse all TypeScript files for test annotations
 *   - TC-TESTGEN-002: Generate test files based on extracted metadata
 *   - TC-TESTGEN-003: Update regression test documentation
 *   - TC-TESTGEN-004: Report coverage statistics
 * @test-edge-cases:
 *   - No test annotations found
 *   - Malformed comments
 *   - File permission errors
 * @test-dependencies: File system, TypeScript parser
 */

import { generateRegressionSuite } from "../lib/test-generator"

console.log("🔍 Scanning codebase for test annotations...\n")

generateRegressionSuite("app/")
  .then((results) => {
    console.log("\n📊 Test Generation Complete")
    console.log("=".repeat(50))
    console.log(`Files Scanned: ${results.filesScanned}`)
    console.log(`Tests Generated: ${results.testsGenerated}`)
    console.log(`Coverage: ${results.coverage}%`)
    console.log("=".repeat(50))

    if (results.coverage < 80) {
      console.log("\n⚠️  WARNING: Coverage below 80% threshold")
      process.exit(1)
    }

    console.log("\n✅ Test generation successful")
  })
  .catch((error) => {
    console.error("\n❌ Test generation failed:", error)
    process.exit(1)
  })
