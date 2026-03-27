PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE vocabulary_words (
  term TEXT PRIMARY KEY,
  cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1'))
);
COMMIT;
