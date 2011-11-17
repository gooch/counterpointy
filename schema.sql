/* mysql -p counterpointy < script.sql */

/* http://dev.mysql.com/doc/refman/5.0/en/create-table.html */


CREATE TABLE User (
  id SERIAL PRIMARY KEY,

  fullname VARCHAR(255) CHARACTER SET utf8 NOT NULL,

  email VARCHAR(255) NOT NULL UNIQUE,

  password VARCHAR(32) NOT NULL,

  invitedBy_id BIGINT UNSIGNED NOT NULL,
  CONSTRAINT FOREIGN KEY (invitedBy_id)
    REFERENCES User (id)
) ENGINE=InnoDB;
CREATE INDEX User_email
  on User (email);


CREATE TABLE Point (
  hash VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,

  body TEXT CHARACTER SET utf8 NOT NULL
) ENGINE=InnoDB;


CREATE TABLE PStance (
  user_id BIGINT UNSIGNED NOT NULL,
  CONSTRAINT FOREIGN KEY (user_id)
    REFERENCES User (id),

  point_hash VARCHAR(40) CHARACTER SET ascii,
  CONSTRAINT FOREIGN KEY (point_hash)
    REFERENCES Point (hash),

  PRIMARY KEY (user_id, point_hash)
) ENGINE=InnoDB;


CREATE TABLE Reason (
  hash VARCHAR(40) CHARACTER SET ascii PRIMARY KEY,

  subject_hash VARCHAR(40) CHARACTER SET ascii,
  CONSTRAINT FOREIGN KEY (subject_hash)
    REFERENCES Point (hash),

  supports BOOL,

  object_hash VARCHAR(40) CHARACTER SET ascii,
  CONSTRAINT FOREIGN KEY (object_hash)
    REFERENCES Point (hash)
) ENGINE=InnoDB;
CREATE INDEX Reason_subject_supports_object
  on Reason (subject_hash, supports, object_hash);


CREATE TABLE RStance (
  user_id BIGINT UNSIGNED NOT NULL,
  CONSTRAINT FOREIGN KEY (user_id)
    REFERENCES User (id),

  reason_hash VARCHAR(40) CHARACTER SET ascii,
  CONSTRAINT FOREIGN KEY (reason_hash)
    REFERENCES Reason (hash),

  PRIMARY KEY (user_id, reason_hash)
) ENGINE=InnoDB;

