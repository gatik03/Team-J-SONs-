<!-- VERBATIM extract of LoanLensAI_Hackathon_Usecase.docx. This is the hackathon-mandated source of truth. Do not edit. -->


**LoanLens AI – Intelligent Digital Lending and Credit Advisory Platform**

**1. Business Scenario**

**Kestrel Bank** is a leading retail bank serving over 12 million customers across India through branches, a mobile app, and a call centre. Its lending portfolio includes personal loans, home loans, vehicle loans, and education loans.

Customers often face challenges such as:

- Difficulty choosing the right loan product, amount, and tenure for their needs

- Uncertainty about eligibility before submitting a formal application

- Confusion about interest rates, processing fees, prepayment, and foreclosure charges

- Lengthy documentation and repeated requests for the same documents

- No clear visibility of application status and next steps

- Inconsistent answers from the branch, call centre, and mobile app

Lending operations teams face challenges such as:

- Manually verifying documents and cross-checking customer details

- Applying credit policy consistently across thousands of applications

- High volume of incomplete or ineligible applications

- Explaining approval or rejection decisions clearly to customers

- Maintaining a complete audit trail for compliance and regulatory reviews

- Coordinating between sales, KYC, credit, and compliance teams

To improve customer experience, reduce turnaround time, and strengthen decision quality, Kestrel Bank wants to build an AI-powered lending platform using **Spring Boot, Spring AI, RAG, Agentic AI, and Generative AI**.

**2. Hackathon Challenge**

Build **LoanLens AI**, an intelligent lending assistant capable of:

- Understanding customer loan needs from natural language

- Recommending suitable loan products with indicative EMI

- Answering policy and product questions from approved bank documents using RAG

- Pre-screening eligibility with clear, explainable reasons

- Coordinating document verification, credit assessment, and compliance checks through AI agents

- Keeping a human in control of final credit decisions with a complete audit trail

**Module 1: Digital Loan Discovery ****&**** Application**

**Objective**

Create a modern digital lending experience where customers can explore loan products, check affordability, and submit applications with AI guidance.

**Functional Requirements**

Implement:

- Loan product catalogue (personal, home, vehicle, education)

- Product search, filtering, sorting, and comparison

- EMI calculator with amortization schedule

- Customer login and profile (employment type, income, existing obligations)

- Multi-step loan application with save-as-draft

- Document upload (identity, address, income proof)

- Application status tracker with timeline

- Role-based navigation (Customer, Loan Officer, Credit Analyst)

- Responsive UI

**AI Loan Advisor**

User can ask:

“I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.”

AI should:

- Understand intent

- Extract amount, purpose, income, and EMI preference

- Recommend suitable products and tenure

- Explain the recommendation and indicate likely eligibility

- Ask a clarifying question when key information is missing

**Expected Response**

{

  "interpretedRequirement": "Used car loan of 5 lakh with EMI below 12,000",

  "loanAmount": 500000,

  "monthlyIncome": 60000,

  "maxPreferredEmi": 12000,

  "currency": "INR",

  "recommendations": [

    {

      "productId": "VL-204",

      "productName": "Kestrel Pre-Owned Car Loan",

      "indicativeInterestRate": 11.0,

      "tenureMonths": 60,

      "estimatedEmi": 10871,

      "reason": "60-month tenure keeps EMI within the limit (about 18% of income)",

      "eligibilityIndicator": "LIKELY_ELIGIBLE"

    }

  ],

  "disclaimer": "Indicative only. Final approval is subject to credit assessment.",

  "clarifyingQuestion": null

}

**Module 2: RAG-Based Lending Policy Assistant**

**Objective**

Build a reliable assistant that answers loan and policy questions only from Kestrel Bank’s approved documents, rather than from the model’s general knowledge.

**Knowledge Sources**

Documents may include:

- Loan product terms and conditions

- Interest rate and fee schedules

- Credit policy and eligibility criteria

- KYC and document checklists

- Prepayment and foreclosure policy

- Grievance redressal procedure

- Regulatory circular summaries

- Loan officer playbooks (internal)

**Functional Requirements**

Implement:

- Document upload and ingestion (PDF, Markdown, CSV, JSON)

- Section-aware chunking

- Embedding generation and vector storage with metadata

- Metadata filtering by:

- Loan type

- Effective date

- Customer segment

- Document type

- Audience (customer or internal)

- Retrieval of the latest effective version when multiple versions of a document exist

- Grounded response generation with source title, section, and version

- Safe response when supporting information is not found

- Masking of sensitive data (PAN, Aadhaar, account numbers) in prompts and logs

**Example Questions**

- What documents do I need for a home loan if I am self-employed?

- What is the processing fee for a personal loan of ₹3 lakh?

- Can I foreclose my vehicle loan after six months, and are there any charges?

- What is the minimum credit score required for a home loan?

- How long does disbursal take after approval?

**Expected Output**

{

  "answer": "Foreclosure is allowed after 6 EMIs, with a 2% charge on the outstanding principal.",

  "confidence": "HIGH",

  "sources": [

    {

      "document": "Vehicle Loan Terms and Conditions",

      "section": "Foreclosure and Part-Prepayment",

      "version": "2026.3",

      "effectiveDate": "2026-07-01"

    }

  ],

  "followUpRequired": false

}

**Module 3: Agentic Loan Processing Workflow**

**Objective**

Use specialised AI agents to pre-process loan applications while keeping every recommendation explainable, auditable, and subject to human approval.

**Agents**

Teams should implement at least three of the following agents:

- **Document Verification Agent** – checks completeness of uploaded documents and flags mismatches in name, income, or address

- **Credit Assessment Agent** – applies policy rules such as income-to-obligation ratio and credit score band using tools, and explains the result

- **Compliance Agent** – checks KYC status and policy exceptions using the RAG knowledge base

- **Customer Communication Agent** – drafts status updates and additional-information requests in plain language

- **Orchestrator Agent** – routes the application between agents and decides when to involve a human

**Functional Requirements**

Implement:

- Agent orchestration using Spring AI tool calling (or an equivalent approach)

- Mock tools for credit bureau score, income verification, KYC status, and application update

- Deterministic calculations (EMI, income-to-obligation ratio) performed by code, not by the language model

- Human-in-the-loop approval for borderline, high-value, or policy-exception cases

- Role-based permissions for tools and actions

- Audit trail recording every agent step, tool call, input, output, and timestamp

**Guardrails**

The solution must:

- Never use protected attributes (such as gender, religion, caste, or marital status) in decision logic

- Never approve or reject a loan autonomously; agents can only recommend

- Provide plain-language reasons for every recommendation

- Refuse and log any attempt to perform an action outside an agent’s permissions

**Example Scenario**

A customer submits a ₹5 lakh personal loan application with salary slips and a bank statement, but the address proof is missing. The agents should verify the documents, assess affordability, and prepare a recommendation for the credit analyst.

**Expected Output**

{

  "applicationId": "LA-2026-00418",

  "recommendation": "REQUEST_ADDITIONAL_DOCUMENTS",

  "riskBand": "MEDIUM",

  "checks": [

    {

      "agent": "DocumentVerificationAgent",

      "result": "INCOMPLETE",

      "detail": "Address proof is missing"

    },

    {

      "agent": "CreditAssessmentAgent",

      "result": "PASS",

      "detail": "Obligation ratio is 38% (limit 50%); credit score band is 720-760"

    },

    {

      "agent": "ComplianceAgent",

      "result": "PASS",

      "detail": "KYC status verified"

    }

  ],

  "missingDocuments": [

    "Address proof"

  ],

  "customerMessage": "Please upload a valid address proof to continue your application.",

  "requiresHumanApproval": true,

  "auditTrailId": "AUD-2026-77301"

}

**Assumptions**

- Synthetic customer, product, and policy data should be used. No real customer data is required.

- Participants may use any approved AI models, frameworks, libraries, and AI-assisted development tools (vibe-coding), provided engineering quality, security, testing, and traceability are maintained.

- Reasonable assumptions may be made where requirements are not explicitly specified.

- Figures, policies, and names shown in the sample responses are illustrative. Teams should create their own sample documents and data.

**Business Assumptions**

**Customer Management**

- Customer registration, authentication, and KYC already exist and can be simulated.

- Customers belong to segments:

- Salaried

- Self-employed

- Student

- Customer profile contains income, employment type, location, and existing obligations.

**Loan Products**

Each loan product contains:

- Product ID

- Name and loan type

- Interest rate range

- Tenure range

- Minimum and maximum amount

- Processing fee

- Eligibility criteria

**Applications**

- Applications move through these statuses:

- Draft

- Submitted

- Under Verification

- Under Review

- Approved

- Rejected

- Disbursed

- Disbursement and payment processing are out of scope and may be simulated.

**Credit and Verification Services**

- Credit bureau, income verification, and KYC services are exposed as mock APIs.

- Credit scores range from 300 to 900.

**Knowledge Base**

- Bank documents are assumed to be trusted and approved.

- Documents have metadata:

- Version

- Effective Date

- Loan Type

- Document Type

- Audience

**Recommended Technology Stack**

Frontend Libraries: React 19 + Vite

Backend: Java + Spring Boot 3 + Spring AI

Database: PostgreSQL + PgVector

AI Models: Participants can use any models

**Deliverables**

Each team must submit:

- Working application and source code.

- Architecture diagram and solution overview.

- Setup instructions.

- Live demonstration of key capabilities.

- Use proper schema designs

- Proper validation and error handling

- Clean folder structure

- Seed data scripts and the list of test prompts used in the demonstration.

- A short note on AI guardrails, known limitations, and responsible-AI decisions.
