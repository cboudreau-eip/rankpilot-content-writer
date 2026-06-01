import { describe, it, expect } from "vitest";

describe("CMS Password Validation", () => {
  it("should have CMS_PASSWORD environment variable set", () => {
    const password = process.env.CMS_PASSWORD;
    expect(password).toBeDefined();
    expect(password!.length).toBeGreaterThan(0);
  });

  it("should authenticate successfully against the CMS API", async () => {
    const password = process.env.CMS_PASSWORD;
    if (!password) {
      throw new Error("CMS_PASSWORD not set");
    }

    // Use a HEAD-like request to verify auth works without creating an article
    // We'll POST with invalid data but valid auth - should get a validation error, not 401
    const response = await fetch(
      "https://medicarefaq-next-nine.vercel.app/api/cms/create/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cms-password": password,
        },
        body: JSON.stringify({}), // Empty body - should fail validation, not auth
      }
    );

    // If we get 401, the password is wrong. Any other status means auth passed.
    expect(response.status).not.toBe(401);
  });
});
