-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS locations (
    time        TIMESTAMPTZ       NOT NULL,
    lat         DOUBLE PRECISION  NOT NULL,
    lng         DOUBLE PRECISION  NOT NULL,
    device_id   TEXT             DEFAULT 'unknown'
);

CREATE TABLE IF NOT EXISTS comments (
    id          SERIAL PRIMARY KEY,
    content     TEXT NOT NULL,
    name        TEXT,
    image_url   TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Convert to hypertable
SELECT create_hypertable('locations', 'time', if_not_exists => TRUE);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_time ON locations (time DESC);

SELECT * FROM locations ORDER BY time DESC LIMIT 5; 