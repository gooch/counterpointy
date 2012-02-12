CREATE TABLE Users (
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  fullname      VARCHAR(255) CHARACTER SET utf8 NOT NULL,
  email         VARCHAR(255) CHARACTER SET ascii NOT NULL,
  password_hash VARCHAR(60) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO Users SET username = "", fullname = "Anonymous User";


CREATE TABLE Points (
  hash          VARCHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  text          TEXT CHARACTER SET utf8 NOT NULL,
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE FULLTEXT INDEX Points_fulltext ON Points(text);
CREATE INDEX Points_text ON Points(text(20));
CREATE INDEX Points_create_time ON Points(create_time);


CREATE TABLE PStances (
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  point_hash    VARCHAR(64) CHARACTER SET ascii NOT NULL,
  stance        TINYINT NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  PRIMARY KEY (username, point_hash),
  FOREIGN KEY (username) REFERENCES Users (username),
  FOREIGN KEY (point_hash) REFERENCES Points (hash)
);


CREATE TABLE Edits (
  old_hash      VARCHAR(64) CHARACTER SET ascii NOT NULL,
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  new_hash      VARCHAR(64) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  PRIMARY KEY (old_hash, username),
  FOREIGN KEY (old_hash) REFERENCES Points (hash),
  FOREIGN KEY (new_hash) REFERENCES Points (hash),
  FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE INDEX Edits_old_hash_new_hash
  on Edits (old_hash, new_hash);


CREATE TABLE EditRejections (
  old_hash      VARCHAR(64) CHARACTER SET ascii NOT NULL,
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  new_hash      VARCHAR(64) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  PRIMARY KEY (old_hash, new_hash, username),
  FOREIGN KEY (old_hash) REFERENCES Points (hash),
  FOREIGN KEY (new_hash) REFERENCES Points (hash),
  FOREIGN KEY (username) REFERENCES Users (username)
);


CREATE TABLE RelevanceVotes (
  conclusion_hash       VARCHAR(64) CHARACTER SET ascii NOT NULL,
  premise_hash          VARCHAR(64) CHARACTER SET ascii NOT NULL,
  username              VARCHAR(16) CHARACTER SET ascii NOT NULL,
  relevant              BOOL NOT NULL,
  supports              BOOL NOT NULL,
  create_time           TIMESTAMP NOT NULL,
  PRIMARY KEY (conclusion_hash, premise_hash, supports, username),
  FOREIGN KEY (conclusion_hash) REFERENCES Points (hash),
  FOREIGN KEY (premise_hash) REFERENCES Points (hash),
  FOREIGN KEY (username) REFERENCES Users (username)
);


CREATE VIEW RelevanceScores AS SELECT
  u.username,
  r.conclusion_hash,
  r.premise_hash,
  r.supports,
  SUM(u.username = r.username AND r.relevant) AS myupvotes,
  SUM(u.username = r.username AND NOT r.relevant) AS mydownvotes,
  SUM(r.relevant) AS upvotes,
  SUM(NOT r.relevant) AS downvotes
  FROM Users u JOIN RelevanceVotes r
  GROUP BY u.username, r.conclusion_hash, r.premise_hash, r.supports;


CREATE TABLE Sessions (
  session_key   VARCHAR(255) NOT NULL PRIMARY KEY,
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE INDEX Sessions_username
  on Sessions (username);


CREATE TABLE FeaturedPoints (
  point_hash    VARCHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  create_time   TIMESTAMP NOT NULL,
  FOREIGN KEY (point_hash) REFERENCES Points (hash)
);


CREATE TABLE PasswordResetTokens (
  token         VARCHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  FOREIGN KEY (username) REFERENCES Users (username)
);
