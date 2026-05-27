import { describe, it, expect } from "vitest";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

describe("S3 Credentials Validation", () => {
  it("should successfully connect to marketing-manus-scraper bucket and list incoming/ prefix", async () => {
    const client = new S3Client({
      region: process.env.AWS_DEFAULT_REGION || "us-east-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new ListObjectsV2Command({
      Bucket: "marketing-manus-scraper",
      Prefix: "incoming/",
      MaxKeys: 5,
    });

    const response = await client.send(command);

    // Should not throw — confirms credentials are valid and bucket is accessible
    expect(response.$metadata.httpStatusCode).toBe(200);
    // The bucket should exist and respond (may or may not have objects)
    expect(response.Name).toBe("marketing-manus-scraper");
  }, 15000);
});
