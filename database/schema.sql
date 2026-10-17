CREATE TABLE IF NOT EXISTS employees (
 employee VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 emoji VARCHAR(32) NOT NULL DEFAULT '🙂',
 avatar MEDIUMBLOB NULL,
 avatar_type VARCHAR(20) NULL,
 active TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS shift_types (
 code VARCHAR(2) PRIMARY KEY,
 label VARCHAR(100) NOT NULL,
 amount DECIMAL(10,2) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO shift_types(code,label,amount) VALUES
('D','กะกลางวัน',0),('E','กะ E',80),('L','กะ L',80),('N','กะกลางคืน',100),
('R','วันหยุด',0),('PH','วันหยุดสำคัญ',0),('AL','ลาพักร้อน',0),('BL','ลากิจ',0);
CREATE TABLE IF NOT EXISTS rosters (
 month CHAR(7) PRIMARY KEY,
 revision INT NOT NULL DEFAULT 1,
 published_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS shifts (
 employee VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 day DATE NOT NULL,
 code VARCHAR(2) NOT NULL,
 PRIMARY KEY(employee,day),
 INDEX day_code(day,code),
 FOREIGN KEY(employee) REFERENCES employees(employee),
 FOREIGN KEY(code) REFERENCES shift_types(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS login_limits (
 ip_hash CHAR(64) PRIMARY KEY,
 failures INT NOT NULL DEFAULT 0,
 started_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
