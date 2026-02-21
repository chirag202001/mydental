/**
 * Unit tests for utility functions.
 */
import { describe, it, expect } from "vitest";
import {
  cn,
  slugify,
  generateInvoiceNumber,
  formatCurrency,
  getInitials,
} from "@/lib/utils";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("should override conflicting tailwind classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });
});

describe("slugify", () => {
  it("should convert to lowercase kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should remove special characters", () => {
    expect(slugify("Smile Dental!!! @#$")).toBe("smile-dental");
  });

  it("should trim and collapse hyphens", () => {
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });

  it("should handle Indian clinic names", () => {
    expect(slugify("Dr. Sharma's Clinic")).toBe("dr-sharmas-clinic");
  });
});

describe("generateInvoiceNumber", () => {
  it("should start with INV-", () => {
    const num = generateInvoiceNumber();
    expect(num).toMatch(/^INV-/);
  });

  it("should include 2-digit year and month", () => {
    const num = generateInvoiceNumber();
    const y = new Date().getFullYear().toString().slice(-2);
    const m = (new Date().getMonth() + 1).toString().padStart(2, "0");
    expect(num).toContain(`${y}${m}`);
  });
});

describe("formatCurrency", () => {
  it("should format as INR by default", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("1,500");
  });

  it("should handle zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });
});

describe("getInitials", () => {
  it("should return first letters of each word", () => {
    expect(getInitials("Dr. Priya Sharma")).toBe("DP");
  });

  it("should handle single name", () => {
    expect(getInitials("Priya")).toBe("P");
  });

  it("should handle empty string", () => {
    expect(getInitials("")).toBe("");
  });
});
