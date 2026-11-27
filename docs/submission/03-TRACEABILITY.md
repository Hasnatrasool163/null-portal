# 03. Mapping design to code, and gaps

## 1. Requirement -> design -> code
| Req ID | Requirement | Design element | Code (file / function) | Verified how |
|---|---|---|---|---|
| R1 | | | `src/...` | manual test / script |
| R2 | | | | |

## 2. Validation map
| Rule | Client | Server | Database |
|---|---|---|---|
| Title 3-100 chars | `shared/schemas/item.ts` via form | same schema in route | CHECK constraint |
| Unique title per owner | inline 409 error | `item.service.ts` | (add UNIQUE index if needed) |

## 3. Access control map
| Role | Pages | API | Enforced in |
|---|---|---|---|

## 4. Gaps: where code differs from design (be honest, judges score this)
| Gap | Why | Impact | What we would do next |
|---|---|---|---|

## 5. Test evidence
List what you tested at the end (happy paths, validation failures, forbidden access, refresh persistence, mobile width).
