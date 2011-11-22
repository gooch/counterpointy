/* mysql -p counterpointy < create_tables.sql */


CREATE TABLE Users (
  user_id       SERIAL PRIMARY KEY,
  fullname      VARCHAR(255) CHARACTER SET utf8 NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(60) NOT NULL
);

CREATE INDEX Users_email on Users (email);


CREATE TABLE Points (
  hash          VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,
  text          TEXT CHARACTER SET utf8 NOT NULL
);


CREATE TABLE PStances (
  user_id       BIGINT UNSIGNED NOT NULL,
  point_hash    VARCHAR(40) CHARACTER SET ascii,
  stance        TINYINT,
  PRIMARY KEY (user_id, point_hash),
  FOREIGN KEY (user_id) REFERENCES Users (id),
  FOREIGN KEY (point_hash) REFERENCES Points (hash)
);


CREATE TABLE Reasons (
  reason_hash           VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,
  premise_hash          VARCHAR(40) CHARACTER SET ascii,
  conclusion_hash       VARCHAR(40) CHARACTER SET ascii,
  supports              BOOL,
  FOREIGN KEY (premise_hash) REFERENCES Points (hash),
  FOREIGN KEY (conclusion_hash) REFERENCES Points (hash)
);

CREATE INDEX Reasons_conclusion_supports
  on Reasons (conclusion_hash, supports);


CREATE TABLE RStances (
  user_id       BIGINT UNSIGNED NOT NULL,
  reason_hash   VARCHAR(40) CHARACTER SET ascii,
  stance        TINYINT,
  PRIMARY KEY (user_id, reason_hash),
  FOREIGN KEY (user_id) REFERENCES Users (user_id),
  FOREIGN KEY (reason_hash) REFERENCES Reasons (reason_hash)
);

