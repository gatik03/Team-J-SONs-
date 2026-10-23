import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../common/prisma";
import { getApplication } from "../coreBridge";
vi.mock("../config/llm", () => ({
  structured: vi.fn().mockRejectedValue(new Error("Offline test")),
  plainText: vi.fn().mockRejectedValue(new Error("Offline test")),
}));
vi.mock("../rag/policyAssistant", () => ({
  askPolicy: vi
    .fn()
    .mockResolvedValue({
      answer: "Only a credit analyst can decide.",
      confidence: "HIGH",
      sources: [],
      followUpRequired: false,
    }),
}));
const app = createApp();
const ids: string[] = [];
afterAll(async () => {
  await prisma.agentRun.deleteMany({ where: { applicationId: { in: ids } } });
  await prisma.loanApplication.deleteMany({
    where: { applicationId: { in: ids } },
  });
});
describe("S1 + S2 integrated application lifecycle", () => {
  it("uses real core data, persists workflow state, exposes only customer updates, and leaves the final decision to an analyst", async () => {
    const login = async (username: string) => {
      const r = await request(app)
        .post("/api/auth/login")
        .send({ username, password: "password" });
      expect(r.status).toBe(200);
      return `Bearer ${r.body.token}`;
    };
    const customer = await login("priya.sharma"),
      officer = await login("officer.kumar"),
      analyst = await login("analyst.mehta");
    const created = await request(app)
      .post("/api/applications")
      .set("authorization", customer)
      .send({
        productId: "PL-101",
        requestedAmount: 500000,
        tenureMonths: 48,
        purpose: "Integration test",
        employmentType: "Salaried",
        monthlyIncome: 60000,
        existingMonthlyObligations: 8000,
        currentStep: 4,
      });
    expect(created.status).toBe(201);
    const id = created.body.applicationId as string;
    ids.push(id);
    for (const type of ["IDENTITY", "INCOME"] as const)
      await prisma.applicationDocument.create({
        data: {
          documentId: `TEST-${id}-${type}`,
          applicationId: id,
          documentType: type,
          fileName: `test-${type}.pdf`,
          storedPath: "test-only",
          contentType: "application/pdf",
          sizeBytes: 1,
        },
      });
    expect(
      (
        await request(app)
          .post(`/api/applications/${id}/submit`)
          .set("authorization", customer)
      ).status,
    ).toBe(200);
    expect((await getApplication(id)).applicationId).toBe(id);
    const run = await request(app)
      .post(`/api/workflow/applications/${id}/run`)
      .set("authorization", officer);
    expect(run.status).toBe(200);
    expect(run.body).toMatchObject({
      recommendation: "REQUEST_ADDITIONAL_DOCUMENTS",
      missingDocuments: ["Address proof"],
      requiresHumanApproval: true,
    });
    expect(
      (
        await prisma.loanApplication.findUniqueOrThrow({
          where: { applicationId: id },
        })
      ).status,
    ).toBe("UNDER_REVIEW");
    const status = await request(app)
      .get(`/api/applications/${id}`)
      .set("authorization", customer);
    expect(status.body.customerUpdate).toEqual({
      customerMessage:
        "Please upload a valid address proof to continue your application.",
      missingDocuments: ["Address proof"],
    });
    expect(status.body.customerUpdate).not.toHaveProperty("riskBand");
    expect(status.body.customerUpdate).not.toHaveProperty("checks");
    expect(
      (
        await request(app)
          .get(`/api/workflow/applications/${id}/recommendation`)
          .set("authorization", customer)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/applications/${id}/decision`)
          .set("authorization", officer)
          .send({ decision: "APPROVED", reason: "Officer cannot approve" })
      ).status,
    ).toBe(403);
    const decisions = await Promise.all(
      ["APPROVED", "REJECTED"].map((decision) =>
        request(app)
          .post(`/api/applications/${id}/decision`)
          .set("authorization", analyst)
          .send({ decision, reason: "Concurrent human credit decision test." }),
      ),
    );
    expect(decisions.map((r) => r.status).sort()).toEqual([200, 409]);
    const final = await prisma.loanApplication.findUniqueOrThrow({
      where: { applicationId: id },
    });
    expect(final.status).toBe(
      decisions.find((r) => r.status === 200)!.body.status,
    );
  });
});
