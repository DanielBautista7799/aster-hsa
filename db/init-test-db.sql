-- Runs once, when the Postgres volume is first created.
-- A separate database for the automated tests, so `pytest` never touches
-- the demo data in the main database.
CREATE DATABASE aster_test;
