CREATE TABLE IF NOT EXISTS locations (
    time        TIMESTAMPTZ       NOT NULL,
    lat         DOUBLE PRECISION  NOT NULL,
    lng         DOUBLE PRECISION  NOT NULL,
    device_id   TEXT             DEFAULT 'unknown'
);

-- Convert to hypertable
SELECT create_hypertable('locations', 'time', if_not_exists => TRUE);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_time ON locations (time DESC);

SELECT * FROM locations ORDER BY time DESC LIMIT 5; 