CREATE DATABASE users WITH ENCODING 'UTF8';

\c users

CREATE TABLE "user_session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);

CREATE INDEX "IDX_session_expire" ON "user_session" ("expire");

CREATE TABLE "user_learningpath" (
  "id" bigint NOT NULL,
  "owner" bigint NOT NULL
);