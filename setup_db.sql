CREATE TABLE IF NOT EXISTS public.session (
    sid varchar NOT NULL COLLATE "default",
    sess json NOT NULL,
	expire timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

CREATE TABLE IF NOT EXISTS public.user
(
    uid bigint NOT NULL,
    nickname varchar NOT NULL,
	  latestSession varchar
);

CREATE TABLE IF NOT EXISTS public.learningpath
(
    lpid bigint NOT NULL,
    title varchar,
    content json,
    owner bigint,
    lastEdit timestamp(6),
    created timestamp(6),
    CONSTRAINT learningpath_pkey PRIMARY KEY (lpid)
);

CREATE TABLE IF NOT EXISTS public.settings
(
    uid bigint NOT NULL,
    settings json,
    CONSTRAINT settings_pkey PRIMARY KEY (uid)
)
