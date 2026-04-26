# Daftar Knowledge Base

This folder contains the curated legal knowledge base used by Daftar for citation-backed responses for Pakistani founders.

## Scope
- SECP registration and business structures
- FBR registrations (NTN/STRN) and founder-relevant tax guidance
- Side-by-side structure comparisons
- Citation/source management for traceable answers

## Folder Layout
- `secp/`: SECP registration and entity-type guides
- `fbr/`: FBR registrations and tax topics
- `comparisons/`: Comparison documents for decision support
- `citations/`: Source index and citation mapping
- `metadata/`: KB indexing and chunking configuration
- `tests/`: Validation queries for retrieval and answer quality

## Authoring Guidelines
- Keep language clear and practical for Pakistani founders.
- Include source references for every material legal claim.
- Add effective dates where applicable.
- Avoid legal advice language; present process guidance and references.

## Update Process
1. Update relevant markdown files.
2. Record major changes in `CHANGELOG.md`.
3. Update `citations/source_index.md` when adding or changing sources.
4. Regenerate metadata/indexing artifacts if document structure changes.
5. Run test queries in `tests/test_queries.csv` against the assistant.
