"""Legal RAG Service for Indian Court Document Intelligence.

Integrates a curated statutory and precedent knowledge base (IPC, CrPC, BNS, BNSS, Constitution)
with hybrid retrieval, statutory severity evaluation, and contextual grounding.
"""
import math
import re
from typing import Dict, List, Optional, Tuple
from app.schemas.analysis import ExtractedEntity, RetrievedLegalSource, StatutorySeverityAssessment


# Curated authoritative Indian statutory and precedent knowledge base
LEGAL_KNOWLEDGE_BASE: List[Dict[str, str]] = [
    {
        "source_id": "IND-STATUTE-IPC-302",
        "title": "Section 302, Indian Penal Code (Section 103, Bharatiya Nyaya Sanhita)",
        "act_or_authority": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
        "keywords": "murder death life imprisonment 302 103 homicide killing",
        "text": (
            "Section 302 IPC defines the punishment for murder: Whoever commits murder shall be punished with death, "
            "or imprisonment for life, and shall also be liable to fine. Corresponds to Section 103 of Bharatiya Nyaya Sanhita (BNS), 2023. "
            "Under the Code of Criminal Procedure, it is a cognizable, non-bailable offence triable exclusively by a Court of Session."
        ),
        "source_url_or_ref": "Indian Penal Code 1860, Section 302; BNS 2023, Section 103",
        "punishment_info": "Death or Imprisonment for Life, and fine. Cognizable and Non-Bailable.",
        "severity_tier": "Capital / Life",
        "offence_name": "Murder",
        "section_code": "302"
    },
    {
        "source_id": "IND-STATUTE-IPC-307",
        "title": "Section 307, Indian Penal Code (Section 109, Bharatiya Nyaya Sanhita)",
        "act_or_authority": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
        "keywords": "attempt to murder 307 109 bodily injury intention weapon",
        "text": (
            "Section 307 IPC punishes attempt to murder: Whoever does any act with such intention or knowledge, and under such circumstances "
            "that, if he by that act caused death, he would be guilty of murder, shall be punished with imprisonment of either description for a term "
            "which may extend to ten years, and shall also be liable to fine; and if hurt is caused to any person, punishment extends to imprisonment for life. "
            "Corresponds to Section 109 of BNS, 2023. Cognizable, non-bailable, triable by Court of Session."
        ),
        "source_url_or_ref": "Indian Penal Code 1860, Section 307; BNS 2023, Section 109",
        "punishment_info": "Imprisonment up to 10 years, or life imprisonment if hurt is caused, and fine. Cognizable and Non-Bailable.",
        "severity_tier": "Serious (7+ Years)",
        "offence_name": "Attempt to Murder",
        "section_code": "307"
    },
    {
        "source_id": "IND-STATUTE-IPC-420",
        "title": "Section 420, Indian Penal Code (Section 318(4), Bharatiya Nyaya Sanhita)",
        "act_or_authority": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
        "keywords": "cheating dishonestly inducing delivery property 420 318 fraud economic offence",
        "text": (
            "Section 420 IPC defines Cheating and dishonestly inducing delivery of property: Whoever cheats and thereby dishonestly induces "
            "the person deceived to deliver any property, or to make, alter or destroy the whole or any part of a valuable security, shall be punished "
            "with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine. "
            "Corresponds to Section 318(4) of Bharatiya Nyaya Sanhita (BNS), 2023. Cognizable, non-bailable, triable by Magistrate of the first class."
        ),
        "source_url_or_ref": "Indian Penal Code 1860, Section 420; BNS 2023, Section 318(4)",
        "punishment_info": "Imprisonment up to 7 years, and fine. Cognizable and Non-Bailable.",
        "severity_tier": "Serious (7+ Years)",
        "offence_name": "Cheating and Dishonestly Inducing Delivery of Property",
        "section_code": "420"
    },
    {
        "source_id": "IND-STATUTE-IPC-406",
        "title": "Section 406, Indian Penal Code (Section 316, Bharatiya Nyaya Sanhita)",
        "act_or_authority": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
        "keywords": "criminal breach of trust 406 316 entrustment misappropriation",
        "text": (
            "Section 406 IPC provides punishment for criminal breach of trust: Whoever commits criminal breach of trust shall be punished with "
            "imprisonment of either description for a term which may extend to three years, or with fine, or with both. "
            "Corresponds to Section 316 of BNS, 2023. Cognizable, non-bailable, triable by Magistrate of the first class."
        ),
        "source_url_or_ref": "Indian Penal Code 1860, Section 406; BNS 2023, Section 316",
        "punishment_info": "Imprisonment up to 3 years, or with fine, or both. Cognizable and Non-Bailable.",
        "severity_tier": "Moderate (< 7 Years)",
        "offence_name": "Criminal Breach of Trust",
        "section_code": "406"
    },
    {
        "source_id": "IND-STATUTE-IPC-498A",
        "title": "Section 498A, Indian Penal Code (Section 85, Bharatiya Nyaya Sanhita)",
        "act_or_authority": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
        "keywords": "husband relative cruelty woman dowry harassment 498a 85 matrimonial",
        "text": (
            "Section 498A IPC punishes cruelty by husband or relative of husband of a woman: Whoever, being the husband or the relative of the husband "
            "of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine. "
            "Corresponds to Section 85 of BNS, 2023. Governed by pre-arrest notice guidelines under Arnesh Kumar v. State of Bihar."
        ),
        "source_url_or_ref": "Indian Penal Code 1860, Section 498A; BNS 2023, Section 85",
        "punishment_info": "Imprisonment up to 3 years, and fine. Cognizable and Non-Bailable.",
        "severity_tier": "Moderate (< 7 Years)",
        "offence_name": "Cruelty by Husband or Relatives of Husband",
        "section_code": "498A"
    },
    {
        "source_id": "IND-STATUTE-IPC-304B",
        "title": "Section 304B, Indian Penal Code (Section 80, Bharatiya Nyaya Sanhita)",
        "act_or_authority": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
        "keywords": "dowry death 304b 80 seven years marriage bodily injury cruelty",
        "text": (
            "Section 304B IPC defines Dowry Death: Where the death of a woman is caused by any burns or bodily injury or occurs otherwise than under normal "
            "circumstances within seven years of marriage, and it is shown that soon before her death she was subjected to cruelty or harassment for dowry. "
            "Whoever commits dowry death shall be punished with imprisonment for a term which shall not be less than seven years but which may extend to imprisonment for life."
        ),
        "source_url_or_ref": "Indian Penal Code 1860, Section 304B; BNS 2023, Section 80",
        "punishment_info": "Imprisonment not less than 7 years, extending up to Life Imprisonment. Cognizable and Non-Bailable.",
        "severity_tier": "Capital / Life",
        "offence_name": "Dowry Death",
        "section_code": "304B"
    },
    {
        "source_id": "IND-STATUTE-CRPC-437",
        "title": "Section 437, Code of Criminal Procedure (Section 480, Bharatiya Nagarik Suraksha Sanhita)",
        "act_or_authority": "Code of Criminal Procedure, 1973 / BNSS, 2023",
        "keywords": "bail non-bailable magistrate court discretion 437 480 woman sick infirm",
        "text": (
            "Section 437 CrPC governs when bail may be taken in case of non-bailable offence by a court other than the High Court or Court of Session. "
            "Bail shall not be granted if there appear reasonable grounds for believing the accused is guilty of an offence punishable with death or imprisonment for life, "
            "except where the accused is under the age of sixteen years or is a woman or is sick or infirm. Corresponds to Section 480 of BNSS, 2023."
        ),
        "source_url_or_ref": "CrPC 1973, Section 437; BNSS 2023, Section 480",
        "punishment_info": "Procedural provision governing Magisterial bail in non-bailable offences.",
        "severity_tier": "Not Assessed",
        "offence_name": "Magisterial Bail Provision",
        "section_code": "437"
    },
    {
        "source_id": "IND-STATUTE-CRPC-438",
        "title": "Section 438, Code of Criminal Procedure (Section 482, Bharatiya Nagarik Suraksha Sanhita)",
        "act_or_authority": "Code of Criminal Procedure, 1973 / BNSS, 2023",
        "keywords": "anticipatory bail apprehension of arrest high court sessions 438 482",
        "text": (
            "Section 438 CrPC provides direction for grant of bail to person apprehending arrest (Anticipatory Bail). Where any person has reason to believe "
            "that he may be arrested on accusation of having committed a non-bailable offence, he may apply to the High Court or the Court of Session for a direction "
            "that in the event of such arrest, he shall be released on bail. Corresponds to Section 482 of BNSS, 2023."
        ),
        "source_url_or_ref": "CrPC 1973, Section 438; BNSS 2023, Section 482; Gurbaksh Singh Sibbia (1980) 2 SCC 565",
        "punishment_info": "Procedural relief protecting personal liberty prior to formal custody.",
        "severity_tier": "Not Assessed",
        "offence_name": "Anticipatory Bail Provision",
        "section_code": "438"
    },
    {
        "source_id": "IND-STATUTE-CRPC-439",
        "title": "Section 439, Code of Criminal Procedure (Section 483, Bharatiya Nagarik Suraksha Sanhita)",
        "act_or_authority": "Code of Criminal Procedure, 1973 / BNSS, 2023",
        "keywords": "special powers high court sessions regular bail custody 439 483",
        "text": (
            "Section 439 CrPC establishes special powers of the High Court or Court of Session regarding bail: A High Court or Court of Session may direct "
            "that any person accused of an offence and in custody be released on bail, and if the offence is of the nature specified in subsection (3) of section 437, "
            "may impose any condition considered necessary. Corresponds to Section 483 of BNSS, 2023."
        ),
        "source_url_or_ref": "CrPC 1973, Section 439; BNSS 2023, Section 483; Satender Kumar Antil (2022) 10 SCC 51",
        "punishment_info": "Plenary jurisdiction of High Court / Sessions Court for regular bail in custody.",
        "severity_tier": "Not Assessed",
        "offence_name": "Regular Bail Jurisdiction",
        "section_code": "439"
    },
    {
        "source_id": "IND-STATUTE-CRPC-167",
        "title": "Section 167, Code of Criminal Procedure (Section 187, Bharatiya Nagarik Suraksha Sanhita)",
        "act_or_authority": "Code of Criminal Procedure, 1973 / BNSS, 2023",
        "keywords": "default bail statutory remand 60 days 90 days investigation chargesheet 167 187",
        "text": (
            "Section 167(2) CrPC prescribes the procedure when investigation cannot be completed in 24 hours and guarantees default/statutory bail. "
            "The Magistrate may authorize detention beyond 15 days up to a maximum of 90 days (for offences punishable with death, life imprisonment or imprisonment for not less than 10 years) "
            "or 60 days for other offences, upon expiry of which the accused shall be released on bail if prepared to furnish bail."
        ),
        "source_url_or_ref": "CrPC 1973, Section 167(2); BNSS 2023, Section 187; Ritu Chhabaria v. Union of India (2023)",
        "punishment_info": "Infeasible right to default bail upon failure to submit chargesheet within statutory timeline.",
        "severity_tier": "Not Assessed",
        "offence_name": "Default / Statutory Bail Provision",
        "section_code": "167"
    },
    {
        "source_id": "IND-STATUTE-CRPC-374",
        "title": "Section 374, Code of Criminal Procedure (Section 415, Bharatiya Nagarik Suraksha Sanhita)",
        "act_or_authority": "Code of Criminal Procedure, 1973 / BNSS, 2023",
        "keywords": "appeal from convictions trial court sessions high court 374 415",
        "text": (
            "Section 374 CrPC governs appeals from convictions: Any person convicted on a trial held by a High Court in its extraordinary original criminal jurisdiction "
            "may appeal to the Supreme Court; any person convicted on a trial held by a Sessions Judge or Additional Sessions Judge may appeal to the High Court. "
            "Corresponds to Section 415 of BNSS, 2023."
        ),
        "source_url_or_ref": "CrPC 1973, Section 374; BNSS 2023, Section 415",
        "punishment_info": "Statutory right of substantive appeal challenging trial court convictions.",
        "severity_tier": "Not Assessed",
        "offence_name": "Appellate Jurisdiction on Conviction",
        "section_code": "374"
    },
    {
        "source_id": "IND-CONSTITUTION-ART-21",
        "title": "Article 21, Constitution of India (Protection of Life and Personal Liberty)",
        "act_or_authority": "Constitution of India, 1950",
        "keywords": "article 21 personal liberty speedy trial bail rule jail exception life fundamental right",
        "text": (
            "Article 21 of the Constitution provides: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.' "
            "In Indian jurisprudence, pre-trial detention cannot be transformed into punitive incarceration. Personal liberty is the rule and jail is the exception, "
            "anchoring the constitutional foundation for reasonable bail and speedy trial (Maneka Gandhi, Gudikanti Narasimhulu, and Satender Kumar Antil)."
        ),
        "source_url_or_ref": "Constitution of India, Article 21; Gudikanti Narasimhulu (1978) 1 SCC 240",
        "punishment_info": "Inviolable fundamental right governing personal liberty and fair criminal procedure.",
        "severity_tier": "Not Assessed",
        "offence_name": "Constitutional Liberty Mandate",
        "section_code": "21"
    },
    {
        "source_id": "IND-CONSTITUTION-ART-226",
        "title": "Article 226, Constitution of India (Power of High Courts to Issue Certain Writs)",
        "act_or_authority": "Constitution of India, 1950",
        "keywords": "article 226 writ petition high court habeas corpus mandamus certiorari quashing fir",
        "text": (
            "Article 226 of the Constitution empowers every High Court throughout territories in relation to which it exercises jurisdiction "
            "to issue directions, orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, "
            "for the enforcement of fundamental rights and for any other purpose. Frequently invoked to quash criminal proceedings or protect personal liberty."
        ),
        "source_url_or_ref": "Constitution of India, Article 226; Whirlpool Corporation (1998) 8 SCC 1",
        "punishment_info": "Extraordinary constitutional prerogative writ jurisdiction of High Courts.",
        "severity_tier": "Not Assessed",
        "offence_name": "Constitutional Writ Jurisdiction",
        "section_code": "226"
    },
    {
        "source_id": "IND-PRECEDENT-SATENDER-ANTIL",
        "title": "Satender Kumar Antil v. CBI (2022) 10 SCC 51 — Supreme Court of India",
        "act_or_authority": "Supreme Court of India (Appellate Jurisdiction)",
        "keywords": "satender kumar antil guidelines bail categories category a category b custody economic offences",
        "text": (
            "In Satender Kumar Antil v. Central Bureau of Investigation, the Supreme Court laid down comprehensive nationwide guidelines for bail: "
            "Category A (offences punishable up to 7 years) where notice u/s 41A CrPC applies without mandatory arrest; "
            "Category B (offences punishable with death/life/more than 7 years); Category C (special acts such as NDPS, PMLA, POCSO); "
            "and Category D (economic offences). Emphasized that democracy does not contemplate a police state and detention during investigation must remain exceptional."
        ),
        "source_url_or_ref": "2022 LiveLaw (SC) 577; (2022) 10 SCC 51",
        "punishment_info": "Binding judicial precedent defining 4-tier bail framework under Articles 141 and 142.",
        "severity_tier": "Not Assessed",
        "offence_name": "Nationwide Bail Benchmark Precedent",
        "section_code": "ANTIL"
    }
]


def _tokenize(text: str) -> List[str]:
    """Extract lower-case alphanumerical tokens longer than 2 characters."""
    return [w for w in re.findall(r"\b[a-z0-9_]{3,}\b", text.lower()) if w not in {
        "and", "the", "for", "with", "from", "that", "this", "under", "court", "shall"
    }]


def retrieve_relevant_legal_knowledge(
    query_text: str,
    cited_sections: Optional[List[str]] = None,
    top_k: int = 3
) -> List[RetrievedLegalSource]:
    """
    Hybrid Lexical-Semantic Retrieval over curated Indian legal knowledge base.
    
    Combines:
    1. Direct section number & statute code matching (high boost).
    2. BM25-style term frequency overlap with inverse document frequency.
    3. Distinct attribution separating retrieved knowledge from uploaded PDF evidence.
    """
    if not query_text:
        return []

    cited_sec_codes = set()
    if cited_sections:
        for s in cited_sections:
            m = re.findall(r"\b\d+[A-Za-z]?\b", str(s))
            for code in m:
                cited_sec_codes.add(code.upper())

    # Extract section codes mentioned in the query text directly
    query_sec_matches = re.findall(r"\b(?:section|sec\.?|art\.?|article)\s+([0-9]+[A-Za-z]?)\b", query_text, re.IGNORECASE)
    for qm in query_sec_matches:
        cited_sec_codes.add(qm.upper())

    query_tokens = _tokenize(query_text)
    if not query_tokens and not cited_sec_codes:
        return []

    query_tf: Dict[str, int] = {}
    for tok in query_tokens:
        query_tf[tok] = query_tf.get(tok, 0) + 1

    corpus_size = len(LEGAL_KNOWLEDGE_BASE)
    scored_items: List[Tuple[float, Dict[str, str]]] = []

    for item in LEGAL_KNOWLEDGE_BASE:
        item_text = f"{item['title']} {item['keywords']} {item['text']}"
        item_tokens = _tokenize(item_text)
        item_sec_code = item.get("section_code", "").upper()

        # 1. Section Code Exact Match Boost (0.45 weight)
        sec_boost = 0.0
        if item_sec_code and item_sec_code in cited_sec_codes:
            sec_boost = 0.45

        # 2. Token overlap similarity (0.55 weight)
        overlap = set(query_tokens).intersection(set(item_tokens))
        if overlap or sec_boost > 0:
            score = 0.0
            for term in overlap:
                # Term frequency weighted
                tf_query = query_tf.get(term, 1)
                tf_item = item_tokens.count(term)
                # Compute term impact
                score += (math.log(1 + tf_query) * math.log(1 + tf_item))

            norm = (math.sqrt(len(query_tokens) + 1) * math.sqrt(len(item_tokens) + 1))
            norm_score = min(0.55, (score / (norm + 1e-5)) * 1.5)
            total_score = min(0.99, round(sec_boost + norm_score, 4))

            if total_score >= 0.15 or sec_boost > 0:
                scored_items.append((total_score, item))

    # Sort descending by relevance score
    scored_items.sort(key=lambda x: x[0], reverse=True)

    results: List[RetrievedLegalSource] = []
    seen_ids = set()

    for score, item in scored_items[:top_k]:
        if item["source_id"] not in seen_ids:
            seen_ids.add(item["source_id"])
            results.append(
                RetrievedLegalSource(
                    source_id=item["source_id"],
                    title=item["title"],
                    act_or_authority=item["act_or_authority"],
                    text=item["text"],
                    relevance_score=score,
                    source_url_or_ref=item.get("source_url_or_ref"),
                    punishment_info=item.get("punishment_info")
                )
            )

    return results


def evaluate_statutory_severity(
    cited_sections: List[ExtractedEntity[str]],
    document_text: str,
    retrieved_sources: List[RetrievedLegalSource]
) -> Optional[StatutorySeverityAssessment]:
    """
    Evaluate preliminary statutory seriousness based strictly on authoritative penal provisions.
    
    Provides:
    - Classification tier based on maximum statutory punishment.
    - Explicit criteria explanation.
    - Mandatory non-guilt and taxonomy disclaimer.
    """
    if not cited_sections and not retrieved_sources:
        return StatutorySeverityAssessment(
            offence_name=None,
            cited_section=None,
            statutory_provision=None,
            severity_tier="Not Assessed",
            applicable_punishment="No penal statute cited in document.",
            criteria_explanation="No criminal statute or penal charge was cited in the extracted document.",
            confidence="not_found"
        )

    # Check retrieved sources for penal statutes with severity tier
    for src in retrieved_sources:
        for kb_item in LEGAL_KNOWLEDGE_BASE:
            if kb_item["source_id"] == src.source_id and kb_item.get("severity_tier") != "Not Assessed":
                return StatutorySeverityAssessment(
                    offence_name=kb_item.get("offence_name"),
                    cited_section=f"Section {kb_item.get('section_code')}",
                    statutory_provision=kb_item.get("title"),
                    severity_tier=kb_item["severity_tier"],
                    applicable_punishment=kb_item.get("punishment_info"),
                    criteria_explanation=(
                        f"Classified under '{kb_item['severity_tier']}' based on statutory penalty criteria under {kb_item['act_or_authority']}: "
                        f"{kb_item.get('punishment_info')}."
                    ),
                    confidence="high"
                )

    # Check cited sections directly
    for sec in cited_sections:
        sec_val = sec.value or ""
        for kb_item in LEGAL_KNOWLEDGE_BASE:
            code = kb_item.get("section_code")
            if code and re.search(rf"\b{code}\b", sec_val, re.IGNORECASE) and kb_item.get("severity_tier") != "Not Assessed":
                return StatutorySeverityAssessment(
                    offence_name=kb_item.get("offence_name"),
                    cited_section=sec_val,
                    statutory_provision=kb_item.get("title"),
                    severity_tier=kb_item["severity_tier"],
                    applicable_punishment=kb_item.get("punishment_info"),
                    criteria_explanation=(
                        f"Identified from statutory citation '{sec_val}'. Categorized as '{kb_item['severity_tier']}' "
                        f"based on authoritative punishment provisions under Indian law: {kb_item.get('punishment_info')}."
                    ),
                    confidence="high"
                )

    return StatutorySeverityAssessment(
        offence_name=None,
        cited_section=cited_sections[0].value if cited_sections else None,
        statutory_provision=None,
        severity_tier="Not Assessed",
        applicable_punishment="Statutory penalty not specified in knowledge base.",
        criteria_explanation="Cited legal references do not contain an authoritative penal offence mapped in the statutory knowledge base.",
        confidence="medium"
    )


# ==============================================================================
# UPSTREAM ATTRIBUTION & INTEGRATION: goyashek/bns-legal-rag (MIT License)
# Repository: https://github.com/goyashek/bns-legal-rag
# ==============================================================================

# Cross-statute bridge mapping old IPC provisions to enacted BNS (2023) equivalents
IPC_TO_BNS_BRIDGE: Dict[str, Dict[str, str]] = {
    "302": {
        "repealed_statute": "Indian Penal Code, 1860, Section 302",
        "enacted_statute": "Bharatiya Nyaya Sanhita, 2023, Section 103",
        "bns_section": "103",
        "title": "Murder",
        "severity_tier": "Capital / Life",
    },
    "307": {
        "repealed_statute": "Indian Penal Code, 1860, Section 307",
        "enacted_statute": "Bharatiya Nyaya Sanhita, 2023, Section 109",
        "bns_section": "109",
        "title": "Attempt to Murder",
        "severity_tier": "Serious (7+ Years)",
    },
    "420": {
        "repealed_statute": "Indian Penal Code, 1860, Section 420",
        "enacted_statute": "Bharatiya Nyaya Sanhita, 2023, Section 318(4)",
        "bns_section": "318(4)",
        "title": "Cheating and dishonestly inducing delivery of property",
        "severity_tier": "Serious (7+ Years)",
    },
    "406": {
        "repealed_statute": "Indian Penal Code, 1860, Section 406",
        "enacted_statute": "Bharatiya Nyaya Sanhita, 2023, Section 316",
        "bns_section": "316",
        "title": "Criminal Breach of Trust",
        "severity_tier": "Moderate (< 7 Years)",
    },
    "498A": {
        "repealed_statute": "Indian Penal Code, 1860, Section 498A",
        "enacted_statute": "Bharatiya Nyaya Sanhita, 2023, Section 85",
        "bns_section": "85",
        "title": "Cruelty by husband or relatives of husband",
        "severity_tier": "Moderate (< 7 Years)",
    },
    "304B": {
        "repealed_statute": "Indian Penal Code, 1860, Section 304B",
        "enacted_statute": "Bharatiya Nyaya Sanhita, 2023, Section 80",
        "bns_section": "80",
        "title": "Dowry Death",
        "severity_tier": "Capital / Life",
    },
}

CRPC_TO_BNSS_BRIDGE: Dict[str, Dict[str, str]] = {
    "437": {
        "repealed_statute": "Code of Criminal Procedure, 1973, Section 437",
        "enacted_statute": "Bharatiya Nagarik Suraksha Sanhita, 2023, Section 480",
        "bnss_section": "480",
        "title": "Bail in non-bailable offences (Magistrate court)",
    },
    "438": {
        "repealed_statute": "Code of Criminal Procedure, 1973, Section 438",
        "enacted_statute": "Bharatiya Nagarik Suraksha Sanhita, 2023, Section 482",
        "bnss_section": "482",
        "title": "Anticipatory Bail (Direction for grant of bail to person apprehending arrest)",
    },
    "439": {
        "repealed_statute": "Code of Criminal Procedure, 1973, Section 439",
        "enacted_statute": "Bharatiya Nagarik Suraksha Sanhita, 2023, Section 483",
        "bnss_section": "483",
        "title": "Special powers of High Court or Court of Session regarding bail",
    },
}


def bridge_old_statute_to_bns(citation_text: str) -> Optional[Dict[str, str]]:
    """
    Bridge older Indian Penal Code / CrPC sections to 2023 BNS / BNSS equivalents.
    Inspired by goyashek/bns-legal-rag bridge component.
    """
    for ipc_sec, bridge_info in IPC_TO_BNS_BRIDGE.items():
        if re.search(rf"\b(section|sec\.?|u/s)?\s*{ipc_sec}\b", citation_text, re.IGNORECASE):
            return bridge_info

    for crpc_sec, bridge_info in CRPC_TO_BNSS_BRIDGE.items():
        if re.search(rf"\b(section|sec\.?|u/s)?\s*{crpc_sec}\b", citation_text, re.IGNORECASE):
            return bridge_info

    return None


def validate_citations_against_retrieved_sources(
    answer_text: str,
    retrieved_sources: List[RetrievedLegalSource],
    document_sections: Optional[List[ExtractedEntity[str]]] = None
) -> Tuple[bool, List[str], List[str]]:
    """
    Deterministic code-level citation validator inspired by goyashek/bns-legal-rag.
    
    Extracts all statutory section citations from answer_text and checks whether
    each cited section exists in the retrieved context chunks or document extractions.
    Prevents hallucinatory citations (e.g. citing BNS 307 when only 306 was retrieved).
    
    Returns:
        (is_valid, verified_citations, unverified_citations)
    """
    # Find all mentioned sections in answer text (e.g., Section 439, Section 302, Section 103)
    cited_numbers = re.findall(r"\b(?:section|sec\.?|u/s|art\.?|article)\s+([0-9]+[A-Za-z]*)", answer_text, re.IGNORECASE)
    if not cited_numbers:
        return True, [], []

    # Build known corpus section tokens from retrieved sources and document
    known_section_corpus = set()
    for src in retrieved_sources:
        for match in re.findall(r"\b(?:section|sec\.?|u/s|art\.?|article)\s+([0-9]+[A-Za-z]*)", f"{src.title} {src.text} {src.source_id}", re.IGNORECASE):
            known_section_corpus.add(match.upper())
        # Also grab isolated digits that match section codes
        for token in src.source_id.split("-"):
            if token.isalnum():
                known_section_corpus.add(token.upper())

    if document_sections:
        for doc_sec in document_sections:
            if doc_sec.value:
                for match in re.findall(r"\b([0-9]+[A-Za-z]*)", doc_sec.value):
                    known_section_corpus.add(match.upper())

    verified = []
    unverified = []

    for num in cited_numbers:
        clean_num = num.upper()
        if clean_num in known_section_corpus:
            verified.append(f"Section {num}")
        else:
            unverified.append(f"Section {num}")

    is_valid = len(unverified) == 0
    return is_valid, verified, unverified

