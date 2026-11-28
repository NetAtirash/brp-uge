# RC12 occupation review — Phase 2 engineering audit
Basis: actual uploaded RC12 occupation overlay and skills JSON, 44 occupations, 138 groups, 24 review records, 22 expected after stale token correction. Source-level inspection plus engine unit tests on representative synthetic cases; not a live 44-occupation test. No actual book source records bundled in the system.
## All 24 review records
| Review group | Classification / disposition |
|---|---|
| book-artist-04 | Non-native guard; excludes Own and programming-language entries; GM must enable actual other language. |
| book-assassin-01 | Unresolved Electronics token; keep blocked; content evidence required. |
| book-clerk-03 | Distinct other Knowledge; global group matching excludes fixed/already-selected keys. |
| book-computer-tech-03 | Programming-language guard; typed GM classification or explicit source allowlist; no Own. |
| book-computer-tech-08 | Accounting exact option present, stale unresolved token; content must remove verified stale token. |
| book-doctor-01 | Non-native guard. |
| book-entertainer-02 | Two distinct non-native languages required. |
| book-explorer-01 | Non-native guard; separate semantic exact issues in other group. |
| book-herder-01 | Knots suggestion is advisory; do not enforce as mandatory. |
| book-lawyer-02 | Distinct other Knowledge. |
| book-merchant-03 | Two other skills; distinctness enforced, campaign approval available if appropriate. |
| book-noble-03 | Non-native guard. |
| book-noble-04 | Hobbies/interests, three distinct; source broad list, campaign approval available. |
| book-occultist-04 | Non-native guard. |
| book-occultist-06 | Two distinct appropriate skills; examples advisory; source broad list, campaign approval required when content marks it. |
| book-politician-02 | Three distinct appropriate skills; examples advisory; source broad list, campaign approval required when content marks it. |
| book-scholar-01 | Non-native guard. |
| book-slave-02 | Non-native guard. |
| book-slave-03 | Other occupational specialty; distinctness enforced; broad source list needs contextual content review. |
| book-spy-01 | Psychology exact option present, stale unresolved token; content must remove verified stale token. |
| book-student-02 | Eight distinct courses, examples advisory; source broad list, campaign approval available. |
| book-teacher-02 | Five distinct fields, examples advisory; source broad list, campaign approval available. |
| book-wizard-03 | Two other distinct Knowledge fields. |
| book-wizard-04 | Non-native guard. |

Guard counts overlap: non-native 9, excludeAlreadySelected 10, programming language 1, suggested 4, suggestions 1, unresolved token rows 3. No typed era guard or era field in RC12 skill data. Seven broad 56-option lists occur in Merchant, Noble, Occultist, Politician, Slave, Student and Teacher; the source author must establish the intended scope and use campaign approvals where needed. The GM UI and engine can enforce the resulting typed constraints, but do not reinterpret RC12 book clauses.
## Deferred decisions
Pharmacy: source naming ambiguity; no automatic alias to Pharmacology. Requires source evidence and owner approval.
Weapons: RC12 has 11 empty skillRef values (5 Hand, 1 Grenade, 5 Other); no guessed mappings.
Modern Literacy: LANGUAGE_BASE is base only. Linked total policy, allocation, advancement and treatment of existing points require separate approval. No changes made.
## Test limitations
GitHub Actions verifies synthetic positive/negative cases, regression and package integrity. The working container cannot resolve github.com to clone the engine, so actual RC12 content inspection is static, not combined engine execution of every template. All live v14 QA and RC13 compatibility remain release gates. Stable/main/testing channel unchanged.
