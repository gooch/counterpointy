/* mysql -p counterpointy < create_tables.sql */


CREATE TABLE User (
  user_id       SERIAL PRIMARY KEY,
  fullname      VARCHAR(255) CHARACTER SET utf8 NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(32) NOT NULL
);

CREATE INDEX User_email on User (email);


CREATE TABLE Point (
  hash          VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,
  body          TEXT CHARACTER SET utf8 NOT NULL
);


CREATE TABLE PStance (
  user_id       BIGINT UNSIGNED NOT NULL,
  point_hash    VARCHAR(40) CHARACTER SET ascii,
  stance        TINYINT,
  PRIMARY KEY (user_id, point_hash),
  FOREIGN KEY (user_id) REFERENCES User (id),
  FOREIGN KEY (point_hash) REFERENCES Point (hash)
);


CREATE TABLE Reason (
  reason_hash   VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,
  subject_hash  VARCHAR(40) CHARACTER SET ascii,
  supports      BOOL,
  object_hash   VARCHAR(40) CHARACTER SET ascii,
  FOREIGN KEY (subject_hash) REFERENCES Point (hash),
  FOREIGN KEY (object_hash) REFERENCES Point (hash)
);

CREATE INDEX Reason_subject_supports_object
  on Reason (subject_hash, supports, object_hash);


CREATE TABLE RStance (
  user_id       BIGINT UNSIGNED NOT NULL,
  reason_hash   VARCHAR(40) CHARACTER SET ascii,
  stance        TINYINT,
  PRIMARY KEY (user_id, reason_hash),
  FOREIGN KEY (user_id) REFERENCES User (user_id),
  FOREIGN KEY (reason_hash) REFERENCES Reason (reason_hash)
);

