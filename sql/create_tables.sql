/* mysql -p counterpointy < create_tables.sql */


CREATE TABLE Users (
  user_id       SERIAL PRIMARY KEY,
  fullname      VARCHAR(255) CHARACTER SET utf8 NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(32) NOT NULL
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
  reason_hash   VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,
  subject_hash  VARCHAR(40) CHARACTER SET ascii,
  supports      BOOL,
  object_hash   VARCHAR(40) CHARACTER SET ascii,
  FOREIGN KEY (subject_hash) REFERENCES Points (hash),
  FOREIGN KEY (object_hash) REFERENCES Points (hash)
);

CREATE INDEX Reasons_subject_supports_object
  on Reasons (subject_hash, supports, object_hash);


CREATE TABLE RStances (
  user_id       BIGINT UNSIGNED NOT NULL,
  reason_hash   VARCHAR(40) CHARACTER SET ascii,
  stance        TINYINT,
  PRIMARY KEY (user_id, reason_hash),
  FOREIGN KEY (user_id) REFERENCES Users (user_id),
  FOREIGN KEY (reason_hash) REFERENCES Reasons (reason_hash)
);

