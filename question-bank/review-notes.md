# Review notes: question-bank.json

70 questions, 14 per topic. The validator reports 0 errors and 0 warnings. Regenerate with `node question-bank/build-question-bank.mjs`.

Python snippets were run to confirm their outputs (6, 4, "1 8", [1, 2], 8). The LRU page-fault count (6) was simulated in Python.

## Assumptions
- Code questions use Python 3. The default-argument question assumes standard CPython behavior.
- The do-while question says "in languages that provide it".
- The OS deadlock question asks for the one thing that is NOT a necessary condition, using the textbook four conditions.

## Least sure about (check first)
| Topic | Question | Why |
|---|---|---|
| Databases and SQL | `WHERE x <> 2` with NULL (HARD) | Correct under standard three-valued logic. The SQL dialect should not change it. |
| Databases and SQL | Alias in WHERE (HARD) | Fails in standard SQL and in common engines. A few engines allow aliases in WHERE. |
| Databases and SQL | Second normal form | Assumes the usual textbook definition of partial dependency. |
| Computer Networks | /26 usable hosts | The answer 62 assumes network and broadcast addresses are reserved. Special cases such as /31 are not involved. |
| Computer Networks | ARP gateway question | The simplified model assumes the ARP cache is empty and the destination is off-subnet. |
| Computer Networks | HTTPS multi-select | "Hides server IP" is false, but some students may argue about proxies or CDNs. |
| Operating Systems | Starvation multi-select | Depends on the "without aging" and "steady stream" wording. |
| Operating Systems | Race condition question | The correct option says "can be less than 2000". Languages with atomic increments would behave differently. |
| Operating Systems | Paging avoids external fragmentation | True, but paging can still have internal fragmentation. |
| Discrete Mathematics | Equivalence relation R | Verified by hand: reflexive, symmetric, transitive. |

## Human checks to do first
1. Answer the 20 HARD questions without the key.
2. Re-check calculations: the 12 MB transfer (4 s), the round-robin finish (7), C(7,3) = 35 and the pigeonhole answer (25).
3. Read the 10 WRITTEN rubrics and check the criteria are gradable by a human.
4. Check the MCQ_MULTI questions for independent true/false options.

## Planted misconception distractors
- Mutable default argument gives `[1, 2]`, not `[2]`.
- `WHERE x <> 2` skips NULL rows.
- HAVING vs WHERE.
- LEFT JOIN vs INNER JOIN row count.
- Round robin finish time of P2 vs P1.
- LRU vs FIFO page faults (6 vs 7).
- TCP is not message-based.
- ARP for the gateway, not the destination.
