CREATE TABLE Users (
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  fullname      VARCHAR(255) CHARACTER SET utf8 NOT NULL,
  email         VARCHAR(255) CHARACTER SET ascii NOT NULL,
  password_hash VARCHAR(60) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL
);


CREATE TABLE Points (
  hash          VARCHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  text          TEXT CHARACTER SET utf8 NOT NULL,
  create_time   TIMESTAMP NOT NULL
);

CREATE FULLTEXT INDEX Points_text ON Points(text);
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


CREATE TABLE Relevances (
  conclusion_hash       VARCHAR(64) CHARACTER SET ascii NOT NULL,
  premise_hash          VARCHAR(64) CHARACTER SET ascii NOT NULL,
  username              VARCHAR(16) CHARACTER SET ascii NULL,
  relevant              BOOL NOT NULL,
  supports              BOOL NOT NULL,
  create_time           TIMESTAMP NOT NULL,
  PRIMARY KEY (conclusion_hash, premise_hash, username),
  FOREIGN KEY (conclusion_hash) REFERENCES Points (hash),
  FOREIGN KEY (premise_hash) REFERENCES Points (hash),
  FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE INDEX Relevances_premise ON Relevances(premise_hash);
CREATE INDEX Relevances_username ON Relevances(username);


CREATE TABLE Sessions (
  session_key   VARCHAR(255) NOT NULL PRIMARY KEY,
  username      VARCHAR(16) CHARACTER SET ascii NOT NULL,
  create_time   TIMESTAMP NOT NULL,
  FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE INDEX Sessions_username
  on Sessions (username);
