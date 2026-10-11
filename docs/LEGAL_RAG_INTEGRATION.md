# Legal RAG Integration & Upstream Attribution: BNS Legal RAG

This document records the architectural analysis, upstream attribution, and integration details for incorporating Indian legal retrieval-augmented generation (RAG) capabilities into **NayaSetu**, referencing the open-source **bns-legal-rag** project.

---

## 1. Upstream Repository Reference

- **Repository**: [https://github.com/goyashek/bns-legal-rag](https://github.com/goyashek/bns-legal-rag)
- **Author**: [@goyashek](https://github.com/goyashek)
- **License**: **MIT License**
- **Upstream Scope**: Retrieval-augmented statutory question answering for India's 2023 criminal law reform:
  - **Bharatiya Nyaya Sanhita (BNS), 2023** (replacing the Indian Penal Code, 1860)
  - **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** (replacing the Code of Criminal Procedure, 1973)
  - **Bharatiya Sakshya Adhiniyam (BSA), 2023** (replacing the Indian Evidence Act, 1872)

---

## 2. Upstream Architecture & Key Engineering Findings

The `bns-legal-rag` project offers several critical engineering insights for Indian legal NLP:

1. **The Invariant of Deterministic Citation Validation**:
   - In legal question-answering, an LLM often hallucinates adjacent statutory sections (e.g., citing BNS 307 when only BNS 306 was retrieved).
   - Upstream author tested an LLM faithfulness checker node in LangGraph, but found it reduced faithfulness to 0.309 because the LLM judge rejected verified answers.
   - **Solution**: A deterministic check in Python with zero model calls that extracts all cited section numbers from an answer, cross-references them against retrieved chunks, and flags any ungrounded citations. This raised faithfulness to 0.517–0.591.

2. **IPC ↔ BNS Statutory Bridging**:
   - Pre-2024 Indian court orders, FIRs, and existing judgments exclusively cite the repealed IPC and CrPC.
   - To make legal intelligence relevant under current law, a bridge is necessary to map old penal and procedural sections to their enacted 2023 BNS and BNSS equivalents.

3. **Dense Retrieval over Complex Agent Graphs**:
   - Upstream findings demonstrated that simpler, bounded retrieval graphs outperformed multi-node recursive rewrite loops in latency, predictability, and precision.

---

## 3. What is Actually Integrated into NayaSetu

To preserve NayaSetu's high performance, zero-crash local stability, and clean dependency footprint, the compatible components were safely implemented inside NayaSetu's service layer ([`backend/app/services/legal_rag_service.py`](file:///C:/Users/Lenovo/OneDrive/Desktop/NayaSetu/Error_202_legal/backend/app/services/legal_rag_service.py)):

### A. IPC / CrPC to BNS / BNSS Statutory Bridge
- Defined explicit cross-statutory mappings:
  - **IPC 302** (Murder) $\rightarrow$ **BNS Section 103** (Capital / Life)
  - **IPC 307** (Attempt to Murder) $\rightarrow$ **BNS Section 109** (Serious, 7+ Years)
  - **IPC 420** (Cheating) $\rightarrow$ **BNS Section 318(4)** (Serious, 7+ Years)
  - **IPC 406** (Criminal Breach of Trust) $\rightarrow$ **BNS Section 316** (Moderate, < 7 Years)
  - **IPC 498A** (Cruelty to Woman) $\rightarrow$ **BNS Section 85** (Moderate, < 7 Years)
  - **IPC 304B** (Dowry Death) $\rightarrow$ **BNS Section 80** (Capital / Life)
  - **CrPC 437** (Magistrate Bail) $\rightarrow$ **BNSS Section 480**
  - **CrPC 438** (Anticipatory Bail) $\rightarrow$ **BNSS Section 482**
  - **CrPC 439** (Special Bail Powers) $\rightarrow$ **BNSS Section 483**
- Exposed `bridge_old_statute_to_bns(citation_text)` to provide automated statutory bridging in document analysis and grounded Q&A.

### B. Deterministic Code-Checked Citation Validator
- Implemented `validate_citations_against_retrieved_sources(answer_text, retrieved_sources, document_sections)`.
- Verifies every cited section in text against retrieved knowledge base chunks and document extractions.
- Prevents citation hallucination without requiring secondary expensive LLM judge calls.

### C. Curated Statutory Knowledge Base with Modern Enacted Codes
- Embedded BNS and BNSS provision metadata, punishment scope, and landmark bail precedents (*Satender Kumar Antil v. CBI (2022)* 4-category classification framework).
- Integrated with the **Preliminary Statutory Severity Assessment** pipeline, providing objective seriousness tiers and mandatory non-guilt notices.

---

## 4. What is Referenced Only (Not Integrated)

The following components from `goyashek/bns-legal-rag` were **not** integrated into NayaSetu:

1. **Qdrant Embedded Vector Database**: NayaSetu uses an in-memory hybrid retrieval adapter with lexical boosting and IDF-weighted cosine ranking to maintain zero external binary dependencies.
2. **LangGraph 0.2 Multi-Agent Orchestration**: NayaSetu uses a deterministic FastAPI service pipeline (`pdf_service` $\rightarrow$ `legal_rag_service` $\rightarrow$ `analysis_service` $\rightarrow$ `storage_service`) avoiding multi-agent recursion overhead.
3. **Full 1,155-Chunk Bare Act Corpus**: Only the key criminal and procedural sections relevant to court orders and bail petitions are embedded in NayaSetu's immediate knowledge base.
4. **RAGAS 50-Scenario Evaluation Suite**: Evaluation in NayaSetu is performed via automated unit/integration tests (`pytest`) and live end-to-end PDF validation.

---

## 5. Verification & Compliance

- **Upstream License**: MIT License — allows reuse and adaptation with proper attribution.
- **Independence**: NayaSetu's core application, PyMuPDF extraction, FastAPI backend, SQLite persistence, and React frontend remain independent and fully functional.
- **Verification**: Verified with automated tests in `backend/tests/test_analysis.py` (23 passing tests).
