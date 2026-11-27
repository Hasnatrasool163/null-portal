// Builds question-bank.json from compact definitions. Run: node question-bank/build-question-bank.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const qs = [];
let sPos = 0, mPos = 0;
const MARKS = { EASY: 1, MEDIUM: 2, HARD: 3 };

// Single answer: correct option is placed at a rotating position A-D.
function S(topic, difficulty, body, correct, wrong, explanation) {
  const pos = sPos++ % 4;
  const opts = [...wrong];
  opts.splice(pos, 0, correct);
  qs.push({
    topic, difficulty, type: "MCQ_SINGLE", marks: MARKS[difficulty], body,
    options: opts.map((b, i) => ({ body: b, isCorrect: i === pos })), explanation,
  });
}
// Multi answer: correct + wrong options rotated deterministically.
function M(topic, difficulty, body, correct, wrong, explanation) {
  const all = [...correct.map((b) => ({ body: b, isCorrect: true })), ...wrong.map((b) => ({ body: b, isCorrect: false }))];
  const r = (mPos++ * 2 + 1) % all.length;
  const opts = [...all.slice(r), ...all.slice(0, r)];
  qs.push({ topic, difficulty, type: "MCQ_MULTI", marks: difficulty === "HARD" ? 3 : 2, body, options: opts, explanation });
}
function W(topic, difficulty, body, modelAnswer, rubric, explanation) {
  qs.push({
    topic, difficulty, type: "WRITTEN", marks: difficulty === "HARD" ? 6 : 4, body, modelAnswer,
    rubric: rubric.map(([criterion, marks]) => ({ criterion, marks })), explanation,
  });
}

// ---------------------------------------------------------------- Programming Fundamentals
const PF = "Programming Fundamentals";
S(PF, "EASY", "Which data structure removes elements in last-in, first-out (LIFO) order?", "Stack", ["Queue", "Array", "Hash table"],
  "A stack removes the most recently added element first. A queue is first-in, first-out, which is the usual confusion.");
S(PF, "EASY", "In Python, what is the value of `7 // 2`?", "3", ["4", "3.5", "2"],
  "The `//` operator is floor division, so 7 // 2 is 3. 3.5 is the result of normal division `7 / 2`, and 4 would come from rounding up.");
S(PF, "EASY", "In languages that provide it, which loop is guaranteed to run its body at least once?", "do-while loop", ["while loop", "for loop", "for-each loop"],
  "A do-while loop checks its condition after running the body. The other loops check first, so they can run zero times.");
S(PF, "MEDIUM", "What does this Python code print?\n```\ntotal = 0\nfor i in range(1, 5):\n    if i % 2 == 0:\n        total += i\nprint(total)\n```", "6", ["10", "4", "2"],
  "range(1, 5) gives 1, 2, 3, 4 and only the even values 2 and 4 are added, so total is 6. 10 adds every value, and 4 is the sum of the odd values.");
S(PF, "MEDIUM", "What is the time complexity of binary search on a sorted array of n elements?", "O(log n)", ["O(n)", "O(n log n)", "O(1)"],
  "Each comparison halves the remaining range, so about log2(n) steps are needed. O(n) describes linear search.");
S(PF, "MEDIUM", "What does this Python code print?\n```\na = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))\n```", "4", ["3", "7", "1"],
  "The assignment b = a does not copy the list; both names refer to the same object, so appending through b also changes a. The length is 4.");
S(PF, "MEDIUM", "What does this Python code print?\n```\nprint(10 % 3, 2 ** 3)\n```", "1 8", ["3 6", "1 6", "3 8"],
  "10 % 3 is the remainder 1, and 2 ** 3 is 2 raised to the power 3, which is 8. The other options mix up remainder with quotient or power with multiplication.");
S(PF, "HARD", "What does this Python code print?\n```\ndef add_item(item, items=[]):\n    items.append(item)\n    return items\nadd_item(1)\nprint(add_item(2))\n```", "[1, 2]", ["[2]", "[1]", "An error is raised"],
  "The default list is created once when the function is defined and reused by every call that omits the argument, so the second call sees the item from the first. Many learners expect a fresh list each call and answer [2].");
S(PF, "HARD", "What does this Python code print?\n```\ndef f(n):\n    if n <= 1:\n        return 1\n    return f(n - 1) + f(n - 2)\nprint(f(5))\n```", "8", ["5", "13", "15"],
  "f(1)=1, f(2)=2, f(3)=3, f(4)=5, f(5)=8. 5 is the value of f(4), and 13 is the value of f(6).");
M(PF, "EASY", "Which of the following are loop constructs found in many programming languages? Select all that apply.",
  ["while loop", "for loop", "do-while loop"], ["if statement", "switch statement"],
  "while, for and do-while repeat a block of code. if and switch choose between branches and do not repeat anything.");
M(PF, "MEDIUM", "Which statements about Python lists are true? Select all that apply.",
  ["A list can hold values of different types", "A list can be changed after it is created", "The first element has index 0"], ["A list has a fixed length once it is created"],
  "Lists are mutable, can mix types, grow and shrink, and use zero-based indexing. The fixed-length claim describes a tuple-like fixed array, not a Python list.");
M(PF, "HARD", "Which statements about recursion are true? Select all that apply.",
  ["A recursive function needs a reachable base case to stop", "Any recursive algorithm can be rewritten with a loop and an explicit stack", "Very deep recursion can exhaust the call stack"],
  ["Recursion is always faster than an equivalent loop", "All recursive calls share a single set of local variables"],
  "Each call has its own frame with its own locals, and function-call overhead usually makes recursion no faster than a loop. The three true statements are standard facts about termination, equivalence and stack limits.");
W(PF, "MEDIUM", "Explain the difference between a compiled language and an interpreted language, and give one advantage of each approach.",
  "A compiled language is translated ahead of time into machine code (or similar) that the computer runs directly, which usually gives faster execution. An interpreted language is read and executed by an interpreter at run time, which makes it easier to test code quickly and run it on different platforms.",
  [["Correctly describes compilation as translating the program before it runs", 1], ["Correctly describes interpretation as executing the program through an interpreter at run time", 1], ["Gives one valid advantage for each approach", 1.5], ["Clear, concise explanation", 0.5]],
  "Tests whether the student can separate when translation happens from the speed and portability consequences.");
W(PF, "HARD", "Explain what a stack overflow caused by recursion is, why it happens, and describe two ways to avoid it.",
  "Each function call adds a frame with its parameters and local variables to the call stack. A stack overflow happens when recursion goes so deep that the stack limit is exceeded, for example when the base case is missing or can never be reached. It can be avoided by making sure every path reaches a correct base case, or by rewriting the algorithm iteratively or reducing the depth of recursion.",
  [["Explains that each call adds a frame to the call stack", 2], ["Explains that overflow happens when depth exceeds the limit, such as a missing or unreachable base case", 1.5], ["Gives a first valid way to avoid it", 1], ["Gives a second valid way to avoid it", 1], ["Clear, concise explanation", 0.5]],
  "A strong answer links the call stack mechanism to the failure and gives practical remedies.");

// ---------------------------------------------------------------- Databases and SQL
const DB = "Databases and SQL";
S(DB, "EASY", "Which SQL statement removes only the rows that match a given condition from a table?", "DELETE", ["DROP", "TRUNCATE", "ALTER"],
  "DELETE with a WHERE clause removes matching rows. DROP removes the whole table, TRUNCATE removes every row, and ALTER changes the table structure.");
S(DB, "EASY", "Which keyword removes duplicate rows from the result of a SELECT query?", "DISTINCT", ["UNIQUE", "GROUP", "ONLY"],
  "SELECT DISTINCT returns each different row once. UNIQUE is a constraint on a column, not a query keyword for the result set.");
S(DB, "EASY", "What is a foreign key?", "A column whose values must match a key in another table", ["A column that stores encrypted values", "A column that is numbered automatically", "A column that can never be empty"],
  "A foreign key links rows to another table and enforces that each value exists there. Automatic numbering and non-empty values are different features.");
S(DB, "MEDIUM", "A table `orders` has columns `customer` and `amount`. What does this query return?\n```\nSELECT customer, SUM(amount) FROM orders\nGROUP BY customer HAVING SUM(amount) > 100;\n```", "Each customer whose total amount is above 100, with that total", ["Every single order with an amount above 100", "The sum of all orders, only if it is above 100", "Customers with at least one order above 100"],
  "HAVING filters groups after aggregation, so customers are kept only when their total exceeds 100. Filtering individual orders would need WHERE amount > 100.");
S(DB, "MEDIUM", "Table A has 5 rows and table B has 3 rows. Three rows of A each match exactly one row of B, and the other two rows of A match nothing. How many rows does A LEFT JOIN B return?", "5", ["3", "8", "2"],
  "A LEFT JOIN keeps every row of A: 3 matched rows plus 2 unmatched rows padded with NULLs gives 5. An INNER JOIN would return only 3.");
S(DB, "MEDIUM", "A table `enrol(student_id, course_id, student_name, course_title)` has the composite key (student_id, course_id). The column student_name depends only on student_id. Which normal form does this violate?", "Second normal form", ["First normal form", "Third normal form", "Boyce-Codd normal form"],
  "A non-key column that depends on only part of a composite key is a partial dependency, which violates second normal form. The table can still be in first normal form because its values are atomic.");
S(DB, "MEDIUM", "A transfer debits account X and then the server crashes before account Y is credited. After restart, neither change is visible. Which ACID property guarantees this?", "Atomicity", ["Durability", "Isolation", "Consistency"],
  "Atomicity means a transaction is applied entirely or not at all. Durability is about committed changes surviving a crash, which does not apply here because the transaction never committed.");
S(DB, "HARD", "A table `t` has a column `x` with the values 1, 2, NULL, 2. How many rows does `SELECT * FROM t WHERE x <> 2` return?", "1 row", ["2 rows", "3 rows", "0 rows"],
  "Comparing NULL with 2 gives UNKNOWN, not TRUE, so the NULL row is filtered out. Only the row with x = 1 matches. Many learners expect the NULL row to count as not equal to 2.");
S(DB, "HARD", "Why does this query fail in standard SQL?\n```\nSELECT price * qty AS total FROM sales WHERE total > 100;\n```", "WHERE is evaluated before the alias in SELECT exists", ["Aliases cannot be given to arithmetic expressions", "The word total is reserved by SQL", "WHERE can only compare plain columns, never expressions"],
  "Logically, FROM and WHERE are processed before SELECT, so the alias is not yet defined. The fix is to repeat the expression in WHERE or use a subquery.");
M(DB, "EASY", "Which of the following are SQL aggregate functions? Select all that apply.",
  ["COUNT", "AVG", "MAX"], ["ORDER"],
  "COUNT, AVG and MAX each summarise many rows into one value. ORDER is part of the ORDER BY clause, not a function.");
M(DB, "MEDIUM", "Which statements about database indexes are true? Select all that apply.",
  ["They can speed up searches on the indexed column", "They can slow down inserts and updates", "They use extra storage space"], ["They make every possible query faster"],
  "Indexes trade write speed and space for faster reads on matching queries. They do not help queries that cannot use them, such as full scans of every row.");
M(DB, "HARD", "Which statements about NULL in SQL are true? Select all that apply.",
  ["The expression NULL = NULL does not evaluate to TRUE", "IS NULL is used to test for a missing value", "SUM ignores NULL values"],
  ["NULL is the same as the number zero", "NULL is the same as an empty text string"],
  "NULL means an unknown or missing value and is neither zero nor an empty string. Comparisons with NULL give UNKNOWN, so IS NULL must be used, and aggregates such as SUM skip NULLs.");
W(DB, "MEDIUM", "Explain what a primary key and a foreign key are, and how they work together to link two tables.",
  "A primary key uniquely identifies each row in a table and cannot be NULL. A foreign key is a column in another table that stores a primary key value from the first table, which links rows between the tables and prevents references to rows that do not exist. For example, an orders table can hold a customer_id that refers to the customers table.",
  [["Defines a primary key as a unique, non-null row identifier", 1], ["Defines a foreign key as a reference to a key in another table", 1], ["Explains how they link tables or enforce valid references, with an example", 1.5], ["Clear, concise explanation", 0.5]],
  "Checks that the student understands the relationship between the two kinds of key rather than reciting each definition.");
W(DB, "HARD", "Explain how a database index speeds up a query, give one trade-off of adding an index, and describe one case where an index gives little benefit.",
  "An index, usually a sorted tree structure, lets the database jump to matching rows instead of reading the whole table, so a lookup such as WHERE email = 'a@b.test' is fast. The trade-off is that every insert, update or delete must also update the index, and the index uses extra storage. An index gives little benefit on a very small table or on a column where most rows share the same value, because the database still has to read most rows.",
  [["Explains that an index avoids scanning every row, for example with a sorted or tree structure", 2], ["Gives an example of a query that benefits", 1], ["Names a valid trade-off such as slower writes or extra storage", 1.5], ["Describes a case where an index helps little, such as a tiny table or low-selectivity column", 1], ["Clear, concise explanation", 0.5]],
  "A strong answer explains the mechanism and shows awareness that indexes are not free.");

// ---------------------------------------------------------------- Computer Networks
const CN = "Computer Networks";
S(CN, "EASY", "Which protocol translates a domain name such as a website address into an IP address?", "DNS", ["DHCP", "ARP", "FTP"],
  "The Domain Name System maps names to IP addresses. DHCP hands out addresses to devices and ARP maps IP addresses to MAC addresses.");
S(CN, "EASY", "Which layer of the OSI model is mainly responsible for routing packets between different networks?", "Network layer", ["Transport layer", "Data link layer", "Session layer"],
  "The network layer (IP) chooses paths between networks. The data link layer only moves frames within one local network.");
S(CN, "EASY", "Which port number does HTTPS use by default?", "443", ["80", "22", "25"],
  "HTTPS uses port 443 by default. Port 80 is plain HTTP, port 22 is SSH and port 25 is SMTP.");
S(CN, "MEDIUM", "How many usable host addresses does an IPv4 subnet with a /26 prefix have?", "62", ["64", "126", "30"],
  "A /26 leaves 6 host bits, giving 2^6 = 64 addresses. Two are reserved for the network and broadcast addresses, so 62 are usable.");
S(CN, "MEDIUM", "A live voice call application cares more about low delay than perfect delivery. Which transport protocol suits it better?", "UDP, because it avoids retransmission delays", ["TCP, because ordered delivery keeps the audio perfect", "TCP, because it has less header overhead", "UDP, because it encrypts the voice data"],
  "UDP does not wait for retransmissions, so late packets cause a small glitch rather than a long pause. UDP has no built-in encryption, and TCP headers are larger, not smaller.");
S(CN, "MEDIUM", "A client requests a page that is missing from a web server. Which HTTP status code does the server normally return?", "404", ["403", "500", "301"],
  "404 means the resource was not found. 403 means access is forbidden, 500 is a server error and 301 is a permanent redirect.");
S(CN, "MEDIUM", "Which sequence describes the TCP three-way handshake?", "SYN, SYN-ACK, ACK", ["SYN, ACK, SYN-ACK", "ACK, SYN, SYN-ACK", "SYN-ACK, SYN, ACK"],
  "The client sends SYN, the server answers SYN-ACK, and the client finishes with ACK. Each other order sends an acknowledgement before there is anything to acknowledge.");
S(CN, "HARD", "A 12 MB file is sent over a 48 Mbps link that is only 50% utilised by this transfer. Use 1 byte = 8 bits and ignore protocol overhead. How long does the transfer take?", "4 seconds", ["2 seconds", "0.5 seconds", "8 seconds"],
  "12 MB is 96 megabits and the effective rate is 24 Mbps, so the time is 96 / 24 = 4 seconds. 2 seconds ignores the 50% utilisation, and 0.5 seconds treats the size as bits.");
S(CN, "HARD", "Host A (192.168.1.10/24) sends a packet to 192.168.2.20 and has no MAC addresses cached yet. Whose MAC address does it resolve first with ARP?", "The default gateway's", ["The destination host's", "The DNS server's", "The nearest switch's"],
  "The destination is on another network, so A sends the frame to the gateway and needs the gateway's MAC address. ARP only resolves addresses on the local network, so the destination host cannot answer.");
M(CN, "EASY", "Which of the following are application-layer protocols? Select all that apply.",
  ["HTTP", "SMTP", "DNS"], ["TCP", "IP"],
  "HTTP, SMTP and DNS are used directly by applications. TCP is a transport protocol and IP is a network protocol.");
M(CN, "MEDIUM", "Which statements about TCP are true? Select all that apply.",
  ["It is connection-oriented", "It retransmits segments that are lost"], ["It preserves message boundaries between sends", "It is always faster than UDP"],
  "TCP sets up a connection and retransmits lost data, but it delivers a continuous byte stream and adds overhead, so it is not always faster than UDP.");
M(CN, "HARD", "Which statements about HTTPS (HTTP over TLS) are true? Select all that apply.",
  ["It encrypts data while it travels over the network", "It lets the client check the server's identity with a certificate", "It uses public-key cryptography to agree on session keys"],
  ["It hides the server's IP address from observers", "It protects data stored on the server's disk"],
  "TLS protects data in transit and authenticates the server. Observers can still see destination IP addresses, and data at rest on the server is not covered by TLS.");
W(CN, "MEDIUM", "Explain the difference between a network switch and a router, and say where each is typically used.",
  "A switch connects devices inside one local network and forwards Ethernet frames using MAC addresses. A router connects different networks and forwards packets using IP addresses, for example between a home network and the internet.",
  [["Describes a switch as forwarding frames within one LAN using MAC addresses", 1], ["Describes a router as forwarding packets between networks using IP addresses", 1.5], ["Gives a sensible example of where each is used", 1], ["Clear, concise explanation", 0.5]],
  "Checks the link between device type, address type and scope of the network.");
W(CN, "HARD", "Describe how TCP detects and recovers from a lost segment, and explain why TCP also reduces its sending rate when it detects loss.",
  "TCP detects loss when an acknowledgement does not arrive before a timeout or when duplicate acknowledgements arrive, and then it retransmits the missing segment. TCP also treats loss as a sign of congestion and reduces its sending rate, which prevents senders from overloading the network and lets the load be shared fairly among connections.",
  [["Explains detection using acknowledgements, timeouts or duplicate acknowledgements", 1.5], ["States that the lost segment is retransmitted", 1], ["Identifies loss as a sign of congestion and describes rate reduction", 1.5], ["Explains the purpose: avoid overloading the network and share capacity fairly", 1.5], ["Clear, concise explanation", 0.5]],
  "A strong answer separates reliability from congestion control and connects them through the loss signal.");

// ---------------------------------------------------------------- Operating Systems
const OS = "Operating Systems";
S(OS, "EASY", "Which part of an operating system directly manages hardware resources such as the CPU and memory?", "The kernel", ["The shell", "The compiler", "The text editor"],
  "The kernel is the core that manages hardware. The shell is only a user interface to the system.");
S(OS, "EASY", "What is a process?", "A program that is being executed", ["A file that stores machine code on disk", "A hardware unit that executes instructions", "A request sent by a hardware device"],
  "A process is a running instance of a program with its own resources. The file on disk is only the program, and the CPU is the hardware unit.");
S(OS, "EASY", "Which scheduling algorithm gives each process a fixed time slice in turn?", "Round robin", ["First come, first served", "Shortest job first", "Priority scheduling"],
  "Round robin cycles through processes using a time quantum. First come, first served runs each process to completion in arrival order.");
S(OS, "MEDIUM", "Which memory management technique divides memory into fixed-size blocks, which avoids external fragmentation?", "Paging", ["Segmentation", "Contiguous allocation", "Swapping"],
  "Paging uses equal-sized pages and frames, so any free frame can be used. Segmentation uses variable-sized pieces and can suffer from external fragmentation.");
S(OS, "MEDIUM", "Which of these is NOT a necessary condition for deadlock?", "Resources can be forcibly taken from the processes holding them", ["Resources can be used by only one process at a time", "Processes hold some resources while waiting for others", "Processes wait for each other in a cycle"],
  "The four conditions are mutual exclusion, hold and wait, no preemption and circular wait. Being able to take resources away is the opposite of no preemption, so it breaks deadlock.");
S(OS, "MEDIUM", "Processes P1 (CPU burst 5) and P2 (CPU burst 3) both arrive at time 0 in that order. Round robin uses a time quantum of 2 and ignores switching time. At what time does P2 finish?", "7", ["8", "6", "5"],
  "The schedule is P1 0-2, P2 2-4, P1 4-6, P2 6-7, P1 7-8. P2 finishes at 7, while 8 is the finish time of P1.");
S(OS, "MEDIUM", "What is the key difference between a process and a thread?", "Threads of one process share its memory space, while processes have separate memory spaces", ["Threads have separate memory spaces, while processes share one", "Threads can run only on a single CPU core", "Processes cannot be scheduled by the operating system"],
  "Threads inside the same process share code, heap and open files, which makes communication cheap. Processes are isolated from each other.");
S(OS, "HARD", "A system has 3 page frames and uses LRU (least recently used) replacement. The page reference string is 7, 0, 1, 2, 0, 3, 0, 4 and the frames start empty. How many page faults occur?", "6", ["7", "5", "8"],
  "Faults occur on 7, 0, 1, 2, 3 and 4, while the two references to 0 are hits, giving 6. FIFO replacement would give 7 faults on this string, which is the tempting wrong answer.");
S(OS, "HARD", "Two threads each run `counter = counter + 1` one thousand times on a shared variable that starts at 0, with no synchronisation. What is true about the final value?", "It can be less than 2000 because the read, add and write steps can interleave", ["It is always exactly 2000 because addition is a single step", "It is always exactly 1000 because only one thread wins", "It is always 2000 on a single-core CPU"],
  "The increment is read-modify-write, so the threads can overwrite each other's updates. A single core can still switch threads between those steps, so a lost update is possible.");
M(OS, "EASY", "Which of the following are functions of an operating system? Select all that apply.",
  ["Process scheduling", "Memory management", "File management"], ["Compiling source code to a new language", "Checking spelling in documents"],
  "Scheduling, memory and file management are core operating system duties. Compiling and spell checking are done by application programs.");
M(OS, "MEDIUM", "Which statements about virtual memory are true? Select all that apply.",
  ["Each process gets its own virtual address space", "The total memory demand of programs can exceed physical RAM"], ["It makes every memory access faster than direct RAM access", "It removes the need for address translation"],
  "Virtual memory gives each process a private address space and lets the system move pages to disk. Translation is still needed, and it adds some cost rather than speed.");
M(OS, "HARD", "Which situations can lead to starvation? Select all that apply.",
  ["Priority scheduling with no aging", "Shortest job first with a steady stream of short jobs"],
  ["Round robin with a fixed time quantum", "First come, first served where every job finishes", "Priority scheduling with aging"],
  "Starvation is when a process waits indefinitely. Low-priority or long jobs can wait forever in the first two cases, while round robin, first come first served and aging all give every process a turn.");
W(OS, "MEDIUM", "Explain the difference between user mode and kernel mode and why operating systems use both.",
  "In user mode a program runs with restricted privileges and cannot directly access hardware or other programs' memory. In kernel mode the operating system can run any instruction and access all hardware. Using both protects the system, because faulty or malicious programs cannot damage it and must ask the kernel through system calls.",
  [["Describes user mode as restricted", 1], ["Describes kernel mode as having full hardware access", 1], ["Explains the protection or stability reason, e.g. through system calls", 1.5], ["Clear, concise explanation", 0.5]],
  "Checks understanding of privilege separation as the basis of operating system protection.");
W(OS, "HARD", "Define deadlock, list the four conditions that must hold for it to occur, and describe one way to prevent it.",
  "Deadlock is a state where a set of processes are each waiting for a resource held by another, so none can continue. The four conditions are mutual exclusion, hold and wait, no preemption and circular wait. It can be prevented by breaking one condition, for example by requiring all resources to be requested at once, which removes hold and wait.",
  [["Defines deadlock as processes waiting on each other indefinitely", 1.5], ["Lists the four conditions correctly (0.5 each)", 2], ["Describes a prevention method that breaks one named condition", 2], ["Clear, concise explanation", 0.5]],
  "A strong answer links the prevention method to the specific condition it eliminates.");

// ---------------------------------------------------------------- Discrete Mathematics
const DM = "Discrete Mathematics";
S(DM, "EASY", "How many subsets does the set {a, b, c} have, counting the empty set and the set itself?", "8", ["6", "9", "3"],
  "A set with n elements has 2^n subsets, so 2^3 = 8. Counting only non-empty proper subsets would give 6.");
S(DM, "EASY", "What is the truth value of the implication p → q when p is true and q is false?", "False", ["True", "Undefined", "It depends on other variables"],
  "An implication is false only when the premise is true and the conclusion is false.");
S(DM, "EASY", "What is the value of 5! (five factorial)?", "120", ["25", "60", "24"],
  "5! = 5 × 4 × 3 × 2 × 1 = 120. 24 is 4!, and 25 is 5 squared.");
S(DM, "MEDIUM", "In how many ways can a committee of 3 people be chosen from 7 people when order is irrelevant?", "35", ["210", "21", "343"],
  "The count is C(7,3) = 7! / (3! × 4!) = 35. 210 is the number of ordered selections, and 343 is 7^3.");
S(DM, "MEDIUM", "How many different 4-digit passcodes can be made from the digits 0 to 9 if digits may repeat?", "10000", ["5040", "210", "40"],
  "Each of the 4 positions has 10 choices, so 10^4 = 10000. 5040 counts codes with no repeated digits.");
S(DM, "MEDIUM", "What is the contrapositive of the statement: \"If a shape is a square, then it is a rectangle\"?", "If a shape is NOT a rectangle, then it is NOT a square", ["If a shape is a rectangle, then it is a square", "If a shape is NOT a square, then it is NOT a rectangle", "A shape is a square and it is NOT a rectangle"],
  "The contrapositive swaps and negates both parts and is logically equivalent to the original. The first option is the converse and the second is the inverse, which are not equivalent.");
S(DM, "MEDIUM", "A simple graph has 6 vertices and the degrees of its vertices add up to 14. How many edges does it have?", "7", ["14", "28", "6"],
  "By the handshake lemma the sum of degrees is twice the number of edges, so there are 14 / 2 = 7 edges.");
S(DM, "HARD", "Let R = {(1,1), (2,2), (3,3), (1,2), (2,1)} be a relation on the set {1, 2, 3}. Which statement is correct?", "R is an equivalence relation", ["R is reflexive and symmetric but not transitive", "R is reflexive and transitive but not symmetric", "R is symmetric and transitive but not reflexive"],
  "R contains every pair (x,x), contains (2,1) for every (1,2), and every chain such as (1,2),(2,1) gives (1,1), which is present. It is reflexive, symmetric and transitive.");
S(DM, "HARD", "What is the smallest number of people that guarantees at least 3 of them were born in the same calendar month?", "25", ["13", "24", "37"],
  "By the generalised pigeonhole principle, 12 months with at most 2 people each hold 24 people, so the 25th person forces a third in one month. 13 only guarantees 2 in the same month.");
M(DM, "EASY", "Which of the following numbers are prime? Select all that apply.",
  ["2", "11", "17"], ["21", "27"],
  "2, 11 and 17 have no divisors other than 1 and themselves. 21 = 3 × 7 and 27 = 3 × 9.");
M(DM, "MEDIUM", "Let A = {1, 2, 3} and B = {3, 4}. Which statements are true? Select all that apply.",
  ["A ∪ B has 4 elements", "A × B has 6 ordered pairs"], ["A ∩ B is the empty set", "A \\ B has 3 elements"],
  "A ∪ B = {1, 2, 3, 4}, and |A × B| = 3 × 2 = 6. A ∩ B = {3} and A \\ B = {1, 2}, so the last two statements are false.");
M(DM, "HARD", "Which of the following statements are tautologies? Select all that apply.",
  ["p OR (NOT p)", "(p AND q) → p", "NOT (p OR q) is equivalent to (NOT p) AND (NOT q)"], ["p → (p AND q)"],
  "The first is the law of the excluded middle, the second holds because a conjunction implies each part, and the third is De Morgan's law. The last fails when p is true and q is false.");
W(DM, "MEDIUM", "Show that the sum of two even integers is always even.",
  "Let the two even integers be 2a and 2b for some integers a and b. Their sum is 2a + 2b = 2(a + b). Since a + b is an integer, the sum is 2 times an integer, so it is even.",
  [["Writes both numbers in the form 2a and 2b with integers a and b", 1], ["Correctly adds them and factors out 2", 1.5], ["States the conclusion that the sum is a multiple of 2", 1], ["Clear, concise explanation", 0.5]],
  "Tests the ability to turn a definition into a short direct proof.");
W(DM, "HARD", "Use mathematical induction to prove that 1 + 2 + ... + n = n(n + 1) / 2 for every integer n ≥ 1.",
  "Base case: for n = 1 the left side is 1 and the right side is 1(2)/2 = 1, so it holds. Inductive step: assume 1 + ... + k = k(k + 1)/2. Then 1 + ... + k + (k + 1) = k(k + 1)/2 + (k + 1) = (k + 1)(k + 2)/2, which is the formula for n = k + 1. By induction the formula holds for all n ≥ 1.",
  [["Verifies the base case n = 1", 1], ["States the inductive hypothesis for n = k", 1], ["Correctly performs the algebra for the step from k to k + 1", 2.5], ["Concludes the result by the principle of induction", 1], ["Clear, concise explanation", 0.5]],
  "A strong answer shows all three parts of an induction proof: base case, hypothesis and step.");

fs.writeFileSync(path.join(dir, "question-bank.json"), JSON.stringify({ questions: qs }, null, 2) + "\n");
console.log(`Wrote ${qs.length} questions`);
