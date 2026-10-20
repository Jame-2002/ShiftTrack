CREATE TABLE IF NOT EXISTS training_state (
 id TINYINT PRIMARY KEY,
 revision INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO training_state(id,revision) VALUES(1,1);
CREATE TABLE IF NOT EXISTS training_events (
 event_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 module_id VARCHAR(100) NOT NULL,
 title VARCHAR(500) NOT NULL,
 start_date DATE NULL,
 end_date DATE NULL,
 start_time TIME NULL,
 end_time TIME NULL,
 room VARCHAR(200) NOT NULL DEFAULT '',
 revision INT NOT NULL DEFAULT 1,
 edited TINYINT NOT NULL DEFAULT 0,
 updated_at DATETIME NOT NULL,
 INDEX training_dates(start_date,end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS training_enrollments (
 event_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 employee VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 schedule_id VARCHAR(100) NOT NULL DEFAULT '',
 status VARCHAR(100) NOT NULL DEFAULT '',
 PRIMARY KEY(event_id,employee),
 INDEX training_employee(employee),
 FOREIGN KEY(event_id) REFERENCES training_events(event_id),
 FOREIGN KEY(employee) REFERENCES employees(employee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS training_audit (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 event_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 changed_at DATETIME NOT NULL,
 actor VARCHAR(20) NOT NULL DEFAULT 'owner',
 old_value MEDIUMTEXT NOT NULL,
 new_value MEDIUMTEXT NOT NULL,
 FOREIGN KEY(event_id) REFERENCES training_events(event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
