DROP TABLE IF EXISTS location5;

CREATE TABLE IF NOT EXISTS location5 (
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude VARCHAR(255),
    longitude VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS people (
    firstName VARCHAR(255),
    lastName VARCHAR(255)
)
