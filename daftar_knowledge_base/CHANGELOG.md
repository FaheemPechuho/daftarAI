# Changelog

All notable changes to the Daftar knowledge base should be documented in this file.

## [0.4.0] - 2026-04-03 - MVP COMPLETE: All Mission-Critical Documents

### Added
- **next_steps.md** - Step-by-step action plans for all 4 structures (Sole Prop, SMC, Pvt Ltd, Partnership)
  - Week-by-week timelines for each structure
  - Checklist format for founder implementation
  - Calendar reminders and key compliance deadlines
  
- **regulatory_bodies.md** - Guide to Pakistan's regulatory authorities
  - SECP (company registration)
  - FBR (tax registration + filing)
  - Registrar of Firms (partnership registration)
  - SBP (banking oversight)
  - Authority decision tree for founders
  
- **employee_tax_and_payroll.md** - Employer obligations when hiring employees
  - Withholding tax calculation and rates
  - EOBI (retirement fund) contributions
  - Monthly payroll process
  - Quarterly and annual compliance filings
  - Common payroll mistakes and fixes
  
- **recovery_and_appeals.md** - Troubleshooting guide for rejections, disputes, audits
  - SECP registration rejection recovery steps
  - FBR audit response procedures
  - NTN and STRN dispute resolution
  - Partnership dispute handling
  - Emergency contacts and legal escalation
  
- **Templates Folder** - Ready-to-use sample documents
  - `MOA_sample.md` - Memorandum of Association template (SMC/Pvt Ltd)
  - `AOA_sample.md` - Articles of Association template (SMC/Pvt Ltd)
  - `Partnership_Deed_sample.md` - Partnership deed template with all clauses
  - `Invoice_template.md` - Professional invoice template with tax compliance notes

### Updated
- **kb_index.json** - Upgraded to v0.4.0
  - Total documents: 20 (was 15)
  - Added templates folder indexing
  - Enhanced metadata for RAG routing
  - Added "templates" as new topic category
  
- **CHANGELOG.md** - This file, marking MVP completion

### Verified
- All 20 documents are complete and founder-ready
- Source citations complete: 10 authorities, 22+ claim mappings verified
- Test queries complete: 20 comprehensive Q&A pairs with routing
- Metadata complete: RAG-optimized indexing for all documents
- Templates complete: 4 essential document templates ready for use

### KB Status: PRODUCTION READY
✅ All core SECP & FBR documents complete
✅ All supporting guidance documents complete  
✅ All troubleshooting & recovery documents complete
✅ All templates created and samples provided
✅ Complete citation mapping (10 authorities)
✅ Comprehensive test query suite (20 queries)
✅ RAG-optimized metadata indexing (v0.4.0)
✅ Single source of truth (daftar_knowledge_base/)

---

## [0.3.0] - 2026-04-03 - Mission-Critical Metadata Enhancement

### Added
- **source_index.md** - Completed citation mapping
  - 10 authoritative sources (SRC-001 to SRC-010)
  - 22+ founder-relevant claims mapped and verified
  - Verification schedule for ongoing maintenance
  - All claims marked as ✅ Verified
  
- **Enhanced test_queries.csv** - Complete test query framework
  - 20 comprehensive test queries (Q001-Q020)
  - Proper routing to intended documents
  - Priority distribution (12 high, 8 medium)
  - Success criteria for RAG validation
  - Coverage of all major use cases

### Updated
- **kb_index.json** (v0.2 → v0.3)
  - Enhanced all 15 documents with:
    - Audience tags (founder types)
    - Semantic tags (business model, structure type)
    - Retrieval keywords (natural language variations)
    - Related documents (cross-references)
  - Supports smart RAG document routing

### Important
- All critical blockers resolved
- KB now RAG-deployment ready
- Citation tracking fully functional

---

## [0.2.0] - 2026-04-03 - MVP Cleanup & Enhancement

### Added
- **FAQ.md** - 20 frequently asked questions by Pakistani founders
- **GLOSSARY.md** - Comprehensive legal and tax term definitions
- **compliance_checklist.md** - Annual compliance requirements by business structure
- **quick_reference.md** - One-page summary guides for each structure
- **common_mistakes.md** - What to avoid (by structure and tax issues)
- **incorporation_timeline.md** - Realistic timelines with blockers and late scenarios

### Removed (DRY Principle - Eliminated Redundancy)
- Deleted `/federal/` folder (was duplicating knowledge base structure)
- Deleted root-level `/citations/`, `/comparisons/`, `/tests/` (all consolidated into daftar_knowledge_base/)
- Cleaned up single-source-of-truth violation

### Updated
- **kb_index.json** - Now includes all 15 documents with type categories
- All SECP/FBR documents enhanced with trusted source links and practical founder language

### Changed
- Moved all operational files into `/daftar_knowledge_base/` as single source of truth
- Version bumped to 0.2.0 (stable MVP ready)

---

## [0.1.0] - 2026-04-02 - Initial KB Structure

### Added
- Initial knowledge base structure created.
- Added SECP, FBR, comparisons, citations, metadata, and tests directories.
- Created 7 core documents:
  - SECP: private_limited.md, single_member_company.md, sole_proprietorship.md, partnership.md
  - FBR: ntn_registration.md, strn_registration.md, freelancer_tax.md
- Added citation index with 19 source mappings
- Added test queries (20 Q&A pairs)
- Added metadata: kb_index.json, chunking_config.json
