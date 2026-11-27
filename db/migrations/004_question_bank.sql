-- S1: per-examiner topics and question bank.

-- topics: UNIQUE(owner_id, lower(name)) stops duplicates like "Math" / "math" for one examiner,
-- and lets bulk import find-or-create a topic race-free via ON CONFLICT.
CREATE TABLE topics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX topics_owner_name_idx ON topics (owner_id, lower(name));

-- questions: private to the owner. archived = soft delete so exams that used a question keep working.
-- CHECKs: closed vocabularies for type/difficulty, positive marks.
CREATE TABLE questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id      uuid        NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
  type          text        NOT NULL CHECK (type IN ('MCQ_SINGLE', 'MCQ_MULTI', 'WRITTEN')),
  difficulty    text        NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  body          text        NOT NULL CHECK (char_length(body) BETWEEN 5 AND 4000),
  default_marks numeric(6,2) NOT NULL CHECK (default_marks > 0),
  archived      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- Listing is always "my questions, newest first, optionally by topic".
CREATE INDEX questions_owner_idx ON questions (owner_id, archived, created_at DESC);
CREATE INDEX questions_topic_idx ON questions (topic_id);

-- question_options: position keeps the authored order; UNIQUE stops two options sharing a slot.
-- The cross-row rules (single = exactly 1 correct, multi >= 1, >= 2 options, written = none)
-- are enforced in question.service inside the same transaction as the write.
CREATE TABLE question_options (
  id          serial PRIMARY KEY,
  question_id uuid    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  body        text    NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  is_correct  boolean NOT NULL DEFAULT false,
  position    integer NOT NULL CHECK (position >= 0),
  UNIQUE (question_id, position)
);
